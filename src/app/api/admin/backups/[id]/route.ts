import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertSuperAdmin } from "@/server/permissions";
import { getBackupPayload, validateBackup } from "@/server/backup";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  assertSuperAdmin(user);
  const b = await getBackupPayload(Number((await ctx.params).id));
  const url = new URL(req.url);
  if (url.searchParams.get("validate") === "1") {
    const file = validateBackup(b.payload, b.checksum);
    return NextResponse.json({ valid: true, counts: file.counts, createdAt: file.createdAt });
  }
  await logAudit({ user, action: "backup_export", module: "admin", entity: "backups", entityId: b.id, details: b.name, ip: clientIp(req) });
  return new Response(b.payload, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${b.name}.json"` } });
});

export const DELETE = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  assertSuperAdmin(user);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new AppError(400, "Invalid id");
  await db.delete(backups).where(eq(backups.id, id));
  await logAudit({ user, action: "backup_delete", module: "admin", entity: "backups", entityId: id, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});
