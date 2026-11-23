"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import type { Col } from "@/lib/columns";
import { DEPTS, type DeptCode } from "@/lib/constants";
import { REPORTS, getReport, type ReportDef } from "@/lib/report-config";
import { RESOURCES, fieldOptions, type Option } from "@/lib/resource-config";
import { cn, monthRange } from "@/lib/utils";
import { api, useApp, useCan, useFmt } from "./AppContext";
import { DataTable } from "./DataTable";
import { loadRefOptions } from "./ResourceForm";
import { Card, Field, Input, PageHeader, Select } from "./ui";

type Row = Record<string, unknown>;
interface ReportResponse { columns: Col[]; rows: Row[]; summary?: { label: string; value: number | string; money?: boolean }[] }

function ReportViewer({ report }: { report: ReportDef }) {
  const { settings } = useApp();
  const fmt = useFmt();
  const can = useCan();
  const res = report.resource ? RESOURCES[report.resource] : undefined;
  const thisYear = Number(fmt.today().slice(0, 4));
  const [mode, setMode] = useState<"all" | "range" | "month" | "year">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState(fmt.today().slice(0, 7));
  const [year, setYear] = useState(String(thisYear));
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [clients, setClients] = useState<Option[]>([]);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const f = report.filters ?? {};
  const statusField = res?.fields.find((x) => x.name === res.statusField);
  const catField = res?.fields.find((x) => x.name === res.categoryField);
  const showClient = f.client ?? !!res?.clientField;
  const showStatus = f.status ?? !!statusField;
  const showCategory = f.category ?? !!catField;
  const showDept = f.department ?? !!(res?.departmentField || res?.assigneeField);
  const showDate = f.date ?? true;
  const dateFieldKey = report.dateField ?? res?.dateField;
  const dateLabel = res?.fields.find((x) => x.name === dateFieldKey)?.label ?? "transaction date";

  useEffect(() => { if (showClient) loadRefOptions("clients").then(setClients).catch(() => undefined); }, [showClient]);

  const range = useMemo(() => {
    if (mode === "month" && month) return monthRange(month);
    if (mode === "year" && year) return { from: `${year}-01-01`, to: `${year}-12-31` };
    if (mode === "range") return { from, to };
    return { from: "", to: "" };
  }, [mode, month, year, from, to]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (showDate && range.from) sp.set("from", range.from);
    if (showDate && range.to) sp.set("to", range.to);
    if (client) sp.set("client", client);
    if (status) sp.set("status", status);
    if (category) sp.set("category", category);
    if (department) sp.set("department", department);
    const t = setTimeout(() => {
      fetch(`/api/reports/${report.key}?${sp.toString()}`, { signal: ctrl.signal })
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || "Failed to load report");
          setData(j);
        })
        .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [report.key, range.from, range.to, client, status, category, department, showDate]);

  const rangeText = !showDate || (!range.from && !range.to) ? "All dates" : `${fmt.date(range.from) } to ${fmt.date(range.to)}`;
  const filtersText = [
    client && `Client: ${clients.find((c) => c.value === client)?.label ?? client}`,
    status && `Status: ${status.replace(/_/g, " ")}`,
    category && `Category: ${category.replace(/_/g, " ")}`,
    department && `Department: ${department}`,
  ].filter(Boolean).join(" · ");

  const deptOptions: Option[] = res?.departmentField
    ? fieldOptions(res.fields.find((x) => x.name === res.departmentField)!)
    : (Object.values(DEPTS).map((d) => ({ value: d.code, label: d.name })));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showDate && (
            <>
              <Field label="Period" hint={`Filters by ${dateLabel}`}>
                <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                  <option value="month">Monthly</option><option value="year">Yearly</option><option value="range">Custom date range</option><option value="all">All time</option>
                </Select>
              </Field>
              {mode === "month" && <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>}
              {mode === "year" && <Field label="Year"><Select value={year} onChange={(e) => setYear(e.target.value)}>{Array.from({ length: 8 }, (_, i) => thisYear + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}</Select></Field>}
              {mode === "range" && (<><Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></>)}
            </>
          )}
          {showClient && <Field label="Client"><Select value={client} onChange={(e) => setClient(e.target.value)}><option value="">All clients</option>{clients.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>}
          {showStatus && statusField && <Field label={statusField.label}><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{fieldOptions(statusField, settings).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}{res?.overdue && <option value="overdue">Overdue</option>}</Select></Field>}
          {showCategory && catField && <Field label={catField.label}><Select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option>{fieldOptions(catField, settings).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>}
          {showDept && <Field label="Department"><Select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">All departments</option>{deptOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>}
        </div>
      </Card>
      <DataTable
        title={report.title}
        columns={data?.columns ?? []}
        rows={data?.rows ?? []}
        loading={loading && !data}
        error={error}
        hideFilters
        canExport={can([report.dept], "export")}
        storageKey={`report-${report.key}`}
        meta={{
          department: DEPTS[report.dept].name,
          orientation: report.orientation,
          rangeText,
          filtersText,
          signatures: report.signatures,
          summary: data?.summary?.map((s) => ({ label: s.label, value: s.money ? fmt.money(Number(s.value)) : String(s.value) })),
        }}
        toolbar={data?.summary ? <div className="mr-2 flex flex-wrap gap-2">{data.summary.map((s) => <span key={s.label} className="rounded-lg border border-line bg-fg/5 px-3 py-2 text-xs"><span className="text-muted">{s.label}: </span><b>{s.money ? fmt.money(Number(s.value)) : String(s.value)}</b></span>)}</div> : undefined}
      />
    </div>
  );
}

/** Report list + viewer. When `single` is given only that report is shown (embedded page). */
export function ReportCenter({ dept, initialKey, single, title, subtitle }: { dept: DeptCode; initialKey?: string; single?: string; title?: string; subtitle?: string }) {
  const reports = useMemo(() => REPORTS.filter((r) => r.dept === dept), [dept]);
  const [sel, setSel] = useState<string>(single ?? (initialKey && reports.some((r) => r.key === initialKey) ? initialKey : reports[0]?.key));
  const [q, setQ] = useState("");
  const list = reports.filter((r) => (r.title + r.description).toLowerCase().includes(q.toLowerCase()));
  const report = getReport(sel);

  if (single) {
    return report ? (<><PageHeader title={title ?? report.title} subtitle={subtitle ?? report.description} /><ReportViewer report={report} /></>) : null;
  }
  return (
    <>
      <PageHeader title={title ?? "Reports"} subtitle={subtitle ?? `${DEPTS[dept].name} — select a report, set filters, then view, print or export it.`} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search reports…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="max-h-[70vh] space-y-1.5 overflow-auto scroll-thin">
            {list.length === 0 && <p className="p-4 text-center text-sm text-muted">No reports match.</p>}
            {list.map((r) => (
              <button key={r.key} onClick={() => setSel(r.key)} className={cn("flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition", sel === r.key ? "border-accent/60 bg-accent/12" : "border-transparent hover:bg-fg/8")}>
                <FileText className={cn("mt-0.5 h-5 w-5 shrink-0", sel === r.key ? "text-accent" : "text-muted")} />
                <span><span className="block text-sm font-semibold">{r.title}</span><span className="block text-xs text-muted">{r.description}</span></span>
              </button>
            ))}
          </div>
        </Card>
        <div className="min-w-0">
          {report ? (<><h2 className="mb-3 text-lg font-bold">{report.title}</h2><ReportViewer key={report.key} report={report} /></>) : <Card className="p-10 text-center text-sm text-muted">Select a report.</Card>}
        </div>
      </div>
    </>
  );
}

export { api as _api };
