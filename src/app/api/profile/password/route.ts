import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { hashPassword, requireUser, validatePassword, verifyPassword } from "@/server/auth";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (req: Request) => {
  const actor = await requireUser();
  const { current, next } = z.object({ current: z.string(), next: z.string() }).parse(await req.json());
  const [u] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!u || !(await verifyPassword(current, u.passwordHash))) throw new AppError(400, "Current password is incorrect");
  validatePassword(next);
  await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, actor.id));
  await db.delete(sessions).where(and(eq(sessions.userId, actor.id), ne(sessions.id, actor.sessionId)));
  await logAudit({ user: actor, action: "password_change", module: "auth", ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});
