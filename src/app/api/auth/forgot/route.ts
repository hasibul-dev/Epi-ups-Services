import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sql, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { apiHandler, clientIp } from "@/server/api";
import { sha256 } from "@/server/password";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

/**
 * Creates a one-hour reset token. No email transport is configured by default, so the reset link is written
 * to the server log and can also be issued by an administrator from User Management.
 * The response is identical whether or not the account exists (prevents account enumeration).
 */
export const POST = apiHandler(async (req: Request) => {
  const { identifier } = z.object({ identifier: z.string().trim().min(1) }).parse(await req.json());
  const id = identifier.toLowerCase();
  const [user] = await db.select().from(users).where(or(sql`lower(${users.username}) = ${id}`, sql`lower(${users.email}) = ${id}`)).limit(1);
  if (user && user.active) {
    const token = randomBytes(32).toString("hex");
    await db.insert(passwordResets).values({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) });
    const origin = process.env.APP_URL || new URL(req.url).origin;
    console.log(`[password-reset] ${user.username}: ${origin}/reset-password?token=${token}`);
    await logAudit({ user, action: "password_reset_requested", module: "auth", ip: clientIp(req) });
  }
  return NextResponse.json({ ok: true, message: "If the account exists, a reset link has been issued. Contact your administrator if you do not receive it." });
});
