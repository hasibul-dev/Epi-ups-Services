import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertSuperAdmin } from "@/server/permissions";
import { createBackup, getBackupPayload, restoreBackup, validateBackup } from "@/server/backup";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  backupId: z.number().int().optional(),
  payload: z.string().optional(),
  mode: z.enum(["validate", "restore"]),
  confirm: z.string().optional(),
  fileName: z.string().optional(),
});

/**
 * validate: parses & checks a stored backup (backupId) or an uploaded file (payload) and returns table counts.
 * restore: requires confirm === "RESTORE". A safety backup of the current data is always taken first.
 */
export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  assertSuperAdmin(user);
  const body = schema.parse(await req.json());
  let payload: string;
  let checksum: string | undefined;
  if (body.backupId) {
    const b = await getBackupPayload(body.backupId);
    payload = b.payload;
    checksum = b.checksum;
  } else if (body.payload) payload = body.payload;
  else throw new AppError(400, "Provide a backup id or a backup file");

  const file = validateBackup(payload, checksum);
  if (body.mode === "validate") return NextResponse.json({ valid: true, counts: file.counts, createdAt: file.createdAt });

  if (body.confirm !== "RESTORE") throw new AppError(400, 'Restore not confirmed. Type "RESTORE" to proceed.');
  const safety = await createBackup("pre-restore", user.username, `pre-restore-${Date.now()}`);
  await restoreBackup(file);
  await logAudit({ action: "restore", module: "admin", details: `Restored ${body.fileName ?? "backup #" + body.backupId} by ${user.username}. Safety backup #${safety.id}`, ip: clientIp(req) });
  return NextResponse.json({ ok: true, safetyBackupId: safety.id });
});
