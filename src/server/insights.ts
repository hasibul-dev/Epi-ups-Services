/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, desc, eq, gte, ilike, inArray, lt, lte, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import type { DeptCode } from "@/lib/constants";
import { REPORTS } from "@/lib/report-config";
import { addDays, monthRange } from "@/lib/utils";
import { can, type PermRow } from "./permissions";
import { getSettings, getToday } from "./settings";
import type { SessionUser } from "./auth";

void (null as unknown as PermRow);

/* ───────── Global search ───────── */

export interface SearchHit { group: string; title: string; subtitle?: string; href: string }

export async function globalSearch(user: SessionUser, q: string): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_]/g, "\\$&")}%`;
  const hits: SearchHit[] = [];
  const canV = (m: DeptCode) => can(user, m, "view");
  const [sales, service, it] = await Promise.all([canV("sales"), canV("service"), canV("it")]);
  const enc = encodeURIComponent(term);

  if (sales || service) {
    const base = sales ? "/sales/clients" : "/service/clients";
    const rows = await db.select().from(S.clients).where(or(ilike(S.clients.name, like), ilike(S.clients.companyName, like), ilike(S.clients.phone, like), ilike(S.clients.contactPerson, like))).limit(5);
    for (const r of rows) hits.push({ group: "Clients", title: r.name, subtitle: [r.companyName, r.phone].filter(Boolean).join(" · "), href: `${base}?q=${enc}` });
  }
  if (sales) {
    const rows = await db.select({ t: S.salesWork.title, s: S.salesWork.status, c: S.clients.name }).from(S.salesWork).innerJoin(S.clients, eq(S.clients.id, S.salesWork.clientId)).where(or(ilike(S.salesWork.title, like), ilike(S.clients.name, like))).limit(5);
    for (const r of rows) hits.push({ group: "Work Orders (Sales)", title: r.t, subtitle: `${r.c} · ${r.s.replace(/_/g, " ")}`, href: `/sales/work?q=${enc}` });
  }
  if (service) {
    const so = S.serviceOrders;
    const rows = await db.select({ t: so.title, cat: so.category, no: so.orderNo, s: so.status, c: S.clients.name, serial: so.serialNumber }).from(so).innerJoin(S.clients, eq(S.clients.id, so.clientId)).where(or(ilike(so.title, like), ilike(so.orderNo, like), ilike(so.serialNumber, like), ilike(S.clients.name, like))).limit(8);
    for (const r of rows) {
      hits.push({ group: r.cat === "installation" ? "Installation Records" : "Service Records", title: `${r.no ? r.no + " — " : ""}${r.t}`, subtitle: `${r.c} · ${r.cat} · ${r.s.replace(/_/g, " ")}`, href: `/service/${r.cat}?q=${enc}` });
    }
  }
  if (it) {
    const rows = await db.select().from(S.itTickets).where(or(ilike(S.itTickets.ticketNo, like), ilike(S.itTickets.subject, like), ilike(S.itTickets.userName, like))).limit(5);
    for (const r of rows) hits.push({ group: "Tickets", title: `${r.ticketNo} — ${r.subject}`, subtitle: `${r.userName} · ${r.status.replace(/_/g, " ")}`, href: `/it/tickets?q=${enc}` });
    const dev = await db.select().from(S.devices).where(or(ilike(S.devices.name, like), ilike(S.devices.serialNumber, like), ilike(S.devices.assignedEmployee, like))).limit(5);
    for (const r of dev) hits.push({ group: "Devices", title: r.name, subtitle: [r.type, r.serialNumber, r.assignedEmployee].filter(Boolean).join(" · "), href: `/it/devices?q=${enc}` });
  }
  const lower = term.toLowerCase();
  for (const r of REPORTS) {
    if (!(r.title.toLowerCase().includes(lower) || r.description.toLowerCase().includes(lower))) continue;
    if (!(await canV(r.dept))) continue;
    hits.push({ group: "Reports", title: r.title, subtitle: r.description, href: `/${r.dept}/${r.dept === "erp" ? "reports" : "reports"}?report=${r.key}` });
  }
  return hits;
}

/* ───────── Notifications ───────── */

export interface Notice { id: string; kind: "upcoming" | "overdue" | "followup" | "warranty" | "tickets" | "assigned"; title: string; detail: string; href: string; tone: "red" | "amber" | "blue" | "emerald" | "purple" }

export async function getNotifications(user: SessionUser): Promise<Notice[]> {
  const st = await getSettings();
  if (st["notify.enabled"] === "false") return [];
  const today = await getToday();
  const upDays = parseInt(st["notify.upcomingDays"] || "3", 10);
  const wDays = parseInt(st["notify.warrantyDays"] || "30", 10);
  const out: Notice[] = [];
  const canV = (m: DeptCode) => can(user, m, "view");
  const [sales, service, marketing, it] = await Promise.all([canV("sales"), canV("service"), canV("marketing"), canV("it")]);
  const done = ["completed", "cancelled"];

  if (service) {
    const so = S.serviceOrders;
    const up = await db.select({ id: so.id, t: so.title, d: so.scheduledDate, c: S.clients.name }).from(so).innerJoin(S.clients, eq(S.clients.id, so.clientId)).where(and(sql`${so.scheduledDate} > ${today}`, lte(so.scheduledDate, addDays(today, upDays)), notInArray(so.status, done))).orderBy(so.scheduledDate).limit(5);
    for (const r of up) out.push({ id: `up-${r.id}`, kind: "upcoming", title: `Upcoming: ${r.t}`, detail: `${r.c} · ${r.d}`, href: "/service/upcoming", tone: "blue" });
    const od = await db.select({ id: so.id, t: so.title, d: so.scheduledDate, c: S.clients.name }).from(so).innerJoin(S.clients, eq(S.clients.id, so.clientId)).where(and(lt(so.scheduledDate, today), notInArray(so.status, done))).orderBy(so.scheduledDate).limit(5);
    for (const r of od) out.push({ id: `sod-${r.id}`, kind: "overdue", title: `Overdue service: ${r.t}`, detail: `${r.c} · was due ${r.d}`, href: "/service/history", tone: "red" });
    const w = await db.select({ id: S.warranties.id, p: S.warranties.product, e: S.warranties.warrantyExpiry, c: S.clients.name }).from(S.warranties).innerJoin(S.clients, eq(S.clients.id, S.warranties.clientId)).where(and(eq(S.warranties.status, "active"), gte(S.warranties.warrantyExpiry, today), lte(S.warranties.warrantyExpiry, addDays(today, wDays)))).orderBy(S.warranties.warrantyExpiry).limit(5);
    for (const r of w) out.push({ id: `w-${r.id}`, kind: "warranty", title: `Warranty expiring: ${r.p}`, detail: `${r.c} · expires ${r.e}`, href: "/service/warranty", tone: "amber" });
  }
  if (sales) {
    const sw = S.salesWork;
    const od = await db.select({ id: sw.id, t: sw.title, d: sw.dueDate, c: S.clients.name }).from(sw).innerJoin(S.clients, eq(S.clients.id, sw.clientId)).where(and(lt(sw.dueDate, today), notInArray(sw.status, done))).orderBy(sw.dueDate).limit(5);
    for (const r of od) out.push({ id: `swo-${r.id}`, kind: "overdue", title: `Overdue sales work: ${r.t}`, detail: `${r.c} · was due ${r.d}`, href: "/sales/work", tone: "red" });
    const fu = await db.select({ id: S.followUps.id, d: S.followUps.dueDate, c: S.clients.name, ty: S.followUps.type }).from(S.followUps).innerJoin(S.clients, eq(S.clients.id, S.followUps.clientId)).where(and(eq(S.followUps.status, "pending"), lte(S.followUps.dueDate, today))).orderBy(S.followUps.dueDate).limit(6);
    for (const r of fu) out.push({ id: `fu-${r.id}`, kind: "followup", title: `Follow-up due: ${r.c}`, detail: `${r.ty} · ${r.d}`, href: "/sales/follow-ups", tone: "purple" });
  }
  if (marketing) {
    const od = await db.select({ id: S.marketingTasks.id, t: S.marketingTasks.title, d: S.marketingTasks.dueDate }).from(S.marketingTasks).where(and(lt(S.marketingTasks.dueDate, today), notInArray(S.marketingTasks.status, ["done", "cancelled"]))).limit(4);
    for (const r of od) out.push({ id: `mt-${r.id}`, kind: "overdue", title: `Overdue marketing task: ${r.t}`, detail: `Due ${r.d}`, href: "/marketing/tasks", tone: "red" });
  }
  if (it) {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(S.itTickets).where(inArray(S.itTickets.status, ["open", "in_progress", "pending"]));
    if (r.n > 0) out.push({ id: "tickets", kind: "tickets", title: `${r.n} pending IT ticket${r.n > 1 ? "s" : ""}`, detail: "Open, in progress or pending", href: "/it/tickets", tone: "amber" });
  }

  // Assigned to me
  const mine: Notice[] = [];
  if (sales) {
    const rows = await db.select({ id: S.salesWork.id, t: S.salesWork.title, d: S.salesWork.dueDate }).from(S.salesWork).where(and(eq(S.salesWork.assignedTo, user.id), notInArray(S.salesWork.status, done))).limit(5);
    for (const r of rows) mine.push({ id: `ms-${r.id}`, kind: "assigned", title: `Assigned to you: ${r.t}`, detail: `Sales work · due ${r.d ?? "—"}`, href: "/sales/work", tone: "emerald" });
  }
  if (service) {
    const rows = await db.select({ id: S.serviceOrders.id, t: S.serviceOrders.title, d: S.serviceOrders.scheduledDate }).from(S.serviceOrders).where(and(eq(S.serviceOrders.technicianId, user.id), notInArray(S.serviceOrders.status, done))).limit(5);
    for (const r of rows) mine.push({ id: `mv-${r.id}`, kind: "assigned", title: `Assigned to you: ${r.t}`, detail: `Service · ${r.d ?? "—"}`, href: "/service/history", tone: "emerald" });
  }
  if (it) {
    const rows = await db.select({ id: S.itTickets.id, t: S.itTickets.subject, n: S.itTickets.ticketNo }).from(S.itTickets).where(and(eq(S.itTickets.technicianId, user.id), inArray(S.itTickets.status, ["open", "in_progress", "pending"]))).limit(5);
    for (const r of rows) mine.push({ id: `mi-${r.id}`, kind: "assigned", title: `Assigned to you: ${r.n}`, detail: r.t, href: "/it/tickets", tone: "emerald" });
  }
  return [...out, ...mine];
}

/* ───────── Calendar ───────── */

export interface CalEvent { date: string; title: string; type: string; status?: string; href: string }

export async function getCalendarEvents(user: SessionUser, dept: DeptCode, month: string): Promise<CalEvent[]> {
  if (!(await can(user, dept, "view"))) return [];
  const { from, to } = monthRange(month);
  const ev: CalEvent[] = [];
  if (dept === "sales") {
    const w = await db.select({ t: S.salesWork.title, d: S.salesWork.dueDate, s: S.salesWork.status, c: S.clients.name }).from(S.salesWork).innerJoin(S.clients, eq(S.clients.id, S.salesWork.clientId)).where(and(gte(S.salesWork.dueDate, from), lte(S.salesWork.dueDate, to)));
    for (const r of w) ev.push({ date: r.d!, title: `${r.t} — ${r.c}`, type: "Work due", status: r.s, href: "/sales/work" });
    const f = await db.select({ d: S.followUps.dueDate, s: S.followUps.status, c: S.clients.name, ty: S.followUps.type }).from(S.followUps).innerJoin(S.clients, eq(S.clients.id, S.followUps.clientId)).where(and(gte(S.followUps.dueDate, from), lte(S.followUps.dueDate, to)));
    for (const r of f) ev.push({ date: r.d, title: `Follow-up (${r.ty}) — ${r.c}`, type: "Follow-up", status: r.s, href: "/sales/follow-ups" });
  }
  if (dept === "service") {
    const so = S.serviceOrders;
    const w = await db.select({ t: so.title, d: so.scheduledDate, s: so.status, cat: so.category, c: S.clients.name, tech: S.users.name }).from(so).innerJoin(S.clients, eq(S.clients.id, so.clientId)).leftJoin(S.users, eq(S.users.id, so.technicianId)).where(and(gte(so.scheduledDate, from), lte(so.scheduledDate, to)));
    for (const r of w) ev.push({ date: r.d!, title: `${r.t} — ${r.c}${r.tech ? ` (${r.tech})` : ""}`, type: r.cat, status: r.s, href: `/service/${r.cat}` });
    const nm = await db.select({ t: so.title, d: so.nextMaintenanceDate, c: S.clients.name }).from(so).innerJoin(S.clients, eq(S.clients.id, so.clientId)).where(and(gte(so.nextMaintenanceDate, from), lte(so.nextMaintenanceDate, to)));
    for (const r of nm) ev.push({ date: r.d!, title: `Next maintenance: ${r.t} — ${r.c}`, type: "maintenance", status: "scheduled", href: "/service/maintenance" });
    const wr = await db.select({ p: S.warranties.product, d: S.warranties.warrantyExpiry, c: S.clients.name }).from(S.warranties).innerJoin(S.clients, eq(S.clients.id, S.warranties.clientId)).where(and(gte(S.warranties.warrantyExpiry, from), lte(S.warranties.warrantyExpiry, to)));
    for (const r of wr) ev.push({ date: r.d, title: `Warranty expiry: ${r.p} — ${r.c}`, type: "warranty", href: "/service/warranty" });
  }
  if (dept === "marketing") {
    const p = await db.select({ t: S.socialPosts.title, d: S.socialPosts.scheduledDate, pf: S.socialPosts.platform, s: S.socialPosts.status }).from(S.socialPosts).where(and(gte(S.socialPosts.scheduledDate, from), lte(S.socialPosts.scheduledDate, to)));
    for (const r of p) ev.push({ date: r.d!, title: `${r.t} (${r.pf})`, type: "Post", status: r.s, href: "/marketing/posts" });
    const t = await db.select({ t: S.marketingTasks.title, d: S.marketingTasks.dueDate, s: S.marketingTasks.status }).from(S.marketingTasks).where(and(gte(S.marketingTasks.dueDate, from), lte(S.marketingTasks.dueDate, to)));
    for (const r of t) ev.push({ date: r.d!, title: r.t, type: "Task due", status: r.s, href: "/marketing/tasks" });
  }
  if (dept === "it") {
    const t = await db.select({ t: S.itTasks.title, d: S.itTasks.dueDate, s: S.itTasks.status }).from(S.itTasks).where(and(gte(S.itTasks.dueDate, from), lte(S.itTasks.dueDate, to)));
    for (const r of t) ev.push({ date: r.d!, title: r.t, type: "IT work due", status: r.s, href: "/it/work" });
  }
  void desc;
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}
