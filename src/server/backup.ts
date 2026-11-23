/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "crypto";
import { desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { AppError } from "./api";
import { getSettings } from "./settings";

/** Tables included in a backup, in foreign-key-safe insert order. */
const BACKUP_TABLES: [string, any][] = [
  ["departments", S.departments], ["users", S.users], ["role_permissions", S.rolePermissions], ["settings", S.settings],
  ["clients", S.clients], ["sales_work", S.salesWork], ["follow_ups", S.followUps], ["service_orders", S.serviceOrders], ["warranties", S.warranties],
  ["campaigns", S.campaigns], ["marketing_tasks", S.marketingTasks], ["social_posts", S.socialPosts],
  ["devices", S.devices], ["it_tickets", S.itTickets], ["it_tasks", S.itTasks],
  ["invoices", S.invoices], ["purchases", S.purchases], ["payments", S.payments], ["expenses", S.expenses], ["incomes", S.incomes], ["ledger_entries", S.ledgerEntries],
  ["audit_logs", S.auditLogs],
];
export const BACKUP_TABLE_NAMES = BACKUP_TABLES.map(([n]) => n);
const FORMAT = "epi-ups-backup";

export interface BackupFile { format: string; version: 1; createdAt: string; tables: Record<string, any[]>; counts: Record<string, number> }

const checksumOf = (payload: string) => createHash("sha256").update(payload).digest("hex");

export async function buildBackup(): Promise<{ payload: string; counts: Record<string, number> }> {
  const tables: Record<string, any[]> = {};
  const counts: Record<string, number> = {};
  for (const [name, table] of BACKUP_TABLES) {
    const rows = await db.select().from(table);
    tables[name] = rows;
    counts[name] = rows.length;
  }
  const file: BackupFile = { format: FORMAT, version: 1, createdAt: new Date().toISOString(), tables, counts };
  return { payload: JSON.stringify(file), counts };
}

export async function createBackup(kind: string, createdBy: string, name?: string) {
  const { payload, counts } = await buildBackup();
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const [row] = await db
    .insert(S.backups)
    .values({ name: name || `epi-backup-${stamp}`, kind, sizeBytes: Buffer.byteLength(payload), checksum: checksumOf(payload), tableCounts: counts, payload, createdBy })
    .returning({ id: S.backups.id, name: S.backups.name, kind: S.backups.kind, sizeBytes: S.backups.sizeBytes, checksum: S.backups.checksum, tableCounts: S.backups.tableCounts, createdAt: S.backups.createdAt, createdBy: S.backups.createdBy });
  // retention
  const keep = parseInt((await getSettings())["backup.retention"] || "20", 10);
  const all = await db.select({ id: S.backups.id }).from(S.backups).orderBy(desc(S.backups.createdAt));
  if (all.length > keep) await db.delete(S.backups).where(inArray(S.backups.id, all.slice(keep).map((x) => x.id)));
  return row;
}

export async function listBackups() {
  return db
    .select({ id: S.backups.id, name: S.backups.name, kind: S.backups.kind, sizeBytes: S.backups.sizeBytes, checksum: S.backups.checksum, tableCounts: S.backups.tableCounts, createdAt: S.backups.createdAt, createdBy: S.backups.createdBy })
    .from(S.backups)
    .orderBy(desc(S.backups.createdAt));
}

export async function getBackupPayload(id: number) {
  const [b] = await db.select().from(S.backups).where(eq(S.backups.id, id)).limit(1);
  if (!b) throw new AppError(404, "Backup not found");
  return b;
}

/** Validates structure and returns parsed file + summary. Throws AppError(400) when invalid. */
export function validateBackup(payload: string, expectedChecksum?: string): BackupFile {
  if (expectedChecksum && checksumOf(payload) !== expectedChecksum) throw new AppError(400, "Backup integrity check failed: checksum mismatch");
  let file: BackupFile;
  try {
    file = JSON.parse(payload);
  } catch {
    throw new AppError(400, "Backup file is not valid JSON");
  }
  if (!file || file.format !== FORMAT || file.version !== 1 || typeof file.tables !== "object") throw new AppError(400, "This is not a valid EPI UPS backup file");
  for (const [name, table] of BACKUP_TABLES) {
    const rows = file.tables[name];
    if (!Array.isArray(rows)) throw new AppError(400, `Backup is missing table "${name}"`);
    const cols = Object.keys(getTableColumns(table));
    for (const r of rows.slice(0, 50)) {
      for (const k of Object.keys(r)) if (!cols.includes(k)) throw new AppError(400, `Unexpected column "${k}" in table "${name}" — backup is from an incompatible version`);
    }
  }
  const users = file.tables["users"];
  if (!users.some((u: any) => u.role === "super_admin" && u.active)) throw new AppError(400, "Backup must contain at least one active Super Administrator");
  file.counts = Object.fromEntries(BACKUP_TABLES.map(([n]) => [n, file.tables[n].length]));
  return file;
}

function revive(table: any, row: any) {
  const cols = getTableColumns(table) as Record<string, any>;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    const c = cols[k];
    out[k] = c && c.dataType === "date" && typeof v === "string" ? new Date(v) : v;
  }
  return out;
}

/** Replaces ALL application data with the content of the backup. Caller must have confirmed. */
export async function restoreBackup(file: BackupFile) {
  await db.transaction(async (tx: any) => {
    const names = BACKUP_TABLES.map(([n]) => `"${n}"`).join(", ");
    await tx.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`));
    for (const [name, table] of BACKUP_TABLES) {
      const rows = file.tables[name];
      for (let i = 0; i < rows.length; i += 200) {
        await tx.insert(table).values(rows.slice(i, i + 200).map((r: any) => revive(table, r)));
      }
      if ("id" in getTableColumns(table)) {
        await tx.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('"${name}"','id'), GREATEST(COALESCE((SELECT MAX(id) FROM "${name}"),0),1), (SELECT COUNT(*) FROM "${name}") > 0)`));
      }
    }
  });
}
