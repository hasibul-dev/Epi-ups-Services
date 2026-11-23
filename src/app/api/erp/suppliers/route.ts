import { NextResponse } from "next/server";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();

  const conds = [];
  if (q) {
    conds.push(or(ilike(S.suppliers.name, `%${q}%`), ilike(S.suppliers.companyName, `%${q}%`), ilike(S.suppliers.phone, `%${q}%`), ilike(S.suppliers.binNumber, `%${q}%`)));
  }

  const suppliersList = await db
    .select()
    .from(S.suppliers)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(S.suppliers.id))
    .limit(500);

  // Compute total purchases, paid, and outstanding payable per supplier
  const enriched = await Promise.all(
    suppliersList.map(async (s) => {
      const [purSum] = await db
        .select({ total: sql<number>`coalesce(sum(${S.purchases.amount}), 0)::float` })
        .from(S.purchases)
        .where(and(or(eq(S.purchases.supplierId, s.id), ilike(S.purchases.supplier, s.name)), ne(S.purchases.status, "cancelled")));

      const [paySum] = await db
        .select({ total: sql<number>`coalesce(sum(${S.payments.amount}), 0)::float` })
        .from(S.payments)
        .where(and(or(eq(S.payments.supplierId, s.id), ilike(S.payments.party, s.name)), eq(S.payments.direction, "paid")));

      const totalPurchases = r2(Number(purSum?.total || 0));
      const totalPaid = r2(Number(paySum?.total || 0));
      const opening = r2(Number(s.openingBalance || 0));
      const payableBalance = r2(opening + totalPurchases - totalPaid);

      return {
        ...s,
        totalPurchases,
        totalPaid,
        payableBalance,
      };
    })
  );

  return NextResponse.json({ suppliers: enriched });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();

  const name = body.name?.trim();
  if (!name) throw new AppError(400, "Supplier name is required");

  const [existing] = await db.select({ id: S.suppliers.id }).from(S.suppliers).where(ilike(S.suppliers.name, name)).limit(1);
  if (existing) throw new AppError(400, `Supplier "${name}" already exists`);

  const opening = Number(body.openingBalance || 0);

  const [supplier] = await db
    .insert(S.suppliers)
    .values({
      name,
      companyName: body.companyName?.trim() || name,
      contactPerson: body.contactPerson?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      binNumber: body.binNumber?.trim() || null,
      openingBalance: opening,
      paymentTerms: body.paymentTerms?.trim() || "Net 30",
      payableBalance: opening,
      status: "active",
      notes: body.notes?.trim() || null,
    })
    .returning();

  return NextResponse.json({ ok: true, supplier });
});
