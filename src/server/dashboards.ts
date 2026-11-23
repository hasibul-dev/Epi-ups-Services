/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, count, desc, eq, gte, inArray, lt, lte, ne, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { DEPTS, type DeptCode } from "@/lib/constants";
import { addDays } from "@/lib/utils";
import { getSettings, getToday } from "./settings";

export type Tone = "slate" | "blue" | "cyan" | "emerald" | "amber" | "red" | "purple" | "indigo";
export interface Stat { label: string; value: number | string; hint?: string; tone: Tone; href?: string; icon: string; money?: boolean }
export interface ChartData { title: string; kind: "bar" | "pie" | "area" | "bar2"; data: { name: string; value: number; value2?: number }[]; series?: [string, string?]; money?: boolean }
export interface ListData { title: string; href?: string; empty: string; columns: { key: string; label: string; type?: "text" | "date" | "badge" | "money" }[]; rows: Record<string, any>[] }
export interface LinkCard { label: string; description: string; href: string; icon: string; color: string }
export interface DashData { stats: Stat[]; charts: ChartData[]; lists: ListData[]; links?: LinkCard[]; notes?: string[] }

const cnt = async (table: any, ...conds: (SQL | undefined)[]) => {
  const c = conds.filter(Boolean) as SQL[];
  const [r] = await db.select({ n: count() }).from(table).where(c.length ? and(...c) : undefined);
  return Number(r?.n ?? 0);
};
const sumOf = async (table: any, column: any, ...conds: (SQL | undefined)[]) => {
  const c = conds.filter(Boolean) as SQL[];
  const [r] = await db.select({ s: sql<number>`coalesce(sum(${column}),0)::float` }).from(table).where(c.length ? and(...c) : undefined);
  return Number(r?.s ?? 0);
};
const groupCount = async (table: any, column: any, ...conds: (SQL | undefined)[]) => {
  const c = conds.filter(Boolean) as SQL[];
  const rows = await db.select({ k: column, n: count() }).from(table).where(c.length ? and(...c) : undefined).groupBy(column);
  return rows.map((r: any) => ({ name: String(r.k ?? "—").replace(/_/g, " "), value: Number(r.n) }));
};
const r2 = (n: number) => Math.round(n * 100) / 100;

const DONE_SALES = ["completed", "cancelled"];

export async function getDashboard(dept: DeptCode, userId: number): Promise<DashData> {
  const today = await getToday();
  switch (dept) {
    case "admin": return adminDash(today);
    case "sales": return salesDash(today);
    case "service": return serviceDash(today);
    case "erp": return erpDash(today);
    case "marketing": return marketingDash(today);
    case "it": return itDash(today, userId);
  }
}

