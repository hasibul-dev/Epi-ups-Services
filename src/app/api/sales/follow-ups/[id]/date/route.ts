import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { followUps } from "@/db/schema";
import { apiHandler, AppError, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertCan } from "@/server/permissions";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const PATCH = apiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  await assertCan(user, "sales", "edit");

  const { id } = await params;
  const followUpId = Number(id);
  if (!followUpId) {
    throw new AppError(400, "Invalid follow-up ID");
  }

  const body = await req.json();
  const dueDate = String(body.dueDate || "").trim();
  if (!dueDate) {
    throw new AppError(400, "Due date is required");
  }

  const [updated] = await db
    .update(followUps)
    .set({
      dueDate,
      updatedAt: new Date(),
    })
    .where(eq(followUps.id, followUpId))
    .returning();

  if (!updated) {
    throw new AppError(404, "Follow-up record not found");
  }

  await logAudit({
    user,
    action: "edit",
    module: "sales",
    entity: "follow_ups",
    entityId: followUpId,
    details: `Updated follow-up due date to ${dueDate}`,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true, followUp: updated });
});
