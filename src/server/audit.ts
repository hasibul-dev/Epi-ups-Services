import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export interface AuditInput {
  user?: { id: number; username: string } | null;
  action: string;
  module?: string;
  entity?: string;
  entityId?: string | number;
  details?: string;
  ip?: string;
}

export async function logAudit(input: AuditInput) {
  try {
    await db.insert(auditLogs).values({
      userId: input.user?.id ?? null,
      username: input.user?.username ?? null,
      action: input.action,
      module: input.module ?? null,
      entity: input.entity ?? null,
      entityId: input.entityId != null ? String(input.entityId) : null,
      details: input.details?.slice(0, 1000) ?? null,
      ip: input.ip ?? null,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
