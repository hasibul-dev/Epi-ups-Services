/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { RESOURCES, buildSchema, formFields, type ResourceDef, type Where } from "@/lib/resource-config";
import { resolveToken } from "@/lib/utils";
import { AppError } from "./api";
import { getToday } from "./settings";

export type Row = Record<string, any>;

const TABLES: Record<string, any> = {
  clients: S.clients, sales_work: S.salesWork, follow_ups: S.followUps, service_orders: S.serviceOrders, warranties: S.warranties,
  campaigns: S.campaigns, marketing_tasks: S.marketingTasks, social_posts: S.socialPosts, devices: S.devices, it_tickets: S.itTickets,
  it_tasks: S.itTasks, invoices: S.invoices, purchases: S.purchases, payments: S.payments, expenses: S.expenses, incomes: S.incomes,
  ledger_entries: S.ledgerEntries, departments: S.departments, audit_logs: S.auditLogs, users: S.users,
};

export const tableOf = (def: ResourceDef): any => TABLES[def.table];
const col = (t: any, name: string) => {
  const c = t[name];
  if (!c) throw new AppError(400, `Unknown field ${name}`);
  return c;
};

/* Reference sources used for label resolution and select options */
const REF_SOURCES: Record<string, { table: any; label: (r: Row) => string }> = {
  users: { table: S.users, label: (r) => r.name + (r.active === false ? " (inactive)" : "") },
  clients: { table: S.clients, label: (r) => (r.companyName && r.companyName !== r.name ? `${r.name} — ${r.companyName}` : r.name) },
  campaigns: { table: S.campaigns, label: (r) => r.name },
  devices: { table: S.devices, label: (r) => `${r.name}${r.serialNumber ? ` (${r.serialNumber})` : ""}` },
  invoices: { table: S.invoices, label: (r) => `${r.invoiceNo} — ৳${Number(r.total).toLocaleString()}` },
  sales_work: { table: S.salesWork, label: (r) => r.title },
};

export function getDef(key: string): ResourceDef {
  const def = RESOURCES[key];
  if (!def) throw new AppError(404, "Unknown resource");
  return def;
}

export async function refOptions(ref: string): Promise<{ value: number; label: string }[]> {
  const src = REF_SOURCES[ref];
  if (!src) throw new AppError(404, "Unknown option source");
  const rows: Row[] = await db.select().from(src.table).limit(3000);
  return rows.map((r) => ({ value: r.id as number, label: src.label(r) })).sort((a, b) => a.label.localeCompare(b.label));
}

/* ───────── filters ───────── */

