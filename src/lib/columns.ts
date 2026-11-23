import type { FieldDef, FieldType, Option } from "./resource-config";
import { fieldOptions } from "./resource-config";
import { formatDate, formatDateTime, formatMoney } from "./utils";

export interface Col {
  key: string;
  label: string;
  type: FieldType | "text";
  options?: Option[];
  optionsKey?: string;
  ref?: boolean;
  sum?: boolean;
}

export function colsFromFields(fields: FieldDef[]): Col[] {
  return fields.map((f) => ({
    key: f.name,
    label: f.label,
    type: f.type,
    options: f.options,
    optionsKey: f.optionsKey,
    ref: f.type === "ref",
    sum: f.type === "money" || f.sum || undefined,
  }));
}

export interface FormatCtx { settings: Record<string, string> }

/** Plain-text value used for tables, print, PDF and Excel. */
export function cellText(col: Col, row: Record<string, unknown>, ctx: FormatCtx): string {
  const raw = row[col.key];
  if (col.ref) return String(row[`${col.key}__label`] ?? "") || "—";
  if (raw === null || raw === undefined || raw === "") return "—";
  const fmt = ctx.settings["format.date"] || "DD MMM YYYY";
  switch (col.type) {
    case "date": return formatDate(String(raw), fmt);
    case "datetime": return formatDateTime(raw as string, ctx.settings["format.timezone"], fmt);
    case "money": return formatMoney(raw as number, ctx.settings["format.currency"] || "৳");
    case "number": return Number(raw).toLocaleString("en-US");
    case "boolean": return raw ? "Yes" : "No";
    case "files": return Array.isArray(raw) ? (raw.length ? `${raw.length} file(s)` : "—") : "—";
    case "select": {
      const label = fieldOptions({ name: col.key, label: col.label, type: "select", options: col.options, optionsKey: col.optionsKey }, ctx.settings).find((o) => o.value === String(raw))?.label;
      return label ?? String(raw).replace(/_/g, " ");
    }
    default:
      return String(raw);
  }
}

export function colNumeric(col: Col, row: Record<string, unknown>): number {
  const v = Number(row[col.key] ?? 0);
  return isNaN(v) ? 0 : v;
}

export function totalsFor(cols: Col[], rows: Record<string, unknown>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cols) if (c.sum) out[c.key] = rows.reduce((a, r) => a + colNumeric(c, r), 0);
  return out;
}
