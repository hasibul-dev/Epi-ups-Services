import { NextResponse } from "next/server";
import { AppError, apiHandler } from "@/server/api";
import { createBackup } from "@/server/backup";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** Scheduled backup endpoint (e.g. Vercel Cron). Requires `Authorization: Bearer $CRON_SECRET`. */
export const GET = apiHandler(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new AppError(401, "Unauthorized");
  const row = await createBackup("auto", "cron");
  await logAudit({ action: "backup_auto", module: "admin", entity: "backups", entityId: row.id, details: row.name });
  return NextResponse.json({ ok: true, id: row.id });
});