async function adminDash(today: string): Promise<DashData> {
  const [users, activeDepts, clients, sw, so, mt, itk, itt, pendSales, pendSvc, pendMkt, pendIt, pendTick, doneSales, doneSvc, doneTick, logs24, byDept, recent] = await Promise.all([
    cnt(S.users, eq(S.users.active, true)),
    cnt(S.departments, eq(S.departments.active, true)),
    cnt(S.clients),
    cnt(S.salesWork), cnt(S.serviceOrders), cnt(S.marketingTasks), cnt(S.itTickets), cnt(S.itTasks),
    cnt(S.salesWork, notInArray(S.salesWork.status, DONE_SALES)),
    cnt(S.serviceOrders, notInArray(S.serviceOrders.status, DONE_SALES)),
    cnt(S.marketingTasks, notInArray(S.marketingTasks.status, ["done", "cancelled"])),
    cnt(S.itTasks, notInArray(S.itTasks.status, ["done", "cancelled"])),
    cnt(S.itTickets, inArray(S.itTickets.status, ["open", "in_progress", "pending"])),
    cnt(S.salesWork, eq(S.salesWork.status, "completed")),
    cnt(S.serviceOrders, eq(S.serviceOrders.status, "completed")),
    cnt(S.itTickets, inArray(S.itTickets.status, ["resolved", "closed"])),
    cnt(S.auditLogs, gte(S.auditLogs.createdAt, new Date(Date.now() - 86400_000))),
    db.select({ k: S.users.department, n: count() }).from(S.users).where(eq(S.users.active, true)).groupBy(S.users.department),
    db.select().from(S.auditLogs).orderBy(desc(S.auditLogs.createdAt)).limit(8),
  ]);
  void mt; void itk; void itt;
  const allUsers = await cnt(S.users);
  return {
    stats: [
      { label: "Total Users", value: allUsers, hint: `${users} active`, tone: "blue", icon: "Users", href: "/admin/users" },
      { label: "Active Departments", value: activeDepts, hint: "Configured departments", tone: "indigo", icon: "Building2", href: "/admin/departments" },
      { label: "Total Clients", value: clients, hint: "Shared client master", tone: "cyan", icon: "Briefcase" },
      { label: "Total Work Orders", value: sw + so, hint: `${sw} sales · ${so} service`, tone: "emerald", icon: "ClipboardList" },
      { label: "Pending Activities", value: pendSales + pendSvc + pendMkt + pendIt + pendTick, hint: "Open work, tasks and tickets", tone: "amber", icon: "Clock" },
      { label: "Completed Work", value: doneSales + doneSvc + doneTick, hint: "Sales, service and IT", tone: "emerald", icon: "CheckCircle2" },
      { label: "System Activity", value: logs24, hint: "Audit events in last 24h", tone: "purple", icon: "Activity", href: "/admin/audit" },
    ],
    charts: [
      { title: "Active users by department", kind: "bar", data: byDept.map((r: any) => ({ name: DEPTS[r.k as DeptCode]?.short ?? r.k, value: Number(r.n) })) },
      { title: "Open vs completed work", kind: "pie", data: [{ name: "Open", value: pendSales + pendSvc + pendMkt + pendIt + pendTick }, { name: "Completed", value: doneSales + doneSvc + doneTick }] },
    ],
    lists: [
      {
        title: "Recent Updates", href: "/admin/audit", empty: "No activity recorded yet",
        columns: [{ key: "createdAt", label: "Time", type: "date" }, { key: "username", label: "User" }, { key: "action", label: "Action" }, { key: "details", label: "Details" }],
        rows: recent.map((r: any) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      },
    ],
    links: (["sales", "service", "erp", "marketing", "it"] as DeptCode[]).map((c) => ({ label: DEPTS[c].name, description: DEPTS[c].description, href: `/${c}`, icon: "ArrowRight", color: DEPTS[c].color })),
    notes: [today],
  };
}

async function salesDash(today: string): Promise<DashData> {
  const open = notInArray(S.salesWork.status, DONE_SALES);
  const [clients, todayWork, pendingFu, overdueFu, completedFu, upcomingActivities, fuRows, workRows] = await Promise.all([
    cnt(S.clients),
    cnt(S.salesWork, eq(S.salesWork.dueDate, today), open),
    cnt(S.followUps, eq(S.followUps.status, "pending")),
    cnt(S.followUps, eq(S.followUps.status, "pending"), lt(S.followUps.dueDate, today)),
    cnt(S.followUps, eq(S.followUps.status, "done")),
    cnt(S.salesWork, sql`${S.salesWork.dueDate} > ${today}`, open),
    db.select({ client: S.clients.name, due: S.followUps.dueDate, method: S.followUps.method, notes: S.followUps.notes })
      .from(S.followUps)
      .innerJoin(S.clients, eq(S.clients.id, S.followUps.clientId))
      .where(and(eq(S.followUps.status, "pending"), lte(S.followUps.dueDate, today)))
      .orderBy(S.followUps.dueDate)
      .limit(6),
    db.select({ title: S.salesWork.title, client: S.clients.name, due: S.salesWork.dueDate, status: S.salesWork.status })
      .from(S.salesWork)
      .innerJoin(S.clients, eq(S.clients.id, S.salesWork.clientId))
      .where(and(open, lte(S.salesWork.dueDate, today)))
      .orderBy(S.salesWork.dueDate)
      .limit(6),
  ]);
  return {
    stats: [
      { label: "Total Clients", value: clients, hint: "All registered clients", tone: "blue", icon: "Briefcase", href: "/sales/clients" },
      { label: "Today's Work", value: todayWork, hint: "Work scheduled today", tone: "cyan", icon: "CalendarCheck", href: "/sales/today" },
      { label: "Pending Follow-ups", value: pendingFu, hint: "Awaiting follow-up", tone: "amber", icon: "PhoneCall", href: "/sales/follow-ups" },
      { label: "Overdue Follow-ups", value: overdueFu, hint: "Past scheduled date", tone: "red", icon: "AlertTriangle", href: "/sales/follow-ups" },
      { label: "Completed Follow-ups", value: completedFu, hint: "Finished follow-ups", tone: "emerald", icon: "CheckCircle2", href: "/sales/follow-ups" },
      { label: "Upcoming Activities", value: upcomingActivities, hint: "Scheduled ahead", tone: "indigo", icon: "Clock", href: "/sales/work" },
    ],
    charts: [],
    lists: [
      {
        title: "Today's Due Follow-ups",
        href: "/sales/today",
        empty: "No follow-ups due today 🎉",
        columns: [
          { key: "client", label: "Client" },
          { key: "method", label: "Method" },
          { key: "due", label: "Due Date", type: "date" },
          { key: "notes", label: "Notes" },
        ],
        rows: fuRows,
      },
      {
        title: "Today's Work Orders",
        href: "/sales/today",
        empty: "No work orders due today",
        columns: [
          { key: "title", label: "Work" },
          { key: "client", label: "Client" },
          { key: "due", label: "Due Date", type: "date" },
          { key: "status", label: "Status", type: "badge" },
        ],
        rows: workRows,
      },
    ],
  };
}

async function serviceDash(today: string): Promise<DashData> {
  const st = await getSettings();
  const upDays = parseInt(st["notify.upcomingDays"] || "3", 10);
  const wDays = parseInt(st["notify.warrantyDays"] || "30", 10);
  const so = S.serviceOrders;
  const open = notInArray(so.status, DONE_SALES);
  const [todaySched, doneToday, upcoming, overdue, warr, byCat, byStatus, instRows, servRows, mainRows, overdueRows, warrRows] = await Promise.all([
    cnt(so, eq(so.scheduledDate, today)),
    cnt(so, eq(so.completedDate, today), eq(so.status, "completed")),
    cnt(so, sql`${so.scheduledDate} > ${today}`, lte(so.scheduledDate, addDays(today, upDays)), open),
    cnt(so, lt(so.scheduledDate, today), open),
    cnt(S.warranties, eq(S.warranties.status, "active"), gte(S.warranties.warrantyExpiry, today), lte(S.warranties.warrantyExpiry, addDays(today, wDays))),
    groupCount(so, so.category),
    groupCount(so, so.status),
    db.select({ s: so.status, n: count() }).from(so).where(eq(so.category, "installation")).groupBy(so.status),
    db.select({ s: so.status, n: count() }).from(so).where(eq(so.category, "servicing")).groupBy(so.status),
    db.select({ s: so.status, n: count() }).from(so).where(eq(so.category, "maintenance")).groupBy(so.status),
    db.select({ date: so.scheduledDate, title: so.title, category: so.category, status: so.status, client: S.clients.name, tech: S.users.name }).from(so).innerJoin(S.clients, eq(S.clients.id, so.clientId)).leftJoin(S.users, eq(S.users.id, so.technicianId)).where(and(lt(so.scheduledDate, today), open)).orderBy(so.scheduledDate).limit(8),
    db.select({ client: S.clients.name, product: S.warranties.product, serial: S.warranties.serialNumber, expiry: S.warranties.warrantyExpiry }).from(S.warranties).innerJoin(S.clients, eq(S.clients.id, S.warranties.clientId)).where(and(eq(S.warranties.status, "active"), gte(S.warranties.warrantyExpiry, today), lte(S.warranties.warrantyExpiry, addDays(today, wDays)))).orderBy(S.warranties.warrantyExpiry).limit(8),
  ]);
  const todayRows = await db.select({ date: so.scheduledDate, time: so.scheduledTime, title: so.title, category: so.category, status: so.status, client: S.clients.name, tech: S.users.name }).from(so).innerJoin(S.clients, eq(S.clients.id, so.clientId)).leftJoin(S.users, eq(S.users.id, so.technicianId)).where(eq(so.scheduledDate, today)).limit(8);
  const total = (rows: { n: number }[]) => rows.reduce((a, r) => a + Number(r.n), 0);
  const by = (rows: { s: string; n: number }[], s: string) => Number(rows.find((r) => r.s === s)?.n ?? 0);
  return {
    stats: [
      { label: "Today's Scheduled Work", value: todaySched, hint: "Scheduled for today", tone: "emerald", icon: "CalendarCheck", href: "/service/today" },
      { label: "Completed Today", value: doneToday, hint: "Finished today", tone: "cyan", icon: "CheckCircle2" },
      { label: "Upcoming Work", value: upcoming, hint: `Next ${upDays} days`, tone: "blue", icon: "CalendarClock", href: "/service/upcoming" },
      { label: "Overdue Tasks", value: overdue, hint: "Past scheduled date", tone: "red", icon: "AlertTriangle", href: "/service/history" },
      { label: "Installations", value: total(instRows), hint: `${by(instRows, "completed")} completed · ${by(instRows, "in_progress")} in progress`, tone: "blue", icon: "Zap", href: "/service/installation" },
      { label: "Servicing", value: total(servRows), hint: `${by(servRows, "completed")} completed · ${by(servRows, "scheduled")} scheduled`, tone: "amber", icon: "Wrench", href: "/service/servicing" },
      { label: "Maintenance", value: total(mainRows), hint: `${by(mainRows, "completed")} completed · ${by(mainRows, "scheduled")} scheduled`, tone: "emerald", icon: "Settings2", href: "/service/maintenance" },
      { label: "Warranty Alerts", value: warr, hint: `Expiring within ${wDays} days`, tone: "purple", icon: "ShieldAlert", href: "/service/warranty" },
    ],
    charts: [
      { title: "Work orders by category", kind: "bar", data: byCat },
      { title: "Work orders by status", kind: "pie", data: byStatus },
    ],
    lists: [
      { title: "Today's Scheduled Work", href: "/service/today", empty: "Nothing scheduled for today", columns: [{ key: "title", label: "Work" }, { key: "client", label: "Client" }, { key: "category", label: "Category", type: "badge" }, { key: "tech", label: "Technician" }, { key: "status", label: "Status", type: "badge" }], rows: todayRows },
      { title: "Overdue Work", href: "/service/history", empty: "No overdue work 🎉", columns: [{ key: "date", label: "Date", type: "date" }, { key: "title", label: "Work" }, { key: "client", label: "Client" }, { key: "category", label: "Category", type: "badge" }, { key: "tech", label: "Technician" }], rows: overdueRows },
      { title: "Warranty Alerts", href: "/service/warranty", empty: "No warranties expiring soon", columns: [{ key: "client", label: "Client" }, { key: "product", label: "Product" }, { key: "serial", label: "Serial" }, { key: "expiry", label: "Expires", type: "date" }], rows: warrRows },
    ],
  };
}

async function erpDash(today: string): Promise<DashData> {
  const monthStart = `${today.slice(0, 7)}-01`;
  const issued = eq(S.invoices.status, "issued");
  const [invoiced, received, paidOut, purchases, incomeM, expenseM, invoicedM, expTotal, incTotal, dr, cr, overdueInv] = await Promise.all([
    sumOf(S.invoices, S.invoices.total, issued),
    sumOf(S.payments, S.payments.amount, eq(S.payments.direction, "received")),
    sumOf(S.payments, S.payments.amount, eq(S.payments.direction, "paid")),
    sumOf(S.purchases, S.purchases.amount, ne(S.purchases.status, "cancelled")),
    sumOf(S.incomes, S.incomes.amount, gte(S.incomes.incomeDate, monthStart)),
    sumOf(S.expenses, S.expenses.amount, gte(S.expenses.expenseDate, monthStart)),
    sumOf(S.invoices, S.invoices.subtotal, issued, gte(S.invoices.issueDate, monthStart)),
    sumOf(S.expenses, S.expenses.amount),
    sumOf(S.incomes, S.incomes.amount),
    sumOf(S.ledgerEntries, S.ledgerEntries.debit),
    sumOf(S.ledgerEntries, S.ledgerEntries.credit),
    db.select({ no: S.invoices.invoiceNo, client: S.clients.name, due: S.invoices.dueDate, total: S.invoices.total }).from(S.invoices).innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId)).where(and(issued, lt(S.invoices.dueDate, today))).orderBy(S.invoices.dueDate).limit(20),
  ]);
  const cash = received + incTotal - paidOut - expTotal;
  const receivables = Math.max(0, invoiced - received);
  const payables = Math.max(0, purchases - paidOut);

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1 - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const first = `${months[0]}-01`;
  const [invM, incM, expM, topExp, paidInv, recentPay] = await Promise.all([
    db.select({ m: sql<string>`to_char(${S.invoices.issueDate},'YYYY-MM')`, s: sql<number>`sum(${S.invoices.subtotal})::float` }).from(S.invoices).where(and(issued, gte(S.invoices.issueDate, first))).groupBy(sql`1`),
    db.select({ m: sql<string>`to_char(${S.incomes.incomeDate},'YYYY-MM')`, s: sql<number>`sum(${S.incomes.amount})::float` }).from(S.incomes).where(gte(S.incomes.incomeDate, first)).groupBy(sql`1`),
    db.select({ m: sql<string>`to_char(${S.expenses.expenseDate},'YYYY-MM')`, s: sql<number>`sum(${S.expenses.amount})::float` }).from(S.expenses).where(gte(S.expenses.expenseDate, first)).groupBy(sql`1`),
    db.select({ c: S.expenses.category, s: sql<number>`sum(${S.expenses.amount})::float` }).from(S.expenses).where(gte(S.expenses.expenseDate, monthStart)).groupBy(S.expenses.category).orderBy(desc(sql`2`)).limit(6),
    Promise.resolve(0),
    db.select({ no: S.payments.paymentNo, dir: S.payments.direction, date: S.payments.paymentDate, amount: S.payments.amount, client: S.clients.name, party: S.payments.party }).from(S.payments).leftJoin(S.clients, eq(S.clients.id, S.payments.clientId)).orderBy(desc(S.payments.paymentDate), desc(S.payments.id)).limit(8),
  ]);
  void paidInv;
  const g = (rows: { m: string; s: number }[], m: string) => Number(rows.find((r) => r.m === m)?.s ?? 0);
  const trend = months.map((m) => ({ name: m, value: r2(g(invM, m) + g(incM, m)), value2: r2(g(expM, m)) }));
  const balanced = Math.abs(dr - cr) < 0.01;
  return {
    stats: [
      { label: "Cash & Bank (derived)", value: r2(cash), hint: "Receipts + income − payments − expenses", tone: "indigo", icon: "Landmark", money: true },
      { label: "Receivables", value: r2(receivables), hint: "Owed by customers", tone: "amber", icon: "Receipt", money: true, href: "/erp/customers" },
      { label: "Payables", value: r2(payables), hint: "Owed to suppliers", tone: "red", icon: "ShoppingCart", money: true, href: "/erp/purchases" },
      { label: "Total Invoiced", value: r2(invoiced), hint: "Issued invoices (incl. tax)", tone: "blue", icon: "FileText", money: true, href: "/erp/invoices" },
      { label: "Income (this month)", value: r2(invoicedM + incomeM), hint: "Invoiced + other income", tone: "emerald", icon: "TrendingUp", money: true },
      { label: "Expenses (this month)", value: r2(expenseM), hint: "Recorded expenses", tone: "red", icon: "TrendingDown", money: true, href: "/erp/expenses" },
      { label: "Net (this month)", value: r2(invoicedM + incomeM - expenseM), hint: "Income − expenses", tone: "purple", icon: "Scale", money: true },
      { label: "Overdue Invoices", value: overdueInv.length, hint: "Issued and past due date", tone: "red", icon: "AlertTriangle", href: "/erp/invoices" },
    ],
    charts: [
      { title: "Income vs Expense — last 6 months", kind: "bar2", series: ["Income", "Expense"], money: true, data: trend },
      { title: "Top expenses this month", kind: "bar", money: true, data: topExp.map((r: any) => ({ name: r.c, value: Number(r.s) })) },
    ],
    lists: [
      { title: "Overdue Invoices", href: "/erp/invoices", empty: "No overdue invoices", columns: [{ key: "no", label: "Invoice" }, { key: "client", label: "Customer" }, { key: "due", label: "Due", type: "date" }, { key: "total", label: "Total", type: "money" }], rows: overdueInv.slice(0, 8) },
      { title: "Recent Payments", href: "/erp/payments", empty: "No payments recorded yet", columns: [{ key: "no", label: "Payment" }, { key: "dir", label: "Direction", type: "badge" }, { key: "date", label: "Date", type: "date" }, { key: "client", label: "Party" }, { key: "amount", label: "Amount", type: "money" }], rows: recentPay.map((r: any) => ({ ...r, client: r.client ?? r.party })) },
    ],
    notes: [balanced ? "Books balanced (Debit = Credit)" : `Ledger out of balance by ${Math.abs(dr - cr).toFixed(2)}`],
  };
}

