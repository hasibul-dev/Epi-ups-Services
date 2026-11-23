import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureBootstrap } from "@/server/bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureBootstrap();
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[health]", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