function cast(c: any, v: string, op: string): any {
  if (c.dataType === "date") {
    const end = op === "lte" || op === "gt";
    return new Date(`${v}${end ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  }
  if (c.dataType === "number") return Number(v);
  return v;
}

export function buildWhere(table: any, wheres: Where[], today: string): SQL[] {
  const out: SQL[] = [];
  for (const w of wheres) {
    const c = col(table, w.field);
    const tokens = (x: string) => resolveToken(x, today);
    const v = Array.isArray(w.value) ? w.value.map(tokens) : w.value !== undefined ? tokens(w.value) : undefined;
    switch (w.op) {
      case "eq": out.push(eq(c, cast(c, v as string, "eq"))); break;
      case "ne": out.push(ne(c, cast(c, v as string, "ne"))); break;
      case "in": out.push(inArray(c, v as string[])); break;
      case "nin": out.push(notInArray(c, v as string[])); break;
      case "lt": out.push(lt(c, cast(c, v as string, "lt"))); break;
      case "lte": out.push(lte(c, cast(c, v as string, "lte"))); break;
      case "gt": out.push(gt(c, cast(c, v as string, "gt"))); break;
      case "gte": out.push(gte(c, cast(c, v as string, "gte"))); break;
      case "notnull": out.push(isNotNull(c)); break;
      case "isnull": out.push(isNull(c)); break;
    }
  }
  return out;
}

export interface ListOpts {
  preset?: string;
  where?: Where[];
  from?: string;
  to?: string;
  dateField?: string;
  client?: string;
  status?: string;
  category?: string;
  department?: string;
  q?: string;
  sort?: { field: string; dir: "asc" | "desc" };
  limit?: number;
  files?: boolean;
}

export async function listRows(def: ResourceDef, opts: ListOpts = {}): Promise<Row[]> {
  const today = await getToday();
  const t = tableOf(def);
  const conds: SQL[] = [];

  if (def.fixed) for (const [k, v] of Object.entries(def.fixed)) conds.push(eq(col(t, k), v));
  if (opts.preset) {
    const p = def.presets?.[opts.preset];
    if (!p) throw new AppError(400, "Unknown preset");
    conds.push(...buildWhere(t, p, today));
  }
  if (opts.where) conds.push(...buildWhere(t, opts.where, today));

  const dateField = opts.dateField ?? def.dateField;
  if (dateField && (opts.from || opts.to)) {
    const c = col(t, dateField);
    if (opts.from) conds.push(gte(c, cast(c, opts.from, "gte")));
    if (opts.to) conds.push(lte(c, cast(c, opts.to, "lte")));
  }
  if (opts.client && def.clientField) conds.push(eq(col(t, def.clientField), Number(opts.client)));
  if (opts.status && def.statusField) {
    if (opts.status === "overdue" && def.overdue) {
      conds.push(...buildWhere(t, [{ field: def.overdue.field, op: "lt", value: "$today" }, { field: def.statusField, op: "nin", value: def.overdue.done }], today));
    } else conds.push(eq(col(t, def.statusField), opts.status));
  }
  if (opts.category && def.categoryField) conds.push(eq(col(t, def.categoryField), opts.category));
  if (opts.department) {
    if (def.departmentField) conds.push(eq(col(t, def.departmentField), opts.department));
    else if (def.assigneeField) {
      conds.push(inArray(col(t, def.assigneeField), db.select({ id: S.users.id }).from(S.users).where(eq(S.users.department, opts.department))));
    }
  }
  if (opts.q && opts.q.trim()) {
    const like = `%${opts.q.trim().replace(/[%_]/g, "\\$&")}%`;
    const ors: (SQL | undefined)[] = def.searchFields.map((f) => ilike(sql`${col(t, f)}::text`, like));
    if (def.clientField) {
      ors.push(inArray(col(t, def.clientField), db.select({ id: S.clients.id }).from(S.clients).where(or(ilike(S.clients.name, like), ilike(S.clients.companyName, like)))));
    }
    conds.push(or(...ors.filter(Boolean) as SQL[]) as SQL);
  }

  const sort = opts.sort ?? def.sort;
  const sc = col(t, sort.field);
  let rows: Row[] = await db
    .select()
    .from(t)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(sort.dir === "asc" ? asc(sc) : desc(sc), desc(t.id ?? sc))
    .limit(Math.min(opts.limit ?? 5000, 10000));

  rows = await decorate(def, rows, today, opts.files ?? false);
  return rows;
}

export async function getRow(def: ResourceDef, id: number): Promise<Row> {
  const t = tableOf(def);
  const conds = [eq(t.id, id)];
  if (def.fixed) for (const [k, v] of Object.entries(def.fixed)) conds.push(eq(col(t, k), v));
  const rows: Row[] = await db.select().from(t).where(and(...conds)).limit(1);
  if (!rows[0]) throw new AppError(404, "Record not found");
  const today = await getToday();
  return (await decorate(def, rows, today, true))[0];
}

/* Adds ref labels, computed columns and overdue flags */
async function decorate(def: ResourceDef, rows: Row[], today: string, files: boolean): Promise<Row[]> {
  if (!rows.length) return rows;

  for (const f of def.fields) {
    if (f.type === "ref" && f.ref) {
      const src = REF_SOURCES[f.ref];
      const ids = [...new Set(rows.map((r) => r[f.name]).filter((x) => x != null))] as number[];
      const map = new Map<number, string>();
      if (ids.length && src) {
        const found: Row[] = await db.select().from(src.table).where(inArray(src.table.id, ids));
        for (const r of found) map.set(r.id, src.label(r));
      }
      for (const r of rows) r[`${f.name}__label`] = r[f.name] != null ? map.get(r[f.name]) ?? `#${r[f.name]}` : "";
    }
    if (f.type === "files" && !files) {
      for (const r of rows) r[f.name] = Array.isArray(r[f.name]) ? r[f.name].map((a: any) => ({ name: a.name, size: a.size, type: a.type, dataUrl: "" })) : [];
    }
  }

  if (def.overdue) {
    const { field, done } = def.overdue;
    const sf = def.statusField ?? "status";
    for (const r of rows) r._overdue = !!r[field] && String(r[field]) < today && !done.includes(r[sf]);
  }

  if (def.table === "campaigns") {
    for (const r of rows) {
      r.costPerLead = r.leads > 0 ? Math.round((r.spent / r.leads) * 100) / 100 : 0;
      r.budgetUsed = r.budget > 0 ? Math.round((r.spent / r.budget) * 100) : 0;
    }
  }
  if (def.table === "warranties") {
    for (const r of rows) if (r.status === "active" && r.warrantyExpiry < today) r.status = "expired";
  }
  if (def.table === "invoices") {
    const ids = rows.map((r) => r.id as number);
    const sums: Row[] = await db
      .select({ invoiceId: S.payments.invoiceId, total: sql<number>`coalesce(sum(${S.payments.amount}),0)::float` })
      .from(S.payments)
      .where(and(inArray(S.payments.invoiceId, ids), eq(S.payments.direction, "received")))
      .groupBy(S.payments.invoiceId);
    const m = new Map(sums.map((s) => [s.invoiceId as number, Number(s.total)]));
    for (const r of rows) {
      const paid = m.get(r.id) ?? 0;
      r.paidAmount = paid;
      if (r.status === "cancelled" || r.status === "draft") {
        r.balance = 0;
        r.paymentStatus = "";
      } else {
        r.balance = Math.round((r.total - paid) * 100) / 100;
        r.paymentStatus = r.balance <= 0.005 ? "paid" : paid > 0 ? (r.dueDate && r.dueDate < today ? "overdue" : "partial") : r.dueDate && r.dueDate < today ? "overdue" : "unpaid";
      }
    }
  }
  return rows;
}

