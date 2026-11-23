import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { userSchema } from "@/server/user-schema";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { hashPassword, requireUser, validatePassword } from "@/server/auth";
import { assertCan } from "@/server/permissions";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  await assertCan(user, "admin", "view");
  const rows = await db
    .select({
      id: users.id, username: users.username, email: users.email, name: users.name, phone: users.phone, role: users.role,
      department: users.department, active: users.active, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
      sessionCount: sql<number>`(select count(*) from ${sessions} where ${sessions.userId} = ${users.id} and ${sessions.expiresAt} > now())::int`,
    })
    .from(users)
    .orderBy(desc(users.active), users.name);
  return NextResponse.json({ rows });
});

export const POST = apiHandler(async (req: Request) => {
  const actor = await requireUser();
  await assertCan(actor, "admin", "create");
  const body = await req.json();
  const data = userSchema.extend({ password: z.string() }).parse(body);
  if (data.role === "super_admin" && actor.role !== "super_admin") throw new AppError(403, "Only a Super Administrator can create another Super Administrator");
  validatePassword(data.password);
  const { password, ...rest } = data;
  const [row] = await db.insert(users).values({ ...rest, phone: rest.phone || null, passwordHash: await hashPassword(password) }).returning({ id: users.id });
  await logAudit({ user: actor, action: "create", module: "admin", entity: "users", entityId: row.id, details: `Created user ${data.username} (${data.role}/${data.department})`, ip: clientIp(req) });
  return NextResponse.json({ id: row.id }, { status: 201 });
});

