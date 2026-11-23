import { NextResponse } from "next/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

function dayDiff(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  return Math.max(0, Math.floor((t2 - t1) / (86400 * 1000)));
}

export const GET = apiHandler(async () => {
  await requireUser();
  const today = await getToday();

  // 1. Receivables Ageing from unpaid Sales Invoices
  const unpaidInvoices = await db
    .select({
      id: S.invoices.id,
      invoiceNo: S.invoices.invoiceNo,
      clientId: S.invoices.clientId,
      clientName: S.clients.name,
      issueDate: S.invoices.issueDate,
      dueDate: S.invoices.dueDate,
      total: S.invoices.total,
      paidAmount: S.invoices.paidAmount,
      dueAmount: sql<number>`(${S.invoices.total} - coalesce(${S.invoices.paidAmount}, 0))::float`,
    })
    .from(S.invoices)
    .innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId))
    .where(and(eq(S.invoices.status, "issued"), sql`(${S.invoices.total} - coalesce(${S.invoices.paidAmount}, 0)) > 0.01`))
    .orderBy(desc(S.invoices.dueDate));

  const clientMap = new Map<number, {
    clientId: number;
    name: string;
    total: number;
    current: number; // 0-30 days
    days31_60: number;
    days61_90: number;
    over90: number;
  }>();

  for (const inv of unpaidInvoices) {
    const due = r2(Number(inv.dueAmount || 0));
    const refDate = inv.dueDate || inv.issueDate;
    const days = dayDiff(refDate, today);

    let item = clientMap.get(inv.clientId);
    if (!item) {
      item = { clientId: inv.clientId, name: inv.clientName, total: 0, current: 0, days31_60: 0, days61_90: 0, over90: 0 };
      clientMap.set(inv.clientId, item);
    }

    item.total = r2(item.total + due);
    if (days <= 30) item.current = r2(item.current + due);
    else if (days <= 60) item.days31_60 = r2(item.days31_60 + due);
    else if (days <= 90) item.days61_90 = r2(item.days61_90 + due);
    else item.over90 = r2(item.over90 + due);
  }

  const receivablesAgeing = Array.from(clientMap.values()).sort((a, b) => b.total - a.total);

  // 2. Payables Ageing from unpaid Purchase Bills
  const unpaidPurchases = await db
    .select({
      id: S.purchases.id,
      purchaseNo: S.purchases.purchaseNo,
      supplierId: S.purchases.supplierId,
      supplier: S.purchases.supplier,
      purchaseDate: S.purchases.purchaseDate,
      dueDate: S.purchases.dueDate,
      amount: S.purchases.amount,
      paidAmount: S.purchases.paidAmount,
      dueAmount: sql<number>`(${S.purchases.amount} - coalesce(${S.purchases.paidAmount}, 0))::float`,
    })
    .from(S.purchases)
    .where(and(ne(S.purchases.status, "cancelled"), sql`(${S.purchases.amount} - coalesce(${S.purchases.paidAmount}, 0)) > 0.01`))
    .orderBy(desc(S.purchases.purchaseDate));

  const supplierMap = new Map<string, {
    supplier: string;
    total: number;
    current: number;
    days31_60: number;
    days61_90: number;
    over90: number;
  }>();

  for (const pur of unpaidPurchases) {
    const due = r2(Number(pur.dueAmount || 0));
    const refDate = pur.dueDate || pur.purchaseDate;
    const days = dayDiff(refDate, today);

    let item = supplierMap.get(pur.supplier);
    if (!item) {
      item = { supplier: pur.supplier, total: 0, current: 0, days31_60: 0, days61_90: 0, over90: 0 };
      supplierMap.set(pur.supplier, item);
    }

    item.total = r2(item.total + due);
    if (days <= 30) item.current = r2(item.current + due);
    else if (days <= 60) item.days31_60 = r2(item.days31_60 + due);
    else if (days <= 90) item.days61_90 = r2(item.days61_90 + due);
    else item.over90 = r2(item.over90 + due);
  }

  const payablesAgeing = Array.from(supplierMap.values()).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    asOfDate: today,
    receivables: receivablesAgeing,
    payables: payablesAgeing,
    totals: {
      totalReceivables: r2(receivablesAgeing.reduce((s, r) => s + r.total, 0)),
      totalPayables: r2(payablesAgeing.reduce((s, r) => s + r.total, 0)),
    },
  });
});
