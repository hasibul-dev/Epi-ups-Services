import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const DEFAULT_TZ = "Asia/Dhaka";

/** YYYY-MM-DD for "today" in the given timezone. */
export function todayStr(tz: string = DEFAULT_TZ): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** Resolves tokens such as $today, $today+7, $today-30, $monthStart, $monthEnd. */
export function resolveToken(value: string, today: string): string {
  if (!value.startsWith("$")) return value;
  if (value === "$monthStart") return `${today.slice(0, 7)}-01`;
  if (value === "$monthEnd") return monthRange(today.slice(0, 7)).to;
  const m = /^\$today([+-]\d+)?$/.exec(value);
  if (m) return m[1] ? addDays(today, parseInt(m[1], 10)) : today;
  return value;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value: string | Date | null | undefined, fmt = "DD MMM YYYY"): string {
  if (!value) return "—";
  const s = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return String(value);
  return fmt
    .replace("YYYY", y)
    .replace("MMM", MONTHS[parseInt(m, 10) - 1] ?? m)
    .replace("MM", m)
    .replace("DD", d);
}

export function formatDateTime(value: string | Date | null | undefined, tz = DEFAULT_TZ, fmt = "DD MMM YYYY"): string {
  if (!value) return "—";
  const dt = typeof value === "string" ? new Date(value) : value;
  if (isNaN(dt.getTime())) return "—";
  const ds = todayStrFor(dt, tz);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(dt);
  return `${formatDate(ds, fmt)} ${time}`;
}

function todayStrFor(dt: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(dt);
  } catch {
    return dt.toISOString().slice(0, 10);
  }
}

export function formatMoney(n: number | string | null | undefined, symbol = "৳"): string {
  const v = Number(n ?? 0);
  return `${symbol}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function slugToTitle(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