/* ───────── write hooks ───────── */

const NUMBERED: Record<string, { field: string; prefix: string }> = {
  it_tickets: { field: "ticketNo", prefix: "TICK" },
  invoices: { field: "invoiceNo", prefix: "INV" },
  purchases: { field: "purchaseNo", prefix: "PUR" },
  payments: { field: "paymentNo", prefix: "PAY" },
  service_orders: { field: "orderNo", prefix: "WO" },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

async function receivedFor(tx: any, invoiceId: number, excludeId?: number): Promise<number> {
  const conds = [eq(S.payments.invoiceId, invoiceId), eq(S.payments.direction, "received")];
  if (excludeId) conds.push(ne(S.payments.id, excludeId));
  const [r] = await tx.select({ s: sql<number>`coalesce(sum(${S.payments.amount}),0)::float` }).from(S.payments).where(and(...conds));
  return Number(r?.s ?? 0);
}

async function prepare(tx: any, def: ResourceDef, data: Row, existing: Row | null, today: string) {
  const merged = { ...(existing ?? {}), ...data };

  // Resolve manual client name entry, prevent duplicates, and keep related records consistent
  if (data.clientId !== undefined && data.clientId !== null) {
    let cid: number | null = null;
    const raw = String(data.clientId).trim();

    if (/^\d+$/.test(raw)) {
      const numId = Number(raw);
      const [foundById] = await tx
        .select({ id: S.clients.id })
        .from(S.clients)
        .where(eq(S.clients.id, numId))
        .limit(1);
      if (foundById) cid = foundById.id;
    }

    if (!cid && raw) {
      const cleanName = raw.includes(" — ") ? raw.split(" — ")[0].trim() : raw;
      const [existingClient] = await tx
        .select({ id: S.clients.id })
        .from(S.clients)
        .where(
          or(
            ilike(S.clients.name, raw),
            ilike(S.clients.name, cleanName),
            ilike(S.clients.companyName, raw),
            ilike(S.clients.companyName, cleanName)
          )
        )
        .limit(1);

      if (existingClient) {
        cid = existingClient.id;
      } else {
        const [newClient] = await tx
          .insert(S.clients)
          .values({
            name: cleanName,
            category: "Potential",
            registrationDate: today,
          })
          .returning({ id: S.clients.id });
        cid = newClient.id;
      }
    }

    if (cid) {
      data.clientId = cid;
    }
  }

  if (def.completeAction) {
    const { status, dateField } = def.completeAction;
    const sf = def.statusField ?? "status";
    if (dateField && merged[sf] === status && !merged[dateField]) data[dateField] = today;
  }

  switch (def.table) {
    case "invoices": {
      const total = r2(Number(merged.subtotal ?? 0) + Number(merged.tax ?? 0));
      data.total = total;
      if (existing) {
        const paid = await receivedFor(tx, existing.id);
        if (merged.status === "cancelled" && paid > 0) throw new AppError(400, "An invoice with recorded payments cannot be cancelled. Remove the payments first.");
        if (total + 0.005 < paid) throw new AppError(400, `Invoice total cannot be lower than the amount already received (${paid.toFixed(2)})`);
      }
      if (merged.dueDate && merged.issueDate && merged.dueDate < merged.issueDate) throw new AppError(400, "Due date cannot be before the issue date");
      break;
    }
    case "payments": {
      if (merged.direction === "received") {
        if (merged.invoiceId) {
          const [inv] = await tx.select().from(S.invoices).where(eq(S.invoices.id, merged.invoiceId)).limit(1);
          if (!inv) throw new AppError(400, "Invoice not found");
          if (inv.status !== "issued") throw new AppError(400, "Payments can only be recorded against issued invoices");
          data.clientId = inv.clientId;
          const outstanding = inv.total - (await receivedFor(tx, inv.id, existing?.id));
          if (Number(merged.amount) > outstanding + 0.005) throw new AppError(400, `Amount exceeds the outstanding invoice balance (${outstanding.toFixed(2)})`);
        } else if (!merged.clientId) throw new AppError(400, "Select a customer or an invoice for a received payment");
      } else {
        if (!merged.party) throw new AppError(400, "Supplier / party is required for a paid payment");
        data.invoiceId = null;
        data.clientId = null;
      }
      break;
    }
    case "ledger_entries": {
      if (existing?.refType) throw new AppError(400, "System-posted ledger entries cannot be edited. Edit the source transaction instead.");
      const dr = Number(merged.debit ?? 0), cr = Number(merged.credit ?? 0);
      if ((dr > 0) === (cr > 0)) throw new AppError(400, "Enter either a debit or a credit amount (not both, not neither)");
      break;
    }
    case "social_posts":
      if (merged.status === "published" && !merged.publishedDate) data.publishedDate = today;
      break;
    case "devices":
      break;
  }
}

async function postLedger(tx: any, table: string, row: Row) {
  const type = table;
  await tx.delete(S.ledgerEntries).where(and(eq(S.ledgerEntries.refType, type), eq(S.ledgerEntries.refId, row.id)));
  const e: { entryDate: string; account: string; description: string; debit: number; credit: number }[] = [];
  switch (table) {
    case "invoices":
      if (row.status === "issued") {
        e.push({ entryDate: row.issueDate, account: "Accounts Receivable", description: `Invoice ${row.invoiceNo}`, debit: row.total, credit: 0 });
        e.push({ entryDate: row.issueDate, account: "Sales Revenue", description: `Invoice ${row.invoiceNo}`, debit: 0, credit: row.subtotal });
        if (row.tax > 0) e.push({ entryDate: row.issueDate, account: "Tax Payable", description: `Invoice ${row.invoiceNo}`, debit: 0, credit: row.tax });
      }
      break;
    case "purchases":
      if (row.status !== "cancelled") {
        e.push({ entryDate: row.purchaseDate, account: "Purchases", description: `${row.purchaseNo} — ${row.supplier}`, debit: row.amount, credit: 0 });
        e.push({ entryDate: row.purchaseDate, account: "Accounts Payable", description: `${row.purchaseNo} — ${row.supplier}`, debit: 0, credit: row.amount });
      }
      break;
    case "payments":
      if (row.direction === "received") {
        e.push({ entryDate: row.paymentDate, account: "Cash & Bank", description: `Receipt ${row.paymentNo}`, debit: row.amount, credit: 0 });
        e.push({ entryDate: row.paymentDate, account: "Accounts Receivable", description: `Receipt ${row.paymentNo}`, debit: 0, credit: row.amount });
      } else {
        e.push({ entryDate: row.paymentDate, account: "Accounts Payable", description: `Payment ${row.paymentNo} — ${row.party}`, debit: row.amount, credit: 0 });
        e.push({ entryDate: row.paymentDate, account: "Cash & Bank", description: `Payment ${row.paymentNo} — ${row.party}`, debit: 0, credit: row.amount });
      }
      break;
    case "expenses":
      e.push({ entryDate: row.expenseDate, account: `Expense: ${row.category}`, description: row.payee ?? "Expense", debit: row.amount, credit: 0 });
      e.push({ entryDate: row.expenseDate, account: "Cash & Bank", description: row.payee ?? "Expense", debit: 0, credit: row.amount });
      break;
    case "incomes":
      e.push({ entryDate: row.incomeDate, account: "Cash & Bank", description: row.source ?? "Income", debit: row.amount, credit: 0 });
      e.push({ entryDate: row.incomeDate, account: `Income: ${row.category}`, description: row.source ?? "Income", debit: 0, credit: row.amount });
      break;
  }
  if (e.length) await tx.insert(S.ledgerEntries).values(e.map((x) => ({ ...x, refType: type, refId: row.id })));
}

const LEDGER_TABLES = new Set(["invoices", "purchases", "payments", "expenses", "incomes"]);

function pickData(def: ResourceDef, parsed: Row): Row {
  const out: Row = {};
  const allowed = new Set(formFields(def).map((f) => f.name));
  for (const [k, v] of Object.entries(parsed)) if (allowed.has(k) && v !== undefined) out[k] = v;
  return out;
}

export async function createRow(def: ResourceDef, body: unknown): Promise<Row> {
  if (def.readOnly || def.noCreate) throw new AppError(405, "Creating records is not allowed here");
  const parsed = buildSchema(def).parse(body) as Row;
  const data = pickData(def, parsed);
  if (def.fixed) Object.assign(data, def.fixed);
  const today = await getToday();
  const t = tableOf(def);
  const num = NUMBERED[def.table];

  const id = await db.transaction(async (tx: any) => {
    await prepare(tx, def, data, null, today);
    if (num && !data[num.field]) data[num.field] = `TMP-${Math.random().toString(36).slice(2, 10)}`;
    const [row] = await tx.insert(t).values(data).returning();
    let final: Row = row;
    if (num && String(row[num.field]).startsWith("TMP-")) {
      const code = `${num.prefix}-${today.slice(0, 4)}-${String(row.id).padStart(4, "0")}`;
      [final] = await tx.update(t).set({ [num.field]: code }).where(eq(t.id, row.id)).returning();
    }
    if (LEDGER_TABLES.has(def.table)) await postLedger(tx, def.table, final);
    return final.id as number;
  });
  return getRow(def, id);
}

export async function updateRow(def: ResourceDef, id: number, body: unknown): Promise<Row> {
  if (def.readOnly) throw new AppError(405, "This record is read-only");
  const parsed = buildSchema(def, true).parse(body) as Row;
  const data = pickData(def, parsed);
  const num = NUMBERED[def.table];
  if (num && !data[num.field]) delete data[num.field];
  const today = await getToday();
  const t = tableOf(def);

  await db.transaction(async (tx: any) => {
    const conds = [eq(t.id, id)];
    if (def.fixed) for (const [k, v] of Object.entries(def.fixed)) conds.push(eq(col(t, k), v));
    const [existing] = await tx.select().from(t).where(and(...conds)).limit(1);
    if (!existing) throw new AppError(404, "Record not found");
    await prepare(tx, def, data, existing, today);
    const set: Row = { ...data };
    if ("updatedAt" in t) set.updatedAt = new Date();
    const [row] = await tx.update(t).set(set).where(eq(t.id, id)).returning();
    if (LEDGER_TABLES.has(def.table)) await postLedger(tx, def.table, row);
  });
  return getRow(def, id);
}

export async function deleteRow(def: ResourceDef, id: number): Promise<Row> {
  if (def.readOnly || def.noDelete) throw new AppError(405, "Deleting is not allowed for this record type");
  const t = tableOf(def);
  return db.transaction(async (tx: any) => {
    const conds = [eq(t.id, id)];
    if (def.fixed) for (const [k, v] of Object.entries(def.fixed)) conds.push(eq(col(t, k), v));
    const [existing] = await tx.select().from(t).where(and(...conds)).limit(1);
    if (!existing) throw new AppError(404, "Record not found");
    if (def.table === "ledger_entries" && existing.refType) throw new AppError(400, "System-posted ledger entries cannot be deleted. Delete or edit the source transaction instead.");
    if (LEDGER_TABLES.has(def.table)) await tx.delete(S.ledgerEntries).where(and(eq(S.ledgerEntries.refType, def.table), eq(S.ledgerEntries.refId, id)));
    await tx.delete(t).where(eq(t.id, id));
    return existing;
  });
}

export function recordTitle(def: ResourceDef, row: Row): string {
  return String(row[def.titleField] ?? row.id ?? "");
}
