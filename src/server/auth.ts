import { randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import type { RoleCode } from "@/lib/constants";
import { AppError } from "./api";
import { hashPassword, sha256, verifyPassword } from "./password";

export { hashPassword, sha256, verifyPassword };

export const COOKIE_NAME = "epi_session";
const SESSION_DAYS = 7;

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: RoleCode;
  department: string;
  sessionId: string;
}

export function validatePassword(pw: string) {
  if (pw.length < 8) throw new AppError(400, "Password must be at least 8 characters long");
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw new AppError(400, "Password must contain letters and numbers");
}

export async function createSession(userId: number, ip: string, userAgent: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ id: sha256(token), userId, ip, userAgent: userAgent.slice(0, 300), expiresAt });
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return { token, expiresAt };
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const id = sha256(token);
  const [row] = await db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.u.active) return null;
  if (Date.now() - row.s.lastSeenAt.getTime() > 5 * 60_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }
  return {
    id: row.u.id,
    username: row.u.username,
    name: row.u.name,
    email: row.u.email,
    role: row.u.role as RoleCode,
    department: row.u.department,
    sessionId: id,
  };
});

export async function requireUserPage(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError(401, "Authentication required");
  return u;
}

export async function destroyCurrentSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

/* Simple in-memory login throttling (per username + ip). */
const attempts = new Map<string, { n: number; until: number }>();
export function throttleCheck(key: string) {
  const a = attempts.get(key);
  if (a && a.until > Date.now() && a.n >= 5) throw new AppError(429, "Too many failed attempts. Please try again in a few minutes.");
}
export function throttleFail(key: string) {
  const a = attempts.get(key);
  const n = a && a.until > Date.now() ? a.n + 1 : 1;
  attempts.set(key, { n, until: Date.now() + 10 * 60_000 });
}
export function throttleClear(key: string) {
  attempts.delete(key);
}
