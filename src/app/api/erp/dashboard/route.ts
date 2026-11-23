import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const today = await getToday();

  const from = url.searchParams.get("from") || `${today.slice(0, 4)}-01-01`;
  const to = url.searchParams.get("to") || today;

  // 1. Revenue & Expense from ledger entries
  const [revRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.credit} - ${S.ledgerEntries.debit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "4%"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)));

  const [expRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "5%"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)));

  const revenue = r2(Number(revRow?.s || 0));
  const expenses = r2(Number(expRow?.s || 0));
  const netProfit = r2(revenue - expenses);

  // 2. Cash & Bank balances (cumulative to date)
  const [cashRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "%1011%"), lte(S.ledgerEntries.entryDate, to)));

  const [bankRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(or(ilike(S.ledgerEntries.account, "%1012%"), ilike(S.ledgerEntries.account, "%1013%")), lte(S.ledgerEntries.entryDate, to)));

  // 3. Receivables & Payables
  const [arRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "%1020%"), lte(S.ledgerEntries.entryDate, to)));

  const [apRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.credit} - ${S.ledgerEntries.debit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "%2010%"), lte(S.ledgerEntries.entryDate, to)));

  const cashBalance = r2(Number(cashRow?.s || 0));
  const bankBalance = r2(Number(bankRow?.s || 0));
  const accountsReceivable = r2(Number(arRow?.s || 0));
  const accountsPayable = r2(Number(apRow?.s || 0));

  // 4. Monthly Trend (last 6 months)
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1 - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const firstMonthDate = `${months[0]}-01`;

  const monthlyRev = await db
    .select({
      m: sql<string>`to_char(${S.ledgerEntries.entryDate},'YYYY-MM')`,
      s: sql<number>`sum(${S.ledgerEntries.credit} - ${S.ledgerEntries.debit})::float`,
    })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "4%"), gte(S.ledgerEntries.entryDate, firstMonthDate)))
    .groupBy(sql`1`);

  const monthlyExp = await db
    .select({
      m: sql<string>`to_char(${S.ledgerEntries.entryDate},'YYYY-MM')`,
      s: sql<number>`sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit})::float`,
    })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "5%"), gte(S.ledgerEntries.entryDate, firstMonthDate)))
    .groupBy(sql`1`);

  const revMap = new Map(monthlyRev.map((r) => [r.m, Number(r.s || 0)]));
  const expMap = new Map(monthlyExp.map((r) => [r.m, Number(r.s || 0)]));

  const trend = months.map((m) => ({
    month: m,
    revenue: r2(revMap.get(m) || 0),
    expenses: r2(expMap.get(m) || 0),
    profit: r2((revMap.get(m) || 0) - (expMap.get(m) || 0)),
  }));

  // 5. Outstanding Customer Invoices
  const outstandingInvoices = await db
    .select({
      id: S.invoices.id,
      invoiceNo: S.invoices.invoiceNo,
      clientName: S.clients.name,
      issueDate: S.invoices.issueDate,
      dueDate: S.invoices.dueDate,
      total: S.invoices.total,
      paidAmount: S.invoices.paidAmount,
      dueAmount: sql<number>`(${S.invoices.total} - coalesce(${S.invoices.paidAmount}, 0))::float`,
      status: S.invoices.status,
    })
    .from(S.invoices)
    .innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId))
    .where(and(eq(S.invoices.status, "issued"), sql`(${S.invoices.total} - coalesce(${S.invoices.paidAmount}, 0)) > 0.01`))
    .orderBy(desc(S.invoices.dueDate))
    .limit(8);

  // 6. Outstanding Supplier Purchases
  const outstandingPurchases = await db
    .select({
      id: S.purchases.id,
      purchaseNo: S.purchases.purchaseNo,
      supplier: S.purchases.supplier,
      purchaseDate: S.purchases.purchaseDate,
      dueDate: S.purchases.dueDate,
      amount: S.purchases.amount,
      paidAmount: S.purchases.paidAmount,
      dueAmount: sql<number>`(${S.purchases.amount} - coalesce(${S.purchases.paidAmount}, 0))::float`,
      status: S.purchases.status,
    })
    .from(S.purchases)
    .where(and(ne(S.purchases.status, "cancelled"), sql`(${S.purchases.amount} - coalesce(${S.purchases.paidAmount}, 0)) > 0.01`))
    .orderBy(desc(S.purchases.purchaseDate))
    .limit(8);

  // 7. Recent Transactions (Vouchers & Ledger)
  const recentTransactions = await db
    .select({
      id: S.ledgerEntries.id,
      date: S.ledgerEntries.entryDate,
      account: S.ledgerEntries.account,
      description: S.ledgerEntries.description,
      debit: S.ledgerEntries.debit,
      credit: S.ledgerEntries.credit,
      voucherNo: S.ledgerEntries.voucherNo,
      refType: S.ledgerEntries.refType,
    })
    .from(S.ledgerEntries)
    .orderBy(desc(S.ledgerEntries.entryDate), desc(S.ledgerEntries.id))
    .limit(10);

  return NextResponse.json({
    metrics: {
      revenue,
      expenses,
      netProfit,
      totalReceivables: accountsReceivable,
      totalPayables: accountsPayable,
      cashBalance,
      bankBalance,
      accountsReceivable,
      accountsPayable,
    },
    totalRevenue: revenue,
    totalExpenses: expenses,
    netProfit,
    totalReceivables: accountsReceivable,
    totalPayables: accountsPayable,
    cashBalance,
    bankBalance,
    accountsReceivable,
    accountsPayable,
    period: { from, to },
    trend,
    outstandingInvoices,
    outstandingPurchases,
    recentTransactions,
  });
});
