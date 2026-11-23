import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { createPayment } from "@/server/accounting";

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const direction = url.searchParams.get("direction"); // received | paid
  const q = url.searchParams.get("q")?.trim();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conds = [];
  if (direction) conds.push(eq(S.payments.direction, direction));
  if (from) conds.push(gte(S.payments.paymentDate, from));
  if (to) conds.push(lte(S.payments.paymentDate, to));
  if (q) {
    conds.push(or(ilike(S.payments.paymentNo, `%${q}%`), ilike(S.payments.party, `%${q}%`), ilike(S.payments.reference, `%${q}%`), ilike(S.payments.notes, `%${q}%`)));
  }

  const rows = await db
    .select({
      id: S.payments.id,
      paymentNo: S.payments.paymentNo,
      direction: S.payments.direction,
      clientId: S.payments.clientId,
      clientName: S.clients.name,
      supplierId: S.payments.supplierId,
      invoiceId: S.payments.invoiceId,
      purchaseId: S.payments.purchaseId,
      party: S.payments.party,
      category: S.payments.category,
      paymentDate: S.payments.paymentDate,
      amount: S.payments.amount,
      method: S.payments.method,
      reference: S.payments.reference,
      notes: S.payments.notes,
      createdAt: S.payments.createdAt,
    })
    .from(S.payments)
    .leftJoin(S.clients, eq(S.clients.id, S.payments.clientId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(S.payments.paymentDate), desc(S.payments.id))
    .limit(1000);

  return NextResponse.json({ payments: rows });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();

  const payment = await createPayment({
    direction: body.direction,
    clientId: body.clientId ? Number(body.clientId) : undefined,
    supplierId: body.supplierId ? Number(body.supplierId) : undefined,
    invoiceId: body.invoiceId ? Number(body.invoiceId) : undefined,
    purchaseId: body.purchaseId ? Number(body.purchaseId) : undefined,
    party: body.party,
    category: body.category,
    amount: Number(body.amount || 0),
    paymentDate: body.paymentDate,
    method: body.method || "bank",
    reference: body.reference,
    notes: body.notes,
  });

  return NextResponse.json({ ok: true, payment });
});
