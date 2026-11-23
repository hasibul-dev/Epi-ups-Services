"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Download, Eye, FileSpreadsheet, FileText, Pencil, Printer, Search, Trash2, X } from "lucide-react";
import { cellText, totalsFor, type Col } from "@/lib/columns";
import { fieldOptions, type Option } from "@/lib/resource-config";
import { exportExcel, exportPdf, type ExportSpec } from "@/lib/export";
import { DEPTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useApp, useToast } from "./AppContext";
import { PrintSheet } from "./PrintSheet";
import { Badge, Button, EmptyState, ErrorState, Input, Select, Spinner, autoTone } from "./ui";

type Row = Record<string, unknown>;

export interface TableMeta {
  department?: string;
  orientation?: "portrait" | "landscape";
  rangeText?: string;
  filtersText?: string;
  summary?: { label: string; value: string }[];
  signatures?: boolean;
}

export interface DataTableProps {
  title: string;
  columns: Col[];
  rows: Row[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  dateField?: string;
  statusKey?: string;
  statusOptions?: Option[];
  categoryKey?: string;
  categoryOptions?: Option[];
  categoryLabel?: string;
  clientKey?: string;
  initialSearch?: string;
  onView?: (row: Row) => void;
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  rowActions?: (row: Row) => ReactNode;
  canExport?: boolean;
  meta?: TableMeta;
  storageKey?: string;
  toolbar?: ReactNode;
  hideFilters?: boolean;
  emptyTitle?: string;
  emptyAction?: ReactNode;
  hideSerial?: boolean;
}

const PAGE_SIZES = [10, 25, 50, 100];

function sortValue(col: Col | undefined, row: Row): string | number {
  if (!col) return "";
  if (col.ref) return String(row[`${col.key}__label`] ?? "").toLowerCase();
  const v = row[col.key];
  if (v == null || v === "") return "";
  if (col.type === "money" || col.type === "number") return Number(v);
  return String(v).toLowerCase();
}

export function DataTable(p: DataTableProps) {
  const { settings, user } = useApp();
  const toast = useToast();
  const ctx = useMemo(() => ({ settings }), [settings]);
  const [q, setQ] = useState(p.initialSearch ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [client, setClient] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<"cols" | "export" | null>(null);
  const [print, setPrint] = useState<{ spec: ExportSpec; auto: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const skey = p.storageKey ? `epi-cols-${p.storageKey}` : null;
  useEffect(() => {
    if (!skey) return;
    try {
      const raw = localStorage.getItem(skey);
      if (raw) setHidden(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, [skey]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (p.initialSearch !== undefined) setQ(p.initialSearch); }, [p.initialSearch]);

  const visibleCols = useMemo(() => p.columns.filter((c) => !hidden.has(c.key)), [p.columns, hidden]);
  const searchIndex = useMemo(() => p.rows.map((r) => p.columns.map((c) => cellText(c, r, ctx)).join(" ").toLowerCase()), [p.rows, p.columns, ctx]);

  const clientOptions = useMemo(() => {
    if (!p.clientKey) return [];
    const m = new Map<string, string>();
    for (const r of p.rows) if (r[p.clientKey] != null) m.set(String(r[p.clientKey]), String(r[`${p.clientKey}__label`] ?? r[p.clientKey]));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [p.rows, p.clientKey]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out: Row[] = [];
    p.rows.forEach((r, i) => {
      if (term && !searchIndex[i].includes(term)) return;
      if (p.dateField && (from || to)) {
        const d = String(r[p.dateField] ?? "").slice(0, 10);
        if (!d || (from && d < from) || (to && d > to)) return;
      }
      if (status && p.statusKey) {
        if (status === "overdue") { if (!r._overdue) return; } else if (String(r[p.statusKey]) !== status) return;
      }
      if (category && p.categoryKey && String(r[p.categoryKey]) !== category) return;
      if (client && p.clientKey && String(r[p.clientKey]) !== client) return;
      out.push(r);
    });
    if (sort) {
      const col = p.columns.find((c) => c.key === sort.key);
      out.sort((a, b) => {
        const x = sortValue(col, a), y = sortValue(col, b);
        if (x === y) return 0;
        if (x === "") return 1;
        if (y === "") return -1;
        const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
        return sort.dir === "asc" ? c : -c;
      });
    }
    return out;
  }, [p.rows, p.columns, p.dateField, p.statusKey, p.categoryKey, p.clientKey, q, from, to, status, category, client, sort, searchIndex]);

  useEffect(() => setPage(1), [q, from, to, status, category, client, pageSize, p.rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const pageRows = filtered.slice((cur - 1) * pageSize, cur * pageSize);
  const totals = useMemo(() => totalsFor(visibleCols, filtered), [visibleCols, filtered]);
  const hasTotals = Object.keys(totals).length > 0;
  const hasFilters = !!(q || from || to || status || category || client);
  const showActions = !!(p.onView || p.onEdit || p.onDelete || p.rowActions);

  const toggleCol = (key: string) => {
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(key)) n.delete(key); else n.add(key);
      if (skey) localStorage.setItem(skey, JSON.stringify([...n]));
      return n;
    });
  };

  const spec = (): ExportSpec => {
    const rangeText = p.meta?.rangeText ?? (from || to ? `${from || "…"} to ${to || "…"}` : "");
    const f: string[] = [];
    if (p.meta?.filtersText) f.push(p.meta.filtersText);
    if (q) f.push(`Search “${q}”`);
    if (status) f.push(`Status: ${status.replace(/_/g, " ")}`);
    if (category) f.push(`${p.categoryLabel ?? "Category"}: ${category.replace(/_/g, " ")}`);
    if (client) f.push(`Client: ${clientOptions.find((c) => c[0] === client)?.[1] ?? client}`);
    return {
      title: p.title,
      department: p.meta?.department ?? "EPI UPS",
      columns: visibleCols,
      rows: filtered,
      settings,
      orientation: p.meta?.orientation ?? ((settings["print.orientation"] as "portrait" | "landscape") || (visibleCols.length > 6 ? "landscape" : "portrait")),
      rangeText,
      filtersText: f.join(" · "),
      summary: p.meta?.summary,
      signatures: p.meta?.signatures,
      generatedBy: user.name,
    };
  };

  const runExport = async (kind: "pdf" | "xlsx") => {
    setMenu(null);
    setBusy(true);
    try {
      if (kind === "pdf") await exportPdf(spec()); else await exportExcel(spec());
      toast.success(kind === "pdf" ? "PDF exported" : "Excel exported");
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  const renderCell = (c: Col, r: Row): ReactNode => {
    const text = cellText(c, r, ctx);
    if (c.type === "select" && r[c.key]) {
      const val = String(r[c.key]);
      if (c.key === p.statusKey && r._overdue) return <Badge tone="red">Overdue</Badge>;
      const opt = fieldOptions({ name: c.key, label: c.label, type: "select", options: c.options, optionsKey: c.optionsKey }, settings).find((o) => o.value === val);
      const isStatusLike = !!opt?.tone || c.options?.some((o) => o.tone);
      if (isStatusLike || c.key === p.statusKey) return <Badge tone={opt?.tone ?? autoTone(val)}>{text}</Badge>;
    }
    if (c.type === "money" || c.type === "number") return <span className="tabular-nums">{text}</span>;
    return <span className="block max-w-[280px] truncate" title={text}>{text}</span>;
  };

  const SortIcon = ({ k }: { k: string }) => sort?.key !== k ? <ArrowUpDown className="h-3.5 w-3.5 opacity-40" /> : sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-accent" /> : <ArrowDown className="h-3.5 w-3.5 text-accent" />;

  return (
    <div className="glass rounded-2xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search records…" className="pl-9" aria-label="Search" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2" ref={menuRef}>
          {p.toolbar}
          <div className="relative">
            <Button onClick={() => setMenu(menu === "cols" ? null : "cols")}><Columns3 className="h-4 w-4" /> Columns</Button>
            {menu === "cols" && (
              <div className="anim-fade absolute right-0 z-30 mt-2 max-h-80 w-56 overflow-auto rounded-xl border border-line bg-solid p-2 shadow-xl scroll-thin">
                {p.columns.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-fg/8">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={!hidden.has(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          {p.canExport !== false && (
            <div className="relative">
              <Button loading={busy} onClick={() => setMenu(menu === "export" ? null : "export")}><Download className="h-4 w-4" /> Export</Button>
              {menu === "export" && (
                <div className="anim-fade absolute right-0 z-30 mt-2 w-52 rounded-xl border border-line bg-solid p-1.5 shadow-xl">
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8" onClick={() => runExport("pdf")}><FileText className="h-4 w-4 text-red-500" /> Export PDF</button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8" onClick={() => runExport("xlsx")}><FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Excel</button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8" onClick={() => { setMenu(null); setPrint({ spec: spec(), auto: false }); }}><Eye className="h-4 w-4 text-sky-500" /> Print Preview</button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8" onClick={() => { setMenu(null); setPrint({ spec: spec(), auto: true }); }}><Printer className="h-4 w-4 text-violet-500" /> Print</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {!p.hideFilters && (p.dateField || p.statusOptions?.length || p.categoryOptions?.length || p.clientKey) && (
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
          {p.dateField && (
            <>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-40 font-normal normal-case" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-40 font-normal normal-case" /></label>
            </>
          )}
          {!!p.statusOptions?.length && (
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Status
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-44 font-normal normal-case"><option value="">All statuses</option>{p.statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            </label>
          )}
          {!!p.categoryOptions?.length && (
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">{p.categoryLabel ?? "Category"}
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-48 font-normal normal-case"><option value="">All</option>{p.categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            </label>
          )}
          {p.clientKey && clientOptions.length > 0 && (
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Client
              <Select value={client} onChange={(e) => setClient(e.target.value)} className="mt-1 w-56 font-normal normal-case"><option value="">All clients</option>{clientOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            </label>
          )}
          {hasFilters && <Button variant="ghost" onClick={() => { setQ(""); setFrom(""); setTo(""); setStatus(""); setCategory(""); setClient(""); }}><X className="h-4 w-4" /> Clear</Button>}
        </div>
      )}

      {/* Table */}
      {p.loading ? (
        <Spinner />
      ) : p.error ? (
        <ErrorState message={p.error} onRetry={p.onRetry} />
      ) : filtered.length === 0 ? (
        <EmptyState title={hasFilters ? "No matching records" : p.emptyTitle ?? "No records yet"} description={hasFilters ? "Try changing or clearing the filters." : "Records you add will appear here."} action={hasFilters ? <Button onClick={() => { setQ(""); setFrom(""); setTo(""); setStatus(""); setCategory(""); setClient(""); }}>Clear filters</Button> : p.emptyAction} />
      ) : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                {!p.hideSerial && <th className="w-12 px-4 py-3 font-semibold">#</th>}
                {visibleCols.map((c) => (
                  <th key={c.key} className={cn("px-4 py-3 font-semibold", (c.type === "money" || c.type === "number") && "text-right")}>
                    <button className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-fg" onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === "asc" ? { key: c.key, dir: "desc" } : null) : { key: c.key, dir: "asc" }))}>
                      {c.label} <SortIcon k={c.key} />
                    </button>
                  </th>
                ))}
                {showActions && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={String(r.id ?? i)} className="border-b border-line/60 transition-colors last:border-0 hover:bg-fg/[0.04]" onDoubleClick={() => p.onView?.(r)}>
                  {!p.hideSerial && <td className="px-4 py-3 text-muted">{(cur - 1) * pageSize + i + 1}</td>}
                  {visibleCols.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3 align-middle", (c.type === "money" || c.type === "number") && "text-right")}>{renderCell(c, r)}</td>
                  ))}
                  {showActions && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.rowActions?.(r)}
                        {p.onView && <IconBtn label="View details" onClick={() => p.onView!(r)}><Eye className="h-4 w-4" /></IconBtn>}
                        {p.onEdit && <IconBtn label="Edit" onClick={() => p.onEdit!(r)}><Pencil className="h-4 w-4" /></IconBtn>}
                        {p.onDelete && <IconBtn label="Delete" danger onClick={() => p.onDelete!(r)}><Trash2 className="h-4 w-4" /></IconBtn>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {hasTotals && (
              <tfoot>
                <tr className="border-t-2 border-line bg-fg/5 font-bold">
                  {!p.hideSerial && <td className="px-4 py-3" />}
                  {visibleCols.map((c, i) => (
                    <td key={c.key} className={cn("px-4 py-3", c.sum && "text-right tabular-nums")}>{c.sum ? cellText({ ...c, ref: false }, { [c.key]: totals[c.key] }, ctx) : i === 0 ? "Total (filtered)" : ""}</td>
                  ))}
                  {showActions && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Pagination */}
      {!p.loading && !p.error && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
          <div className="flex items-center gap-3 text-muted">
            <span>Showing {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, filtered.length)} of {filtered.length}{filtered.length !== p.rows.length ? ` (filtered from ${p.rows.length})` : ""}</span>
            <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 w-28" aria-label="Rows per page">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
            <span className="px-2 text-muted">Page {cur} / {pages}</span>
            <Button size="sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      {print && <PrintSheet spec={print.spec} autoPrint={print.auto} onClose={() => setPrint(null)} />}
    </div>
  );
}

export function IconBtn({ children, label, onClick, danger, disabled }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button title={label} aria-label={label} disabled={disabled} onClick={onClick} className={cn("grid h-9 w-9 place-items-center rounded-lg border border-line bg-fg/5 transition hover:bg-fg/12 disabled:opacity-40", danger ? "text-red-500 hover:bg-red-500/15" : "text-fg/80 hover:text-fg")}>
      {children}
    </button>
  );
}

export const deptName = (code: string) => DEPTS[code as keyof typeof DEPTS]?.name ?? code;