async function marketingDash(today: string): Promise<DashData> {
  const c = S.campaigns;
  const [active, total, leads, budget, spent, sched, pub, tasksOpen, tasksOverdue, byCamp, byPlatform, activeRows, schedRows] = await Promise.all([
    cnt(c, eq(c.status, "active")), cnt(c),
    sumOf(c, c.leads), sumOf(c, c.budget), sumOf(c, c.spent),
    cnt(S.socialPosts, eq(S.socialPosts.status, "scheduled")),
    cnt(S.socialPosts, eq(S.socialPosts.status, "published")),
    cnt(S.marketingTasks, notInArray(S.marketingTasks.status, ["done", "cancelled"])),
    cnt(S.marketingTasks, notInArray(S.marketingTasks.status, ["done", "cancelled"]), lt(S.marketingTasks.dueDate, today)),
    db.select({ name: c.name, value: c.leads }).from(c).orderBy(desc(c.leads)).limit(8),
    groupCount(S.socialPosts, S.socialPosts.platform),
    db.select({ name: c.name, channel: c.channel, status: c.status, spent: c.spent, budget: c.budget, leads: c.leads }).from(c).where(eq(c.status, "active")).limit(8),
    db.select({ title: S.socialPosts.title, platform: S.socialPosts.platform, date: S.socialPosts.scheduledDate, status: S.socialPosts.status }).from(S.socialPosts).where(and(eq(S.socialPosts.status, "scheduled"), gte(S.socialPosts.scheduledDate, today))).orderBy(S.socialPosts.scheduledDate).limit(8),
  ]);
  return {
    stats: [
      { label: "Active Campaigns", value: active, hint: `${total} total campaigns`, tone: "purple", icon: "Megaphone", href: "/marketing/campaigns" },
      { label: "Total Leads Generated", value: leads, hint: "Across all campaigns", tone: "emerald", icon: "TrendingUp" },
      { label: "Scheduled Posts", value: sched, hint: "Queued in calendar", tone: "amber", icon: "Clock", href: "/marketing/posts" },
      { label: "Published Posts", value: pub, hint: "Live on social channels", tone: "blue", icon: "CheckCircle2", href: "/marketing/posts" },
      { label: "Budget Spent", value: r2(spent), hint: `of ${r2(budget).toLocaleString()} budgeted`, tone: "indigo", icon: "Wallet", money: true },
      { label: "Open Tasks", value: tasksOpen, hint: "Marketing work in progress", tone: "cyan", icon: "ListChecks", href: "/marketing/tasks" },
      { label: "Overdue Tasks", value: tasksOverdue, hint: "Past due date", tone: "red", icon: "AlertTriangle", href: "/marketing/tasks" },
    ],
    charts: [
      { title: "Leads by campaign", kind: "bar", data: byCamp.map((r: any) => ({ name: r.name, value: Number(r.value) })) },
      { title: "Posts by platform", kind: "pie", data: byPlatform },
    ],
    lists: [
      { title: "Active Campaigns", href: "/marketing/campaigns", empty: "No active campaigns", columns: [{ key: "name", label: "Campaign" }, { key: "channel", label: "Channel", type: "badge" }, { key: "spent", label: "Spent", type: "money" }, { key: "budget", label: "Budget", type: "money" }, { key: "leads", label: "Leads" }], rows: activeRows },
      { title: "Upcoming Scheduled Posts", href: "/marketing/posts", empty: "No posts scheduled", columns: [{ key: "date", label: "Date", type: "date" }, { key: "title", label: "Post" }, { key: "platform", label: "Platform", type: "badge" }], rows: schedRows },
    ],
  };
}

