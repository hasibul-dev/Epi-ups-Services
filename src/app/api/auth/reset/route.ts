import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { hashPassword, sha256, validatePassword } from "@/server/auth";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (req: Request) => {
  const { token, password } = z.object({ token: z.string().min(10), password: z.string() }).parse(await req.json());
  validatePassword(password);
  const [pr] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .limit(1);
  if (!pr) throw new AppError(400, "This reset link is invalid or has expired");
  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, pr.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, pr.id));
  await db.delete(sessions).where(eq(sessions.userId, pr.userId));
  const [u] = await db.select().from(users).where(eq(users.id, pr.userId));
  await logAudit({ user: u, action: "password_reset", module: "auth", ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});
