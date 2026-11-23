import { count } from "drizzle-orm";
import { db } from "@/db";
import { departments, rolePermissions, settings, users } from "@/db/schema";
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
}
