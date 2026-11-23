/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { colsFromFields, type Col } from "@/lib/columns";
import type { ReportDef } from "@/lib/report-config";
import { RESOURCES } from "@/lib/resource-config";
import { AppError } from "./api";
import { listRows, type Row } from "./resources";

export interface ReportFilters { from?: string; to?: string; client?: string; status?: string; category?: string; department?: string; q?: string }
export interface ReportResult {
  columns: Col[];
  rows: Row[];
  summary?: { label: string; value: number | string; money?: boolean }[];
}

export async function runReport(def: ReportDef, f: ReportFilters): Promise<ReportResult> {
  if (def.resource) {
    const res = RESOURCES[def.resource];
    if (!res) throw new AppError(500, "Report resource missing");
    const byName = new Map(res.fields.map((x) => [x.name, x]));
    const fields = (def.columns ?? []).map((c) => byName.get(c)).filter(Boolean) as typeof res.fields;
    const rows = await listRows(res, {
      where: def.where,
      from: f.from, to: f.to, dateField: def.dateField,
      client: f.client, status: f.status, category: f.category, department: f.department, q: f.q,
      sort: def.sort, limit: 10000,
    });
    return { columns: colsFromFields(fields), rows };
  }
  if (def.key === "erp_customer_accounts") return customerAccounts(f);
  if (def.key === "erp_pnl") return pnl(f);
  throw new AppError(404, "Unknown report");
}

async function customerAccounts(f: ReportFilters): Promise<ReportResult> {
  const invConds: SQL[] = [eq(S.invoices.status, "issued")];
  if (f.from) invConds.push(gte(S.invoices.issueDate, f.from));
  if (f.to) invConds.push(lte(S.invoices.issueDate, f.to));
  const payConds: SQL[] = [eq(S.payments.direction, "received")];
  if (f.from) payConds.push(gte(S.payments.paymentDate, f.from));
  if (f.to) payConds.push(lte(S.payments.paymentDate, f.to));

  const inv = await db
    .select({ clientId: S.invoices.clientId, n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${S.invoices.total}),0)::float` })
    .from(S.invoices).where(and(...invConds)).groupBy(S.invoices.clientId);
  const pay = await db
    .select({ clientId: S.payments.clientId, total: sql<number>`coalesce(sum(${S.payments.amount}),0)::float` })
    .from(S.payments).where(and(...payConds)).groupBy(S.payments.clientId);
  const clients = await db.select({ id: S.clients.id, name: S.clients.name, companyName: S.clients.companyName }).from(S.clients);

  const cm = new Map(clients.map((c) => [c.id, c]));
  const ids = new Set<number>([...inv.map((i) => i.clientId), ...pay.map((p) => p.clientId).filter((x): x is number => x != null)]);
  let rows: Row[] = [...ids].map((id) => {
    const i = inv.find((x) => x.clientId === id);
    const p = pay.find((x) => x.clientId === id);
    const c = cm.get(id);
    const invoiced = Number(i?.total ?? 0), received = Number(p?.total ?? 0);
    return { id, name: c ? (c.companyName && c.companyName !== c.name ? `${c.name} — ${c.companyName}` : c.name) : `#${id}`, invoices: i?.n ?? 0, invoiced, received, balance: Math.round((invoiced - received) * 100) / 100 };
  });
  if (f.client) rows = rows.filter((r) => String(r.id) === f.client);
  if (f.q) rows = rows.filter((r) => String(r.name).toLowerCase().includes(f.q!.toLowerCase()));
  rows.sort((a, b) => b.balance - a.balance);
  const def = (await import("@/lib/report-config")).getReport("erp_customer_accounts")!;
  return { columns: def.customColumns!.map((c) => ({ key: c.key, label: c.label, type: c.type, sum: c.sum })), rows };
}

async function pnl(f: ReportFilters): Promise<ReportResult> {
  const range = (col: any) => {
    const c: SQL[] = [];
    if (f.from) c.push(gte(col, f.from));
    if (f.to) c.push(lte(col, f.to));
    return c;
  };
  const rows: Row[] = [];
  const [sales] = await db
    .select({ n: sql<number>`count(*)::int`, s: sql<number>`coalesce(sum(${S.invoices.subtotal}),0)::float` })
    .from(S.invoices).where(and(eq(S.invoices.status, "issued"), ...range(S.invoices.issueDate)));
  rows.push({ type: "Income", category: "Sales invoices (excluding tax)", entries: sales.n, amount: Number(sales.s) });
  const inc = await db
    .select({ c: S.incomes.category, n: sql<number>`count(*)::int`, s: sql<number>`coalesce(sum(${S.incomes.amount}),0)::float` })
    .from(S.incomes).where(and(...range(S.incomes.incomeDate))).groupBy(S.incomes.category);
  for (const i of inc) rows.push({ type: "Income", category: i.c, entries: i.n, amount: Number(i.s) });
  const [pur] = await db
    .select({ n: sql<number>`count(*)::int`, s: sql<number>`coalesce(sum(${S.purchases.amount}),0)::float` })
    .from(S.purchases).where(and(ne(S.purchases.status, "cancelled"), ...range(S.purchases.purchaseDate)));
  rows.push({ type: "Expense", category: "Purchases", entries: pur.n, amount: Number(pur.s) });
  const exp = await db
    .select({ c: S.expenses.category, n: sql<number>`count(*)::int`, s: sql<number>`coalesce(sum(${S.expenses.amount}),0)::float` })
    .from(S.expenses).where(and(...range(S.expenses.expenseDate))).groupBy(S.expenses.category);
  for (const e of exp) rows.push({ type: "Expense", category: e.c, entries: e.n, amount: Number(e.s) });

  const income = rows.filter((r) => r.type === "Income").reduce((a, r) => a + r.amount, 0);
  const expense = rows.filter((r) => r.type === "Expense").reduce((a, r) => a + r.amount, 0);
  const def = (await import("@/lib/report-config")).getReport("erp_pnl")!;
  return {
    columns: def.customColumns!.map((c) => ({ key: c.key, label: c.label, type: c.type })),
    rows: rows.map((r, i) => ({ ...r, id: i + 1 })),
    summary: [
      { label: "Total Income", value: income, money: true },
      { label: "Total Expense", value: expense, money: true },
      { label: "Net Result", value: Math.round((income - expense) * 100) / 100, money: true },
    ],
  };
}
