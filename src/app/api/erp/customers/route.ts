import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();

  const conds = [];
  if (q) {
    conds.push(or(ilike(S.clients.name, `%${q}%`), ilike(S.clients.companyName, `%${q}%`), ilike(S.clients.phone, `%${q}%`), ilike(S.clients.email, `%${q}%`)));
  }

  const clientList = await db
    .select({
      id: S.clients.id,
      name: S.clients.name,
      companyName: S.clients.companyName,
      contactPerson: S.clients.contactPerson,
      phone: S.clients.phone,
      email: S.clients.email,
      address: S.clients.address,
      category: S.clients.category,
      creditLimit: S.clients.creditLimit,
      paymentTerms: S.clients.paymentTerms,
      openingBalance: S.clients.openingBalance,
      registrationDate: S.clients.registrationDate,
    })
    .from(S.clients)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(S.clients.id))
    .limit(1000);

  // Calculate invoiced, received and outstanding balance per customer
  const enriched = await Promise.all(
    clientList.map(async (c) => {
      const [invSum] = await db
        .select({ total: sql<number>`coalesce(sum(${S.invoices.total}), 0)::float` })
        .from(S.invoices)
        .where(and(eq(S.invoices.clientId, c.id), eq(S.invoices.status, "issued")));

      const [paySum] = await db
        .select({ total: sql<number>`coalesce(sum(${S.payments.amount}), 0)::float` })
        .from(S.payments)
        .where(and(eq(S.payments.clientId, c.id), eq(S.payments.direction, "received")));

      const invoiced = r2(Number(invSum?.total || 0));
      const received = r2(Number(paySum?.total || 0));
      const opening = r2(Number(c.openingBalance || 0));
      const balance = r2(opening + invoiced - received);

      return {
        ...c,
        invoiced,
        received,
        balance,
      };
    })
  );

  return NextResponse.json({ customers: enriched });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();
  const today = await getToday();

  const name = body.name?.trim();
  if (!name) throw new AppError(400, "Customer / Client name is required");

  // Prevent duplicate customer record
  const [existing] = await db
    .select({ id: S.clients.id })
    .from(S.clients)
    .where(ilike(S.clients.name, name))
    .limit(1);

  if (existing) {
    throw new AppError(400, `A customer with name "${name}" already exists`);
  }

  const [created] = await db
    .insert(S.clients)
    .values({
      name,
      companyName: body.companyName?.trim() || name,
      contactPerson: body.contactPerson?.trim() || name,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address?.trim() || null,
      category: body.category?.trim() || "Potential",
      creditLimit: Number(body.creditLimit || 0),
      paymentTerms: body.paymentTerms?.trim() || "Net 30",
      openingBalance: Number(body.openingBalance || 0),
      registrationDate: today,
    })
    .returning();

  return NextResponse.json({ ok: true, customer: created });
});
