import { NextResponse } from "next/server";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { clients, followUps } from "@/db/schema";
import { apiHandler, AppError, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertCan } from "@/server/permissions";
import { logAudit } from "@/server/audit";
import { todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  await assertCan(user, "sales", "create");

  const body = await req.json();
  const name = String(body.name || "").trim();
  const companyName = String(body.companyName || body.company || "").trim();
  const designation = String(body.designation || body.desig || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const address = String(body.address || "").trim();
  const category = String(body.category || "Potential").trim();
  const notes = String(body.notes || "").trim();
  const nextDate = String(body.nextDate || "").trim();

  // Validate required fields
  if (!name) {
    throw new AppError(400, "Client contact person name is required", { name: "Required" });
  }
  if (!companyName) {
    throw new AppError(400, "Company name is required", { companyName: "Required" });
  }
  if (!nextDate) {
    throw new AppError(400, "First follow-up date is required", { nextDate: "Required" });
  }

  // Prevent duplicate client: check if same name AND same company already exists
  const existing = await db
    .select({ id: clients.id, name: clients.name, companyName: clients.companyName })
    .from(clients)
    .where(
      and(
        ilike(clients.name, name),
        ilike(clients.companyName, companyName)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(409, `A client record for "${name}" at "${companyName}" already exists.`);
  }

  const today = todayStr();

  // Atomically insert client and schedule first follow-up in a single transaction
  const result = await db.transaction(async (tx) => {
    const [newClient] = await tx
      .insert(clients)
      .values({
        name,
        companyName,
        contactPerson: name,
        designation: designation || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        category,
        salespersonId: null,
        notes: notes || null,
        registrationDate: today,
      })
      .returning();

    const [firstFollowUp] = await tx
      .insert(followUps)
      .values({
        clientId: newClient.id,
        type: "call",
        dueDate: nextDate,
        status: "pending",
        assignedTo: null,
        notes: notes || "First scheduled follow-up",
      })
      .returning();

    return { client: newClient, followUp: firstFollowUp };
  });

  await logAudit({
    user,
    action: "create",
    module: "sales",
    entity: "clients",
    entityId: result.client.id,
    details: `Created client: ${result.client.name} (${result.client.companyName}) and scheduled initial follow-up for ${nextDate}`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, client: result.client, followUp: result.followUp }, { status: 201 });
});
