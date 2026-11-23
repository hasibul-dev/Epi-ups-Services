import { NextResponse } from "next/server";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { COOKIE_NAME, createSession, throttleCheck, throttleClear, throttleFail, verifyPassword } from "@/server/auth";
import { ensureBootstrap } from "@/server/bootstrap";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ identifier: z.string().trim().min(1, "Username or email is required"), password: z.string().min(1, "Password is required") });

export const POST = apiHandler(async (req: Request) => {
  await ensureBootstrap();
  const { identifier, password } = schema.parse(await req.json());
  const ip = clientIp(req);
  const key = `${identifier.toLowerCase()}|${ip}`;
  throttleCheck(key);

  const id = identifier.toLowerCase();
  const [user] = await db.select().from(users).where(or(sql`lower(${users.username}) = ${id}`, sql`lower(${users.email}) = ${id}`)).limit(1);
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    throttleFail(key);
    await logAudit({ action: "login_failed", module: "auth", details: `Failed login for "${identifier}"`, ip });
    throw new AppError(401, "Invalid username or password");
  }
  if (!user.active) {
    await logAudit({ user, action: "login_blocked", module: "auth", details: "Deactivated account attempted login", ip });
    throw new AppError(403, "This account has been deactivated. Please contact an administrator.");
  }
  throttleClear(key);
  const { token, expiresAt } = await createSession(user.id, ip, req.headers.get("user-agent") ?? "");
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAudit({ user, action: "login", module: "auth", ip });

  const res = NextResponse.json({ ok: true });
  const secure = req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure, path: "/", expires: expiresAt });
  return res;
});
