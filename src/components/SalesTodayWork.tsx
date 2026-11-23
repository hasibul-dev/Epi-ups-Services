"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Mail,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";
import { api, useApp, useFmt, useResourceCan, useToast } from "./AppContext";
import { addDays, cn, todayStr } from "@/lib/utils";

interface FollowUpItem {
  id: number;
  clientId: number;
  dueDate: string;
  status: string;
  method: string | null;
  result: string | null;
  notes: string | null;
  clientName: string;
  clientCompany: string | null;
  clientDesignation: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientCategory: string | null;
  isOverdue: boolean;
  isToday: boolean;
}

interface WorkItem {
  id: number;
  title: string;
  clientId: number;
  dueDate: string;
  status: string;
  notes: string | null;
  description: string | null;
  clientId__label?: string;
  _overdue?: boolean;
}

const RESULT_OPTIONS = [
  { value: "Potential (+3d)", label: "Potential (+3d)", days: 3 },
  { value: "No Potential (+10d)", label: "No Potential (+10d)", days: 10 },
  { value: "Quotation (+7d)", label: "Quotation (+7d)", days: 7 },
  { value: "Sale (+30d)", label: "Sale (+30d)", days: 30 },
  { value: "General", label: "General", days: 0 },
];

const METHOD_OPTIONS = [
  "Phone Call",
  "Email",
  "WhatsApp",
  "Site Visit",
  "Meeting",
  "Other",
];

