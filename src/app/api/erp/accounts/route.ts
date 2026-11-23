import { NextResponse } from "next/server";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const type = url.searchParams.get("type");

  let query = db.select().from(S.accounts);
  const conds = [];
  if (type) conds.push(eq(S.accounts.type, type));
  if (q) conds.push(or(ilike(S.accounts.code, `%${q}%`), ilike(S.accounts.name, `%${q}%`), ilike(S.accounts.category, `%${q}%`)));

  const rows = await db
    .select()
    .from(S.accounts)
    .where(conds.length > 0 ? (conds.length === 1 ? conds[0] : or(...conds)) : undefined)
    .orderBy(asc(S.accounts.code));

  return NextResponse.json({ accounts: rows });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();

  if (!body.code?.trim() || !body.name?.trim() || !body.type?.trim()) {
    throw new AppError(400, "Account Code, Name, and Type are required");
  }

  const [existing] = await db.select().from(S.accounts).where(eq(S.accounts.code, body.code.trim())).limit(1);
  if (existing) throw new AppError(400, `Account Code "${body.code}" already exists`);

  const opening = Number(body.openingBalance || 0);

  const [acc] = await db
    .insert(S.accounts)
    .values({
      code: body.code.trim(),
      name: body.name.trim(),
      type: body.type.trim(),
      category: body.category?.trim() || "General",
      parentId: body.parentId ? Number(body.parentId) : null,
      openingBalance: opening,
      balance: opening,
      bankAccountNumber: body.bankAccountNumber?.trim() || null,
      bankBranch: body.bankBranch?.trim() || null,
      notes: body.notes?.trim() || null,
      isSystem: false,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ ok: true, account: acc });
});

export const PUT = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();
  const id = Number(body.id);
  if (!id) throw new AppError(400, "Account ID is required");

  const [existing] = await db.select().from(S.accounts).where(eq(S.accounts.id, id)).limit(1);
  if (!existing) throw new AppError(404, "Account not found");

  const update: any = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.category !== undefined) update.category = body.category.trim();
  if (body.bankAccountNumber !== undefined) update.bankAccountNumber = body.bankAccountNumber?.trim() || null;
  if (body.bankBranch !== undefined) update.bankBranch = body.bankBranch?.trim() || null;
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null;
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

  const [updated] = await db.update(S.accounts).set(update).where(eq(S.accounts.id, id)).returning();
  return NextResponse.json({ ok: true, account: updated });
});
