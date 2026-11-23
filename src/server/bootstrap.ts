import { count } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabaseSchema } from "@/db/auto-migrate";
import { accounts, departments, rolePermissions, settings, users } from "@/db/schema";
import { ACTIONS, DEFAULT_PERMISSIONS, DEPTS, DEPT_ORDER, SETTINGS_DEFAULTS } from "@/lib/constants";
import { hashPassword } from "./password";

let started: Promise<void> | null = null;

/** Idempotent: creates reference data (departments, role permissions, settings) and the first Super Admin. Not demo data. */
export function ensureBootstrap(): Promise<void> {
  if (!started) {
    started = run().catch((e) => {
      started = null;
      throw e;
    });
  }
  return started;
}

async function run() {
  await ensureDatabaseSchema();

  const [{ n: deptCount }] = await db.select({ n: count() }).from(departments);
  if (deptCount === 0) {
    await db.insert(departments).values(
      DEPT_ORDER.map((c) => ({ code: c, name: DEPTS[c].name, description: DEPTS[c].description })),
    );
  }

  const [{ n: permCount }] = await db.select({ n: count() }).from(rolePermissions);
  if (permCount === 0) {
    const rows = [];
    for (const role of ["administrator", "manager", "staff", "readonly"] as const) {
      for (const mod of DEPT_ORDER) {
        const base = { ...DEFAULT_PERMISSIONS[role] };
        if (mod === "admin") {
          if (role === "administrator") base.delete = false;
          else for (const a of ACTIONS) base[a] = false;
        }
        rows.push({ role, module: mod, canView: base.view, canCreate: base.create, canEdit: base.edit, canDelete: base.delete, canExport: base.export });
      }
    }
    await db.insert(rolePermissions).values(rows);
  }

  const existing = new Set((await db.select({ key: settings.key }).from(settings)).map((r) => r.key));
  const missing = Object.entries(SETTINGS_DEFAULTS).filter(([k]) => !existing.has(k));
  if (missing.length) await db.insert(settings).values(missing.map(([key, value]) => ({ key, value }))).onConflictDoNothing();

  const [{ n: userCount }] = await db.select({ n: count() }).from(users);
  if (userCount === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "Admin@12345";
    await db.insert(users).values({
      username,
      email: process.env.ADMIN_EMAIL || "admin@epiups.local",
      name: "Super Administrator",
      passwordHash: await hashPassword(password),
      role: "super_admin",
      department: "admin",
    });
  }

  try {
    const [{ n: accCount }] = await db.select({ n: count() }).from(accounts);
    if (accCount === 0) {
      const defaultAccounts = [
        { code: "1001", name: "Cash on Hand", type: "Asset", category: "Cash and Cash Equivalents", isSystem: true },
        { code: "1002", name: "Bank Account (Main)", type: "Asset", category: "Bank Accounts", isSystem: true },
        { code: "1003", name: "Accounts Receivable", type: "Asset", category: "Current Assets", isSystem: true },
        { code: "1004", name: "Merchandise Inventory", type: "Asset", category: "Current Assets", isSystem: true },
        { code: "1501", name: "Fixed Assets - Equipment", type: "Asset", category: "Non-Current Assets", isSystem: true },
        { code: "2001", name: "Accounts Payable", type: "Liability", category: "Current Liabilities", isSystem: true },
        { code: "2002", name: "VAT Payable (Mushak)", type: "Liability", category: "Current Liabilities", isSystem: true },
        { code: "2003", name: "Salaries & Wages Payable", type: "Liability", category: "Current Liabilities", isSystem: true },
        { code: "3001", name: "Owner's Capital", type: "Equity", category: "Equity", isSystem: true },
        { code: "3002", name: "Retained Earnings", type: "Equity", category: "Equity", isSystem: true },
        { code: "4001", name: "Sales Revenue - UPS Systems", type: "Income", category: "Operating Revenue", isSystem: true },
        { code: "4002", name: "Service & Maintenance Income", type: "Income", category: "Service Revenue", isSystem: true },
        { code: "4003", name: "Other Income & Scrap Sales", type: "Income", category: "Other Income", isSystem: true },
        { code: "5001", name: "Cost of Goods Sold (Purchases)", type: "Expense", category: "Direct Costs", isSystem: true },
        { code: "5002", name: "Office Rent", type: "Expense", category: "Administrative Expenses", isSystem: true },
        { code: "5003", name: "Utilities (Electricity, Water, Internet)", type: "Expense", category: "Operating Expenses", isSystem: true },
        { code: "5004", name: "Salaries & Allowances", type: "Expense", category: "Operating Expenses", isSystem: true },
        { code: "5005", name: "Travel & Conveyance", type: "Expense", category: "Operating Expenses", isSystem: true },
        { code: "5006", name: "Marketing & Advertising", type: "Expense", category: "Operating Expenses", isSystem: true },
        { code: "5007", name: "Depreciation Expense", type: "Expense", category: "Operating Expenses", isSystem: true },
      ];
      await db.insert(accounts).values(defaultAccounts).onConflictDoNothing();
    }
  } catch (err) {
    console.warn("[Bootstrap] Notice seeding default accounts:", (err as Error).message);
  }
}
