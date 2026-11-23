import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { hashPassword, requireUser, sha256, validatePassword, type SessionUser } from "@/server/auth";
import { assertCan } from "@/server/permissions";
import { logAudit } from "@/server/audit";
import { userSchema } from "@/server/user-schema";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function target(actor: SessionUser, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new AppError(400, "Invalid id");
  const [t] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!t) throw new AppError(404, "User not found");
  if (t.role === "super_admin" && actor.role !== "super_admin") throw new AppError(403, "Only a Super Administrator can modify a Super Administrator");
  return t;
}

async function otherActiveSuperAdmins(excludeId: number) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, "super_admin"), eq(users.active, true), ne(users.id, excludeId)));
  return r.n;
}

export const PUT = apiHandler(async (req: Request, ctx: Ctx) => {
  const actor = await requireUser();
  await assertCan(actor, "admin", "edit");
  const t = await target(actor, ctx);
  const data = userSchema.parse(await req.json());
  if (data.role === "super_admin" && actor.role !== "super_admin") throw new AppError(403, "Only a Super Administrator can assign that role");
  if (t.id === actor.id && (!data.active || data.role !== actor.role)) throw new AppError(400, "You cannot deactivate or change the role of your own account");
  if (t.role === "super_admin" && (!data.active || data.role !== "super_admin") && (await otherActiveSuperAdmins(t.id)) === 0)
    throw new AppError(400, "At least one active Super Administrator is required");
  await db.update(users).set({ ...data, phone: data.phone || null, updatedAt: new Date() }).where(eq(users.id, t.id));
  if (!data.active) await db.delete(sessions).where(eq(sessions.userId, t.id));
  await logAudit({ user: actor, action: data.active === t.active ? "update" : data.active ? "activate" : "deactivate", module: "admin", entity: "users", entityId: t.id, details: `Updated user ${t.username}`, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset_password"), password: z.string() }),
  z.object({ action: z.literal("reset_link") }),
  z.object({ action: z.literal("revoke_sessions") }),
]);

export const POST = apiHandler(async (req: Request, ctx: Ctx) => {
  const actor = await requireUser();
  await assertCan(actor, "admin", "edit");
  const t = await target(actor, ctx);
  const body = actionSchema.parse(await req.json());
  const ip = clientIp(req);
  if (body.action === "reset_password") {
    validatePassword(body.password);
    await db.update(users).set({ passwordHash: await hashPassword(body.password), updatedAt: new Date() }).where(eq(users.id, t.id));
    await db.delete(sessions).where(eq(sessions.userId, t.id));
    await logAudit({ user: actor, action: "password_set", module: "admin", entity: "users", entityId: t.id, details: `Password set for ${t.username}`, ip });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reset_link") {
    const token = randomBytes(32).toString("hex");
    await db.insert(passwordResets).values({ userId: t.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) });
    await logAudit({ user: actor, action: "password_reset_link", module: "admin", entity: "users", entityId: t.id, details: `Reset link issued for ${t.username}`, ip });
    const origin = process.env.APP_URL || new URL(req.url).origin;
    return NextResponse.json({ link: `${origin}/reset-password?token=${token}` });
  }
  const del = await db.delete(sessions).where(eq(sessions.userId, t.id)).returning({ id: sessions.id });
  await logAudit({ user: actor, action: "sessions_revoked", module: "admin", entity: "users", entityId: t.id, details: `${del.length} session(s) revoked for ${t.username}`, ip });
  return NextResponse.json({ revoked: del.length });
});

export const DELETE = apiHandler(async (req: Request, ctx: Ctx) => {
  const actor = await requireUser();
  await assertCan(actor, "admin", "delete");
  const t = await target(actor, ctx);
  if (t.id === actor.id) throw new AppError(400, "You cannot delete your own account");
  if (t.role === "super_admin" && (await otherActiveSuperAdmins(t.id)) === 0) throw new AppError(400, "At least one active Super Administrator is required");
  await db.delete(users).where(eq(users.id, t.id));
  await logAudit({ user: actor, action: "delete", module: "admin", entity: "users", entityId: t.id, details: `Deleted user ${t.username}`, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});
