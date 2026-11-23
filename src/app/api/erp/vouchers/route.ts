import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { createVoucher } from "@/server/accounting";

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conds = [];
  if (type) conds.push(eq(S.vouchers.voucherType, type));
  if (status) conds.push(eq(S.vouchers.status, status));
  if (from) conds.push(gte(S.vouchers.date, from));
  if (to) conds.push(lte(S.vouchers.date, to));
  if (q) {
    conds.push(or(ilike(S.vouchers.voucherNo, `%${q}%`), ilike(S.vouchers.reference, `%${q}%`), ilike(S.vouchers.description, `%${q}%`)));
  }

  const rows = await db
    .select({
      id: S.vouchers.id,
      voucherNo: S.vouchers.voucherNo,
      voucherType: S.vouchers.voucherType,
      date: S.vouchers.date,
      reference: S.vouchers.reference,
      description: S.vouchers.description,
      totalAmount: S.vouchers.totalAmount,
      status: S.vouchers.status,
      lines: S.vouchers.lines,
      createdAt: S.vouchers.createdAt,
      createdByName: S.users.name,
    })
    .from(S.vouchers)
    .leftJoin(S.users, eq(S.users.id, S.vouchers.createdBy))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(S.vouchers.date), desc(S.vouchers.id))
    .limit(500);

  return NextResponse.json({ vouchers: rows });
});

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();

  const voucher = await createVoucher({
    voucherType: body.voucherType || body.type || "journal",
    date: body.date,
    reference: body.reference,
    description: body.description,
    lines: body.lines,
    status: body.status || "posted",
    userId: user.id,
  });

  return NextResponse.json({ ok: true, voucher });
});
