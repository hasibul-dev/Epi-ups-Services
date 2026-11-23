import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, followUps } from "@/db/schema";
import { apiHandler, AppError, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertCan } from "@/server/permissions";
import { logAudit } from "@/server/audit";
import { addDays, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

const INTERVALS: Record<string, number> = {
  Potential: 3,
  "Potential (+3d)": 3,
  "No Potential": 10,
  "No Potential (+10d)": 10,
  Quotation: 7,
  "Quotation (+7d)": 7,
  Sale: 30,
  "Sale (+30d)": 30,
};

function cleanCategory(res: string): string {
  if (res.startsWith("Potential")) return "Potential";
  if (res.startsWith("No Potential")) return "No Potential";
  if (res.startsWith("Quotation")) return "Quotation";
  if (res.startsWith("Sale")) return "Sale";
  return res;
}

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  await assertCan(user, "sales", "edit");

  const body = await req.json();
  const followUpId = Number(body.followUpId || body.id);
  const result = String(body.result || "").trim();
  const method = String(body.method || "").trim();
  const notes = String(body.notes || "").trim();
  let nextDate = String(body.nextDate || "").trim();

  if (!followUpId) {
    throw new AppError(400, "Follow-up ID is required");
  }
  if (!result || result === "Select Result") {
    throw new AppError(400, "Please select Next Result");
  }
  if (!method || method === "Select Method") {
    throw new AppError(400, "Please select Follow-up Method");
  }

  // Calculate next date if not explicitly specified
  const today = todayStr();
  if (!nextDate) {
    const days = INTERVALS[result] ?? 3;
    nextDate = addDays(today, days);
  }

  // Find existing follow-up
  const [existing] = await db
    .select({
      id: followUps.id,
      clientId: followUps.clientId,
      status: followUps.status,
      notes: followUps.notes,
    })
    .from(followUps)
    .where(eq(followUps.id, followUpId))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Follow-up record not found");
  }

  const clientId = existing.clientId;

  // Find client to update
  const [clientRecord] = await db
    .select({ id: clients.id, name: clients.name, companyName: clients.companyName, category: clients.category })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!clientRecord) {
    throw new AppError(404, "Associated client not found");
  }

  // Map method to follow-up type
  const methodLower = method.toLowerCase();
  const followUpType = methodLower.includes("meet") ? "meeting" : methodLower.includes("mail") ? "email" : methodLower.includes("visit") ? "visit" : methodLower.includes("whatsapp") ? "whatsapp" : "call";

  // Atomically update current follow-up, update client category & notes, and insert next follow-up
  const transactionResult = await db.transaction(async (tx) => {
    // 1. Mark existing follow-up as done
    const [completed] = await tx
      .update(followUps)
      .set({
        status: "done",
        result,
        method,
        notes: notes || existing.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, followUpId))
      .returning();

    // 2. Update client's category and notes
    const clientUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (result !== "General") {
      clientUpdates.category = cleanCategory(result);
    }
    if (notes) {
      clientUpdates.notes = notes;
    }
    await tx.update(clients).set(clientUpdates).where(eq(clients.id, clientId));

    // 3. Avoid duplicate follow-up: check if pending follow-up already exists for this client on the same date
    const [alreadyPending] = await tx
      .select({ id: followUps.id })
      .from(followUps)
      .where(
        and(
          eq(followUps.clientId, clientId),
          eq(followUps.dueDate, nextDate),
          eq(followUps.status, "pending")
        )
      )
      .limit(1);

    let nextFollowUp = alreadyPending;
    if (!alreadyPending) {
      const [created] = await tx
        .insert(followUps)
        .values({
          clientId,
          type: followUpType,
          dueDate: nextDate,
          status: "pending",
          method,
          notes: notes || `Follow-up after ${result}`,
          assignedTo: null,
        })
        .returning();
      nextFollowUp = created;
    }

    return { completed, nextFollowUp };
  });

  await logAudit({
    user,
    action: "edit",
    module: "sales",
    entity: "follow_ups",
    entityId: followUpId,
    details: `Completed follow-up for client ${clientRecord.name} (Result: ${result}, Method: ${method}) and scheduled next follow-up for ${nextDate}`,
    ip: clientIp(req),
  });

  return NextResponse.json({
    ok: true,
    completed: transactionResult.completed,
    nextFollowUp: transactionResult.nextFollowUp,
    nextDate,
  });
});
