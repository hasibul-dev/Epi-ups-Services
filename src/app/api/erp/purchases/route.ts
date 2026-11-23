import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { createPurchaseBill } from "@/server/accounting";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const supplierId = url.searchParams.get("supplierId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conds = [];
  if (supplierId) conds.push(eq(S.purchases.supplierId, Number(supplierId)));
  if (from) conds.push(gte(S.purchases.purchaseDate, from));
  if (to) conds.push(lte(S.purchases.purchaseDate, to));
  if (q) {
    conds.push(or(ilike(S.purchases.purchaseNo, `%${q}%`), ilike(S.purchases.supplier, `%${q}%`), ilike(S.purchases.billNo, `%${q}%`)));
  }

  const rows = await db
    .select({
      id: S.purchases.id,
      purchaseNo: S.purchases.purchaseNo,
      supplier: S.purchases.supplier,
      supplierId: S.purchases.supplierId,
      purchaseDate: S.purchases.purchaseDate,
      dueDate: S.purchases.dueDate,
      subtotal: S.purchases.subtotal,
      discount: S.purchases.discount,
      tax: S.purchases.tax,
      amount: S.purchases.amount,
      paidAmount: S.purchases.paidAmount,
      billNo: S.purchases.billNo,
      items: S.purchases.items,
      status: S.purchases.status,
      notes: S.purchases.notes,
      createdAt: S.purchases.createdAt,
    })
    .from(S.purchases)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(S.purchases.purchaseDate), desc(S.purchases.id))
    .limit(1000);

  const purchases = rows.map((r) => {
    const paid = r2(Number(r.paidAmount || 0));
    const total = r2(Number(r.amount || 0));
    const due = Math.max(0, r2(total - paid));
    let paymentStatus = "unpaid";
    if (paid >= total - 0.005 && total > 0) paymentStatus = "paid";
    else if (paid > 0) paymentStatus = "partial";

    return {
      ...r,
      paidAmount: paid,
      dueAmount: due,
      paymentStatus,
    };
  });

  return NextResponse.json({ purchases });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();

  if (!body.supplierName?.trim()) throw new AppError(400, "Supplier Name is required");
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError(400, "At least one item is required");
  }

  const purchase = await createPurchaseBill({
    supplierId: body.supplierId ? Number(body.supplierId) : undefined,
    supplierName: body.supplierName.trim(),
    purchaseDate: body.purchaseDate,
    dueDate: body.dueDate,
    items: body.items,
    subtotal: Number(body.subtotal || 0),
    discount: Number(body.discount || 0),
    tax: Number(body.tax || 0),
    amount: Number(body.amount || 0),
    billNo: body.billNo,
    notes: body.notes,
    status: body.status || "approved",
  });

  return NextResponse.json({ ok: true, purchase });
});
