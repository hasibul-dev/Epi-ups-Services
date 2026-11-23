import { NextResponse } from "next/server";
import { apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertSuperAdmin } from "@/server/permissions";
import { createBackup, listBackups } from "@/server/backup";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  assertSuperAdmin(user);
  return NextResponse.json({ rows: await listBackups() });
});

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  assertSuperAdmin(user);
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const row = await createBackup("manual", user.username, body.name?.trim() || undefined);
  await logAudit({ user, action: "backup_create", module: "admin", entity: "backups", entityId: row.id, details: row.name, ip: clientIp(req) });
  return NextResponse.json({ row }, { status: 201 });
});