const WORK_STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function SalesTodayWork() {
  const toast = useToast();
  const fmt = useFmt();
  const today = todayStr();

  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: "all" | "followups" | "work" | "overdue"
  const [tab, setTab] = useState<"all" | "followups" | "work" | "overdue">("all");

  // Row states for Follow-ups: result, method, notes, nextDate, isSubmitting
  const [fuState, setFuState] = useState<
    Record<
      number,
      {
        result: string;
        method: string;
        notes: string;
        nextDate: string;
        isSubmitting: boolean;
      }
    >
  >({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fuRes, workRes] = await Promise.all([
        fetch("/api/sales/follow-ups?status=all").then((r) => r.json()),
        api<{ rows: WorkItem[] }>("/api/r/sales_work"),
      ]);

      const fus: FollowUpItem[] = fuRes.followUps || [];
      const wks: WorkItem[] = workRes.rows || [];

      setFollowUps(fus);
      setWorks(wks);

      // Pre-initialize row editing state
      setFuState((prev) => {
        const next = { ...prev };
        for (const f of fus) {
          if (!next[f.id]) {
            next[f.id] = {
              result: f.result || "",
              method: f.method || "Phone Call",
              notes: f.notes || "",
              nextDate: "",
              isSubmitting: false,
            };
          }
        }
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load today's work";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived datasets
  const dueFollowUps = useMemo(
    () => followUps.filter((f) => f.status === "pending" && f.dueDate <= today),
    [followUps, today]
  );

  const todayWorks = useMemo(
    () => works.filter((w) => w.dueDate === today),
    [works, today]
  );

  const overdueWorks = useMemo(
    () => works.filter((w) => w.dueDate < today && !["completed", "cancelled"].includes(w.status)),
    [works, today]
  );

  const completedTodayWorks = useMemo(
    () => works.filter((w) => w.dueDate === today && w.status === "completed"),
    [works, today]
  );

  // Handle follow-up result change
  const handleResultChange = (rowId: number, val: string) => {
    const opt = RESULT_OPTIONS.find((o) => o.value === val);
    const suggested = opt && opt.days > 0 ? addDays(today, opt.days) : "";
    setFuState((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {
          method: "Phone Call",
          notes: "",
          isSubmitting: false,
        }),
        result: val,
        nextDate: suggested,
      },
    }));
  };

  // Complete Follow-up
  const handleDoneFollowUp = async (row: FollowUpItem) => {
    const s = fuState[row.id] || {
      result: row.result || "",
      method: row.method || "Phone Call",
      notes: row.notes || "",
      nextDate: "",
    };

    if (!s.result || s.result === "Select Result") {
      toast.error("Please select a Next Result before completing.");
      return;
    }
    if (!s.method) {
      toast.error("Please select a Follow-up Method.");
      return;
    }
    if (s.result === "General" && !s.nextDate) {
      toast.error("Please select a follow-up date for General.");
      return;
    }

    setFuState((prev) => ({
      ...prev,
      [row.id]: { ...prev[row.id], isSubmitting: true },
    }));

    try {
      const scheduledDate =
        s.nextDate ||
        (RESULT_OPTIONS.find((o) => o.value === s.result)?.days
          ? addDays(today, RESULT_OPTIONS.find((o) => o.value === s.result)!.days)
          : addDays(today, 3));

      const res = await fetch("/api/sales/follow-ups/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpId: row.id,
          result: s.result,
          method: s.method,
          notes: (s.notes || "").trim(),
          nextDate: scheduledDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to complete follow-up");
      }

      toast.success(
        `✓ Follow-up completed! Next follow-up scheduled for ${fmt.date(scheduledDate)}.`
      );
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error completing follow-up";
      toast.error(msg);
    } finally {
      setFuState((prev) => ({
        ...prev,
        [row.id]: { ...prev[row.id], isSubmitting: false },
      }));
    }
  };

  // Update Work Order Status
  const handleWorkStatus = async (workId: number, status: string) => {
    try {
      await api(`/api/r/sales_work/${workId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      toast.success(`Work order status updated to ${status.replace(/_/g, " ")}`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update work status";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Today's Work"
        subtitle={`Scheduled client follow-ups and activities for ${fmt.date(today)}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={loadData}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <ButtonLink href="/sales/work/new" variant="primary" size="md">
              <CalendarPlus className="h-4 w-4" /> Add Work
            </ButtonLink>
            <ButtonLink href="/sales/clients/new" variant="secondary" size="md">
              <UserPlus className="h-4 w-4" /> Add Client
            </ButtonLink>
          </div>
        }
      />

      {/* Summary Counter Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setTab("followups")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition",
            tab === "followups"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>FOLLOW-UPS DUE</span>
            <PhoneCall className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{dueFollowUps.length}</div>
          <div className="mt-0.5 text-[11px] text-muted">Client follow-ups today</div>
        </div>

        <div
          onClick={() => setTab("work")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition",
            tab === "work"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>WORK ORDERS</span>
            <CalendarCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400">{todayWorks.length}</div>
          <div className="mt-0.5 text-[11px] text-muted">Scheduled for today</div>
        </div>

        <div
          onClick={() => setTab("overdue")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition",
            tab === "overdue"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>OVERDUE ITEMS</span>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-400">{overdueWorks.length}</div>
          <div className="mt-0.5 text-[11px] text-muted">Past scheduled date</div>
        </div>

        <div
          onClick={() => setTab("all")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition",
            tab === "all"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>COMPLETED TODAY</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {completedTodayWorks.length}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Finished work orders</div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <Card className="p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition",
              tab === "all"
                ? "bg-accent text-white shadow-md shadow-accent/25"
                : "text-muted hover:text-fg hover:bg-fg/5"
            )}
          >
            Today&apos;s Overview ({dueFollowUps.length + todayWorks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("followups")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition",
              tab === "followups"
                ? "bg-accent text-white shadow-md shadow-accent/25"
                : "text-muted hover:text-fg hover:bg-fg/5"
            )}
          >
            Client Follow-ups ({dueFollowUps.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("work")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition",
              tab === "work"
                ? "bg-accent text-white shadow-md shadow-accent/25"
                : "text-muted hover:text-fg hover:bg-fg/5"
            )}
          >
            Work Orders ({todayWorks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("overdue")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition",
              tab === "overdue"
                ? "bg-accent text-white shadow-md shadow-accent/25"
                : "text-muted hover:text-fg hover:bg-fg/5"
            )}
          >
            Overdue Work ({overdueWorks.length})
          </button>
        </div>
      </Card>

      {loading && followUps.length === 0 && works.length === 0 ? (
        <Spinner label="Loading today's schedule..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: Due Client Follow-ups */}
          {(tab === "all" || tab === "followups") && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-fg/[0.01]">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-accent" />
                    Due Client Follow-ups
                    <span className="text-xs font-normal text-muted">
                      ({dueFollowUps.length} due)
                    </span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Select result, method, and notes. Next follow-up is scheduled automatically.
                  </p>
                </div>
                <ButtonLink href="/sales/follow-ups" variant="ghost" size="sm" className="text-xs">
                  View all follow-ups <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </ButtonLink>
              </div>

              {dueFollowUps.length === 0 ? (
                <EmptyState
                  title="No follow-ups due today"
                  description="All client follow-ups are up to date."
                  action={
                    <ButtonLink href="/sales/clients/new" variant="secondary" size="sm">
                      <UserPlus className="h-4 w-4" /> Add New Client
                    </ButtonLink>
                  }
                />
              ) : (
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted font-semibold bg-fg/[0.02]">
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3 min-w-[130px]">Method</th>
                        <th className="px-4 py-3 min-w-[170px]">Next Result</th>
                        <th className="px-4 py-3 min-w-[180px]">Remarks / Notes</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueFollowUps.map((f) => {
                        const s = fuState[f.id] || {
                          result: f.result || "",
                          method: f.method || "Phone Call",
                          notes: f.notes || "",
                          nextDate: "",
                          isSubmitting: false,
                        };

                        return (
                          <tr
                            key={f.id}
                            className="border-b border-line/60 hover:bg-fg/[0.03] transition-colors"
                          >
                            {/* Client & Phone */}
                            <td className="px-4 py-3 align-top">
                              <div className="font-semibold text-fg flex items-center gap-1.5">
                                {f.clientName}
                                {f.clientCategory && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                    {f.clientCategory}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted mt-0.5">
                                {f.clientCompany || "—"}
                              </div>
                              {f.clientPhone && (
                                <a
                                  href={`tel:${f.clientPhone}`}
                                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent font-medium mt-1"
                                >
                                  <Phone className="h-3 w-3" /> {f.clientPhone}
                                </a>
                              )}
                            </td>

                            {/* Due Date & Overdue Tag */}
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <div className="font-semibold text-xs text-fg">
                                {fmt.date(f.dueDate)}
                              </div>
                              {f.isOverdue && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30 mt-1">
                                  <AlertCircle className="h-2.5 w-2.5" /> Overdue
                                </span>
                              )}
                            </td>

                            {/* Method */}
                            <td className="px-4 py-3 align-top min-w-[130px]">
                              <Select
                                value={s.method || "Phone Call"}
                                onChange={(e) =>
                                  setFuState((prev) => ({
                                    ...prev,
                                    [f.id]: { ...prev[f.id], method: e.target.value },
                                  }))
                                }
                                className="h-8 text-xs py-1"
                              >
                                {METHOD_OPTIONS.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </Select>
                            </td>

                            {/* Next Result Dropdown & Auto Date */}
                            <td className="px-4 py-3 align-top min-w-[170px]">
                              <Select
                                value={s.result}
                                onChange={(e) => handleResultChange(f.id, e.target.value)}
                                className="h-8 text-xs py-1"
                              >
                                <option value="">Select Result</option>
                                {RESULT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Select>

                              {s.result && (
                                <div className="mt-1 space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-muted">
                                    <span>Next Date:</span>
                                    {s.nextDate && (
                                      <span className="text-accent font-semibold">
                                        {fmt.date(s.nextDate)}
                                      </span>
                                    )}
                                  </div>
                                  <Input
                                    type="date"
                                    value={s.nextDate}
                                    onChange={(e) =>
                                      setFuState((prev) => ({
                                        ...prev,
                                        [f.id]: { ...prev[f.id], nextDate: e.target.value },
                                      }))
                                    }
                                    className="h-7 text-xs px-2"
                                  />
                                </div>
                              )}
                            </td>

                            {/* Notes */}
                            <td className="px-4 py-3 align-top min-w-[180px]">
                              <Input
                                type="text"
                                value={s.notes}
                                onChange={(e) =>
                                  setFuState((prev) => ({
                                    ...prev,
                                    [f.id]: { ...prev[f.id], notes: e.target.value },
                                  }))
                                }
                                placeholder="Remarks / notes..."
                                className="h-8 text-xs"
                              />
                            </td>

                            {/* Action: DONE */}
                            <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleDoneFollowUp(f)}
                                loading={s.isSubmitting}
                                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-900/20"
                              >
                                <Check className="h-3.5 w-3.5" />
                                DONE
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 2: Today's Scheduled Work Orders */}
          {(tab === "all" || tab === "work") && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-fg/[0.01]">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-cyan-400" />
                    Today&apos;s Work Orders
                    <span className="text-xs font-normal text-muted">
                      ({todayWorks.length} scheduled)
                    </span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Sales tasks and orders due today. Update status directly.
                  </p>
                </div>
                <ButtonLink href="/sales/work/new" variant="primary" size="sm" className="text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Work
                </ButtonLink>
              </div>

              {todayWorks.length === 0 ? (
                <EmptyState
                  title="No work orders scheduled for today"
                  description="You can add work orders connected to any client."
                  action={
                    <ButtonLink href="/sales/work/new" variant="primary" size="sm">
                      <CalendarPlus className="h-4 w-4" /> Add Work
                    </ButtonLink>
                  }
                />
              ) : (
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted font-semibold bg-fg/[0.02]">
                        <th className="px-4 py-3">Work Title</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3 min-w-[130px]">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayWorks.map((w) => (
                        <tr
                          key={w.id}
                          className="border-b border-line/60 hover:bg-fg/[0.03] transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-fg">
                            {w.title}
                            {w.description && (
                              <p className="text-xs text-muted font-normal mt-0.5 truncate max-w-xs">
                                {w.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-fg/90">
                            {w.clientId__label || `#${w.clientId}`}
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={w.status}
                              onChange={(e) => handleWorkStatus(w.id, e.target.value)}
                              className="h-8 text-xs py-1"
                            >
                              {WORK_STATUSES.map((st) => (
                                <option key={st.value} value={st.value}>
                                  {st.label}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {w.status !== "completed" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleWorkStatus(w.id, "completed")}
                                className="h-8 px-3 text-xs text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                              >
                                <Check className="h-3.5 w-3.5" /> Complete
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 3: Overdue Work Orders */}
          {(tab === "all" || tab === "overdue") && overdueWorks.length > 0 && (
            <Card className="overflow-hidden border-red-500/30">
              <div className="flex items-center justify-between border-b border-red-500/20 px-5 py-3.5 bg-red-500/5">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    Overdue Work Orders
                    <span className="text-xs font-normal text-red-400/80">
                      ({overdueWorks.length} requiring attention)
                    </span>
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Tasks past their scheduled due date. Complete or reschedule.
                  </p>
                </div>
                <ButtonLink href="/sales/work" variant="ghost" size="sm" className="text-xs">
                  View all in Work History <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </ButtonLink>
              </div>

              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted font-semibold bg-fg/[0.02]">
                      <th className="px-4 py-3">Work Title</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 min-w-[130px]">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueWorks.map((w) => (
                      <tr
                        key={w.id}
                        className="border-b border-line/60 hover:bg-fg/[0.03] transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-fg">{w.title}</td>
                        <td className="px-4 py-3 text-fg/90">
                          {w.clientId__label || `#${w.clientId}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {fmt.date(w.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={w.status}
                            onChange={(e) => handleWorkStatus(w.id, e.target.value)}
                            className="h-8 text-xs py-1"
                          >
                            {WORK_STATUSES.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleWorkStatus(w.id, "completed")}
                            className="h-8 px-3 text-xs text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                          >
                            <Check className="h-3.5 w-3.5" /> Complete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
