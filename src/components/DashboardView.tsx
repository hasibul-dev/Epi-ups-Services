"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartData, DashData, ListData } from "@/server/dashboards";
import { cn } from "@/lib/utils";
import { useFmt } from "./AppContext";
import { Icon } from "./icons";
import { Badge, Card, EmptyState, autoTone, toneClass } from "./ui";

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#6366f1", "#14b8a6"];
const tip = { background: "var(--surface-solid)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--fg)", fontSize: 12 };

function Chart({ c, accent }: { c: ChartData; accent: string }) {
  const fmt = useFmt();
  const empty = c.data.length === 0 || c.data.every((d) => !d.value && !d.value2);
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-bold">{c.title}</h3>
      {empty ? <EmptyState title="No data yet" description="This chart fills in as records are added." /> : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {c.kind === "pie" ? (
              <PieChart>
                <Pie data={c.data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={3} stroke="none">
                  {c.data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            ) : (
              <BarChart data={c.data} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + "…" : v)} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => (c.money ? (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)) : String(v))} />
                <Tooltip contentStyle={tip} cursor={{ fill: "rgba(128,128,160,0.12)" }} formatter={(v) => (c.money ? fmt.money(Number(v)) : String(v))} />
                <Bar dataKey="value" name={c.series?.[0] ?? "Count"} fill={accent} radius={[6, 6, 0, 0]} />
                {c.kind === "bar2" && <Bar dataKey="value2" name={c.series?.[1] ?? "Value 2"} fill="#ef4444" radius={[6, 6, 0, 0]} />}
                {c.kind === "bar2" && <Legend wrapperStyle={{ fontSize: 12 }} />}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function ListCard({ l }: { l: ListData }) {
  const fmt = useFmt();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-sm font-bold">{l.title}</h3>
        {l.href && <Link href={l.href} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>}
      </div>
      {l.rows.length === 0 ? <EmptyState title={l.empty} /> : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted">{l.columns.map((c) => <th key={c.key} className="px-5 py-2.5 font-semibold">{c.label}</th>)}</tr></thead>
            <tbody>
              {l.rows.map((r, i) => (
                <tr key={i} className="border-t border-line/60">
                  {l.columns.map((c) => {
                    const v = r[c.key];
                    let cell: React.ReactNode = v == null || v === "" ? "—" : String(v);
                    if (c.type === "date" && v) cell = String(v).length > 10 ? fmt.dateTime(String(v)) : fmt.date(String(v));
                    if (c.type === "money") cell = fmt.money(Number(v));
                    if (c.type === "badge" && v) cell = <Badge tone={autoTone(String(v))}>{String(v).replace(/_/g, " ")}</Badge>;
                    return <td key={c.key} className="max-w-[260px] truncate px-5 py-3">{cell}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function DashboardView({ data, accent }: { data: DashData; accent: string }) {
  const fmt = useFmt();
  return (
    <div className="space-y-6">
      {data.notes && data.notes.length > 0 && data.notes[0].includes("Ledger") || data.notes?.[0]?.includes("balanced") ? (
        <div className={cn("inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold", data.notes![0].includes("balanced") ? toneClass.emerald : toneClass.red)}>{data.notes![0]}</div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((s) => {
          const body = (
            <div className="group relative h-full overflow-hidden rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{s.label}</p>
                  <p className="mt-2 truncate text-3xl font-extrabold tracking-tight">{s.money ? fmt.money(Number(s.value)) : typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                  {s.hint && <p className="mt-1.5 text-xs text-muted">{s.hint}</p>}
                </div>
                <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", toneClass[s.tone])}><Icon name={s.icon} className="h-5 w-5" /></div>
              </div>
              <div className={cn("pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-full opacity-20 blur-2xl", toneClass[s.tone].split(" ")[0])} />
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="glass block rounded-2xl transition hover:-translate-y-0.5 hover:border-accent/50">{body}</Link>
          ) : (
            <div key={s.label} className="glass rounded-2xl">{body}</div>
          );
        })}
      </div>

      {data.links && (
        <div>
          <h2 className="mb-1 text-lg font-bold">Department Workspaces</h2>
          <p className="mb-4 text-sm text-muted">Single-click access into operational departments</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.links.map((l) => (
              <Link key={l.href} href={l.href} className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-0.5">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: l.color }} />
                <div className="flex items-center justify-between">
                  <div><p className="font-bold">{l.label}</p><p className="mt-1 text-sm text-muted">{l.description}</p></div>
                  <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-fg" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">{data.charts.map((c) => <Chart key={c.title} c={c} accent={accent} />)}</div>
      <div className={cn("grid grid-cols-1 gap-5", data.lists.length > 1 && "xl:grid-cols-2")}>{data.lists.map((l) => <ListCard key={l.title} l={l} />)}</div>
    </div>
  );
}
