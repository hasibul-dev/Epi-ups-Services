import { db } from "@/db";
import { departments, rolePermissions } from "@/db/schema";
import { DEPT_ORDER, type Action, type DeptCode, type RoleCode } from "@/lib/constants";
import type { ResourceDef } from "@/lib/resource-config";
import { AppError } from "./api";

export interface PermRow { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean }

interface Matrix { perms: Map<string, PermRow>; deptActive: Map<string, boolean>; at: number }
let cache: Matrix | null = null;

export function invalidatePerms() {
  cache = null;
}

async function matrix(): Promise<Matrix> {
  if (cache && Date.now() - cache.at < 5000) return cache;
  const [rows, depts] = await Promise.all([db.select().from(rolePermissions), db.select().from(departments)]);
  const perms = new Map<string, PermRow>();
  for (const r of rows) {
    perms.set(`${r.role}:${r.module}`, { view: r.canView, create: r.canCreate, edit: r.canEdit, delete: r.canDelete, export: r.canExport });
  }
  const deptActive = new Map<string, boolean>();
  for (const d of depts) deptActive.set(d.code, d.active);
  cache = { perms, deptActive, at: Date.now() };
  return cache;
}

type U = { role: RoleCode | string; department: string };

export async function can(user: U, module: string, action: Action): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const m = await matrix();
  if (m.deptActive.get(module) === false) return false;
  if (user.role !== "administrator" && user.department !== module) return false;
  const row = m.perms.get(`${user.role}:${module}`);
  return !!row && row[action];
}

export async function accessibleModules(user: U): Promise<DeptCode[]> {
  const out: DeptCode[] = [];
  for (const d of DEPT_ORDER) if (await can(user, d, "view")) out.push(d);
  return out;
}

export async function assertCan(user: U, module: string, action: Action) {
  if (!(await can(user, module, action))) throw new AppError(403, "You do not have permission to perform this action");
}

export async function canResource(user: U, def: ResourceDef, action: Action): Promise<boolean> {
  for (const m of def.modules) if (await can(user, m, action)) return true;
  return false;
}

export async function assertResource(user: U, def: ResourceDef, action: Action) {
  if (!(await canResource(user, def, action))) throw new AppError(403, "You do not have permission to perform this action");
}

export function isAdminRole(user: U) {
  return user.role === "super_admin" || user.role === "administrator";
}

export function assertSuperAdmin(user: U) {
  if (user.role !== "super_admin") throw new AppError(403, "Only the Super Administrator can perform this action");
}
