import { db } from "@/db";
import { settings } from "@/db/schema";
import { SETTINGS_DEFAULTS } from "@/lib/constants";
import { todayStr } from "@/lib/utils";
import { sql } from "drizzle-orm";

let cache: { at: number; data: Record<string, string> } | null = null;

export async function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 3000) return cache.data;
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await db.select({ key: settings.key, value: settings.value }).from(settings);
  } catch {
    rows = [];
  }
  const data = { ...SETTINGS_DEFAULTS };
  for (const r of rows) data[r.key] = r.value;
  cache = { at: Date.now(), data };
  return data;
}

export async function saveSettings(updates: Record<string, string>) {
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in SETTINGS_DEFAULTS)) continue;
    await db
      .insert(settings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value), updatedAt: sql`now()` } });
  }
  cache = null;
}

export async function getToday(): Promise<string> {
  const s = await getSettings();
  return todayStr(s["format.timezone"]);
}
