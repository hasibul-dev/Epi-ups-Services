import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { Card, PageHeader } from "@/components/ui";
import { DailySummaryControls } from "@/components/DailySummaryControls";
import { formatDate } from "@/lib/utils";
import { getSettings, getToday } from "@/server/settings";

type Cell = string | number | null | undefined;

function MiniTable({ title, head, rows, empty }: { title: string; head: string[]; rows: Cell[][]; empty: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4"><h3 className="text-sm font-bold">{title} <span className="font-normal text-muted">({rows.length})</span></h3></div>
      {rows.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">{empty}</p> : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted">{head.map((h) => <th key={h} className="px-5 py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line/60">{r.map((c, j) => <td key={j} className="max-w-[260px] truncate px-5 py-3 capitalize-first">{c == null || c === "" ? "—" : String(c).replace(/_/g, " ")}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export async function SalesDailySummary({ date }: { date?: string }) {
  const st = await getSettings();
  const today = await getToday();
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const fmt = st["format.date"] || "DD MMM YYYY";
  const w = S.salesWork;

  const [due, done, fu, clients, overdue] = await Promise.all([
    db.select({ t: w.title, c: S.clients.name, p: w.priority, s: w.status }).from(w).innerJoin(S.clients, eq(S.clients.id, w.clientId)).where(eq(w.dueDate, day)),
    db.select({ t: w.title, c: S.clients.name }).from(w).innerJoin(S.clients, eq(S.clients.id, w.clientId)).where(and(eq(w.completedAt, day), eq(w.status, "completed"))),
    db.select({ c: S.clients.name, ty: S.followUps.type, s: S.followUps.status, n: S.followUps.notes }).from(S.followUps).innerJoin(S.clients, eq(S.clients.id, S.followUps.clientId)).where(eq(S.followUps.dueDate, day)),
    db.select({ n: S.clients.name, co: S.clients.companyName, p: S.clients.phone }).from(S.clients).where(eq(S.clients.registrationDate, day)),
    db.select({ t: w.title, c: S.clients.name, d: w.dueDate }).from(w).innerJoin(S.clients, eq(S.clients.id, w.clientId)).where(and(lte(w.dueDate, day))).limit(0),
  ]);
  void overdue;
  const stats = [
    { label: "Work Due", v: due.length, tone: "text-cyan-500" },
    { label: "Completed", v: done.length, tone: "text-emerald-500" },
    { label: "Follow-ups", v: fu.length, tone: "text-amber-500" },
    { label: "New Clients", v: clients.length, tone: "text-indigo-400" },
  ];
  return (
    <>
      <PageHeader
        title="Daily Summary"
        subtitle={`Activity for ${formatDate(day, fmt)}${day === today ? " (today)" : ""}`}
        actions={<DailySummaryControls defaultDate={day} />}
      />
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => <Card key={s.label} className="p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">{s.label}</p><p className={`mt-2 text-3xl font-extrabold ${s.tone}`}>{s.v}</p></Card>)}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MiniTable title="Work due" head={["Work", "Client", "Priority", "Status"]} rows={due.map((r) => [r.t, r.c, r.p, r.s])} empty="No work due on this date" />
        <MiniTable title="Work completed" head={["Work", "Client"]} rows={done.map((r) => [r.t, r.c])} empty="No work completed on this date" />
        <MiniTable title="Client follow-ups" head={["Client", "Type", "Status", "Notes"]} rows={fu.map((r) => [r.c, r.ty, r.s, r.n])} empty="No follow-ups scheduled" />
        <MiniTable title="New clients registered" head={["Client", "Company", "Phone"]} rows={clients.map((r) => [r.n, r.co, r.p])} empty="No clients registered on this date" />
      </div>
    </>
  );
}
