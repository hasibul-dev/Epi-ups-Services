import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { BACKUP_TABLE_NAMES } from "@/server/backup";
import { apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertSuperAdmin } from "@/server/permissions";
import { seedDemo } from "@/server/demo-seed";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** GET → row counts per table (Database Management). */
export const GET = apiHandler(async () => {
  const user = await requireUser();
  assertSuperAdmin(user);
  const counts: Record<string, number> = {};
  for (const t of BACKUP_TABLE_NAMES) {
    const r = await db.execute(sql.raw(`select count(*)::int as n from "${t}"`));
    counts[t] = Number((r.rows[0] as { n: number }).n);
  }
  const size = await db.execute(sql`select pg_database_size(current_database())::bigint as s`);
  return NextResponse.json({ counts, sizeBytes: Number((size.rows[0] as { s: string }).s) });
});

/** POST → optional demo seed. Only loads into an empty system. */
export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  assertSuperAdmin(user);
  z.object({ confirm: z.literal(true) }).parse(await req.json());
  const result = await seedDemo();
  await logAudit({ user, action: "demo_seed", module: "admin", details: result.message, ip: clientIp(req) });
  return NextResponse.json(result);
});