async function itDash(today: string, userId: number): Promise<DashData> {
  const t = S.itTickets;
  const openS = ["open", "in_progress", "pending"];
  const [open, resolved, high, devices, repair, warrExp, tasksOpen, byStatus, byPriority, recent, mine] = await Promise.all([
    cnt(t, inArray(t.status, openS)),
    cnt(t, inArray(t.status, ["resolved", "closed"])),
    cnt(t, inArray(t.status, openS), inArray(t.priority, ["high", "urgent"])),
    cnt(S.devices),
    cnt(S.devices, eq(S.devices.status, "in_repair")),
    cnt(S.devices, gte(S.devices.warrantyExpiry, today), lte(S.devices.warrantyExpiry, addDays(today, 30))),
    cnt(S.itTasks, notInArray(S.itTasks.status, ["done", "cancelled"])),
    groupCount(t, t.status),
    groupCount(t, t.priority),
    db.select({ no: t.ticketNo, subject: t.subject, user: t.userName, department: t.department, priority: t.priority, status: t.status, tech: S.users.name }).from(t).leftJoin(S.users, eq(S.users.id, t.technicianId)).orderBy(desc(t.createdAt)).limit(8),
    cnt(t, eq(t.technicianId, userId), inArray(t.status, openS)),
  ]);
  return {
    stats: [
      { label: "Open Tickets", value: open, hint: "Open, in progress & pending", tone: "blue", icon: "Ticket", href: "/it/tickets" },
      { label: "Resolved Tickets", value: resolved, hint: "Resolved & closed", tone: "emerald", icon: "CheckCircle2", href: "/it/history" },
      { label: "High Priority Tickets", value: high, hint: "High / urgent and unresolved", tone: "red", icon: "AlertTriangle", href: "/it/tickets" },
      { label: "Managed Devices", value: devices, hint: `${repair} in repair`, tone: "indigo", icon: "Laptop", href: "/it/devices" },
      { label: "Warranty Expiring (30d)", value: warrExp, hint: "Devices", tone: "amber", icon: "ShieldAlert", href: "/it/devices" },
      { label: "Open IT Work", value: tasksOpen, hint: "IT tasks not done", tone: "cyan", icon: "Headphones", href: "/it/work" },
      { label: "Assigned To Me", value: mine, hint: "Unresolved tickets", tone: "purple", icon: "UserCheck" },
    ],
    charts: [
      { title: "Tickets by status", kind: "pie", data: byStatus },
      { title: "Tickets by priority", kind: "bar", data: byPriority },
    ],
    lists: [
      { title: "Recent IT Tickets", href: "/it/tickets", empty: "No tickets yet", columns: [{ key: "no", label: "Ticket" }, { key: "subject", label: "Subject" }, { key: "user", label: "User" }, { key: "priority", label: "Priority", type: "badge" }, { key: "status", label: "Status", type: "badge" }, { key: "tech", label: "Technician" }], rows: recent },
    ],
  };
}
