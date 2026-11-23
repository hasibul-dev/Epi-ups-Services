"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DeptCode } from "@/lib/constants";
import type { CalEvent } from "@/server/insights";
import { addDays, cn } from "@/lib/utils";
import { api, useFmt } from "./AppContext";
import { Badge, Button, Card, Spinner, autoTone } from "./ui";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ dept, title }: { dept: DeptCode; title?: string }) {
  const fmt = useFmt();
  const today = fmt.today();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let on = true;
    setLoading(true);
    setError("");
    api<{ events: CalEvent[] }>(`/api/calendar?dept=${dept}&month=${month}`)
      .then((r) => on && setEvents(r.events))
      .catch((e) => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [dept, month]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const [y, mo] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const shift = (n: number) => { const d = new Date(Date.UTC(y, mo - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)); };
  const label = new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const dayEvents = byDate.get(selected) ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title ?? "Calendar"} — {label}</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Today</Button>
            <Button size="sm" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        {error ? <p className="py-10 text-center text-sm text-red-500">{error}</p> : (
          <div className="relative">
            {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-solid/40"><Spinner label="" /></div>}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted">{DOW.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {cells.map((c, i) => c === null ? <div key={i} /> : (
                <button key={c} onClick={() => setSelected(c)} className={cn("flex min-h-[78px] flex-col items-start rounded-xl border p-2 text-left transition hover:border-accent/60", selected === c ? "border-accent bg-accent/12" : "border-line bg-fg/[0.03]", c === today && "ring-1 ring-accent/70")}>
                  <span className={cn("text-xs font-bold", c === today && "text-accent")}>{Number(c.slice(8))}</span>
                  {(byDate.get(c)?.length ?? 0) > 0 && (
                    <span className="mt-auto inline-flex items-center rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">{byDate.get(c)!.length} item{byDate.get(c)!.length > 1 ? "s" : ""}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
      <Card className="h-fit p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-bold">{fmt.date(selected)}</h3>
          <span className="text-xs text-muted">{selected === today ? "Today" : selected < today ? "Past" : `In ${Math.round((Date.parse(selected) - Date.parse(today)) / 86400000)} day(s)`}</span>
        </div>
        <p className="mb-4 text-sm text-muted">{dayEvents.length} scheduled item(s)</p>
        <div className="space-y-2.5">
          {dayEvents.length === 0 && <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Nothing scheduled for this day.</p>}
          {dayEvents.map((e, i) => (
            <Link key={i} href={e.href} className="block rounded-xl border border-line bg-fg/[0.03] p-3 transition hover:border-accent/50">
              <div className="mb-1.5 flex flex-wrap items-center gap-2"><Badge tone="indigo">{e.type}</Badge>{e.status && <Badge tone={autoTone(e.status)}>{e.status.replace(/_/g, " ")}</Badge>}</div>
              <p className="text-sm font-medium">{e.title}</p>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex gap-2"><Button size="sm" onClick={() => setSelected(addDays(selected, -1))}>← Prev day</Button><Button size="sm" onClick={() => setSelected(addDays(selected, 1))}>Next day →</Button></div>
      </Card>
    </div>
  );
}
