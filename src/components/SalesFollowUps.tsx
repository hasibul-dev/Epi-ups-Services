"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Columns3,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";
import { api, useApp, useFmt, useResourceCan, useToast } from "./AppContext";
import { ResourceForm } from "./ResourceForm";
import { PrintSheet } from "./PrintSheet";
import { colsFromFields, cellText, type Col } from "@/lib/columns";
import { exportExcel, exportPdf, type ExportSpec } from "@/lib/export";
import { RESOURCES } from "@/lib/resource-config";
import { addDays, cn, todayStr } from "@/lib/utils";

interface FollowUpRow {
  id: number;
  clientId: number;
  workId: number | null;
  type: string;
  dueDate: string;
  status: string;
  assignedTo?: number | null;
  notes: string | null;
  result: string | null;
  method: string | null;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientCompany: string | null;
  clientDesignation: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  clientCategory: string | null;
  clientNotes: string | null;
  isOverdue: boolean;
  isToday: boolean;
  [key: string]: unknown;
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

const PAGE_SIZES = [10, 25, 50, 100];

export function SalesFollowUps() {
  const { settings, user } = useApp();
  const toast = useToast();
  const fmt = useFmt();
  const def = RESOURCES.follow_ups;
  const can = useResourceCan(def);

  const [data, setData] = useState<FollowUpRow[]>([]);
  const [todayDate, setTodayDate] = useState(() => todayStr());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Column Visibility & Menu state
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<"cols" | "export" | null>(null);
  const [print, setPrint] = useState<{ spec: ExportSpec; auto: boolean } | null>(null);
  const [busyExport, setBusyExport] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Drawers and Dialogs
  const [drawer, setDrawer] = useState<{ mode: "create" | "edit" | "view"; row?: FollowUpRow } | null>(null);
  const [delTarget, setDelTarget] = useState<FollowUpRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Row-level active state for Next Result, Method, Notes & customized Next Date
  const [rowState, setRowState] = useState<
    Record<
      number,
      {
        result: string;
        method: string;
        notes: string;
        nextDate: string;
        isSubmitting: boolean;
        isEditingDate: boolean;
        dateInput: string;
        isSavingDate: boolean;
      }
    >
  >({});

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load saved column preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem("epi-cols-follow_ups");
      if (saved) setHiddenCols(new Set(JSON.parse(saved)));
    } catch {
      // ignore
    }
  }, []);

  const toggleCol = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem("epi-cols-follow_ups", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/sales/follow-ups?status=all");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load follow-ups");
      }
      const rows: FollowUpRow[] = json.followUps || [];
      setData(rows);
      if (json.today) setTodayDate(json.today);

      // Pre-initialize row editing states
      setRowState((prev) => {
        const next = { ...prev };
        for (const r of rows) {
          if (!next[r.id]) {
            next[r.id] = {
              result: r.result || "",
              method: r.method || "Phone Call",
              notes: r.notes || r.clientNotes || "",
              nextDate: "",
              isSubmitting: false,
              isEditingDate: false,
              dateInput: r.dueDate,
              isSavingDate: false,
            };
          }
        }
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load follow-ups";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Statistics
  const stats = useMemo(() => {
    const today = todayDate;
    const total = data.length;
    const dueToday = data.filter((x) => x.status === "pending" && x.dueDate <= today).length;
    const overdue = data.filter((x) => x.status === "pending" && x.dueDate < today).length;
    const pending = data.filter((x) => x.status === "pending").length;
    const completed = data.filter((x) => x.status === "done").length;
    return { total, dueToday, overdue, pending, completed };
  }, [data, todayDate]);

  // Unique clients for filter dropdown
  const clientOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of data) {
      if (r.clientId && r.clientName) {
        map.set(r.clientId, r.clientCompany ? `${r.clientName} (${r.clientCompany})` : r.clientName);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  // Filtered rows
  const filtered = useMemo(() => {
    const today = todayDate;
    let list = data;

    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(
        (x) =>
          x.clientName?.toLowerCase().includes(term) ||
          x.clientCompany?.toLowerCase().includes(term) ||
          x.clientPhone?.toLowerCase().includes(term) ||
          x.clientEmail?.toLowerCase().includes(term) ||
          x.clientDesignation?.toLowerCase().includes(term) ||
          x.notes?.toLowerCase().includes(term) ||
          x.result?.toLowerCase().includes(term) ||
          x.method?.toLowerCase().includes(term) ||
          x.clientCategory?.toLowerCase().includes(term)
      );
    }

    if (from) {
      list = list.filter((x) => x.dueDate >= from);
    }
    if (to) {
      list = list.filter((x) => x.dueDate <= to);
    }

    if (statusFilter) {
      if (statusFilter === "overdue") {
        list = list.filter((x) => x.status === "pending" && x.dueDate < today);
      } else if (statusFilter === "today") {
        list = list.filter((x) => x.status === "pending" && x.dueDate <= today);
      } else {
        list = list.filter((x) => x.status === statusFilter);
      }
    }

    if (clientFilter) {
      list = list.filter((x) => String(x.clientId) === clientFilter);
    }

    return list;
  }, [data, q, from, to, statusFilter, clientFilter, todayDate]);

  const hasFilters = Boolean(q || from || to || statusFilter || clientFilter);

  const clearFilters = () => {
    setQ("");
    setFrom("");
    setTo("");
    setStatusFilter("");
    setClientFilter("");
    setPage(1);
  };

  // Pagination
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const pageRows = useMemo(() => {
    const start = (cur - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, cur, pageSize]);

  // Result Selection & Auto Date Calculation
  const handleResultChange = (rowId: number, val: string) => {
    const found = RESULT_OPTIONS.find((o) => o.value === val);
    const suggested = found && found.days > 0 ? addDays(todayDate, found.days) : "";
    setRowState((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {
          method: "Phone Call",
          notes: "",
          isSubmitting: false,
          isEditingDate: false,
          dateInput: "",
          isSavingDate: false,
        }),
        result: val,
        nextDate: suggested,
      },
    }));
  };

  const handleMethodChange = (rowId: number, val: string) => {
    setRowState((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {
          result: "",
          notes: "",
          nextDate: "",
          isSubmitting: false,
          isEditingDate: false,
          dateInput: "",
          isSavingDate: false,
        }),
        method: val,
      },
    }));
  };

  const handleNotesChange = (rowId: number, val: string) => {
    setRowState((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {
          result: "",
          method: "Phone Call",
          nextDate: "",
          isSubmitting: false,
          isEditingDate: false,
          dateInput: "",
          isSavingDate: false,
        }),
        notes: val,
      },
    }));
  };

  const handleCustomDateChange = (rowId: number, val: string) => {
    setRowState((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {
          result: "",
          method: "Phone Call",
          notes: "",
          isSubmitting: false,
          isEditingDate: false,
          dateInput: "",
          isSavingDate: false,
        }),
        nextDate: val,
      },
    }));
  };

  // Complete Follow-up Action
  const handleDone = async (row: FollowUpRow) => {
    const curState = rowState[row.id] || {
      result: row.result || "",
      method: row.method || "Phone Call",
      notes: row.notes || "",
      nextDate: "",
    };

    if (!curState.result || curState.result === "Select Result") {
      toast.error("Please select a Next Result before completing.");
      return;
    }
    if (!curState.method) {
      toast.error("Please select a Follow-up Method before completing.");
      return;
    }
    if (curState.result === "General" && !curState.nextDate) {
      toast.error("Please select a next follow-up date for General.");
      return;
    }

    setRowState((prev) => ({
      ...prev,
      [row.id]: { ...prev[row.id], isSubmitting: true },
    }));

    try {
      const scheduledDate =
        curState.nextDate ||
        (RESULT_OPTIONS.find((o) => o.value === curState.result)?.days
          ? addDays(todayDate, RESULT_OPTIONS.find((o) => o.value === curState.result)!.days)
          : addDays(todayDate, 3));

      const res = await fetch("/api/sales/follow-ups/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpId: row.id,
          result: curState.result,
          method: curState.method,
          notes: (curState.notes || "").trim(),
          nextDate: scheduledDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to complete follow-up");
      }

      toast.success(
        `✓ Follow-up marked Done! Next follow-up scheduled for ${fmt.date(scheduledDate)}.`
      );
      fetchFollowUps();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error completing follow-up";
      toast.error(msg);
    } finally {
      setRowState((prev) => ({
        ...prev,
        [row.id]: { ...prev[row.id], isSubmitting: false },
      }));
    }
  };

  // Inline Due Date Editor
  const handleSaveInlineDate = async (rowId: number) => {
    const curState = rowState[rowId];
    if (!curState?.dateInput) {
      toast.error("Please select a valid date");
      return;
    }

    setRowState((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], isSavingDate: true },
    }));

    try {
      const res = await fetch(`/api/sales/follow-ups/${rowId}/date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: curState.dateInput }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update date");
      }
      toast.success("Follow-up date updated!");
      setRowState((prev) => ({
        ...prev,
        [rowId]: { ...prev[rowId], isEditingDate: false, isSavingDate: false },
      }));
      fetchFollowUps();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating date";
      toast.error(msg);
      setRowState((prev) => ({
        ...prev,
        [rowId]: { ...prev[rowId], isSavingDate: false },
      }));
    }
  };

  // Delete Follow-up Record
  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await api(`/api/r/follow_ups/${delTarget.id}`, { method: "DELETE" });
      toast.success("Follow-up deleted successfully");
      setDelTarget(null);
      fetchFollowUps();
    } catch (e) {
      toast.error((e as Error).message);
      setDelTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // Export Specification
  const exportColumns = useMemo<Col[]>(
    () => [
      { key: "clientName", label: "Client Name", type: "text" },
      { key: "clientCompany", label: "Company", type: "text" },
      { key: "dueDate", label: "Follow-up Date", type: "date" },
      { key: "method", label: "Follow-up Method", type: "text" },
      { key: "result", label: "Next Result", type: "text" },
      { key: "status", label: "Status", type: "text" },
      { key: "notes", label: "Notes / Remarks", type: "text" },
    ],
    []
  );

  const getExportSpec = (): ExportSpec => ({
    title: "Sales Follow-ups Report",
    department: "Sales Department",
    columns: exportColumns.filter((c) => !hiddenCols.has(c.key)),
    rows: filtered as unknown as Record<string, unknown>[],
    settings,
    orientation: "landscape",
  });

  const handleExport = async (format: "pdf" | "xlsx") => {
    setBusyExport(true);
    try {
      const spec = getExportSpec();
      if (format === "pdf") await exportPdf(spec);
      else await exportExcel(spec);
      toast.success(`Exported ${format.toUpperCase()} successfully`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusyExport(false);
      setMenu(null);
    }
  };

  // Column toggle definitions
  const columnDefs = [
    { key: "client", label: "Client & Company" },
    { key: "dueDate", label: "Follow-up Date" },
    { key: "method", label: "Follow-up Method" },
    { key: "result", label: "Next Result" },
    { key: "notes", label: "Remarks / Notes" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        subtitle="Schedule and track client follow-ups with automatic recurrence."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={fetchFollowUps}
              disabled={loading}
              title="Refresh records"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            {can.create && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setDrawer({ mode: "create" })}
              >
                <Plus className="h-4 w-4" /> Add Follow-up
              </Button>
            )}
            <ButtonLink href="/sales/clients/new" variant="secondary" size="md">
              <UserPlus className="h-4 w-4" /> Add Client
            </ButtonLink>
          </div>
        }
      />

      {/* Top Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("today")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition-all",
            statusFilter === "today"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>DUE TODAY</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{stats.dueToday}</div>
          <div className="mt-1 text-[11px] text-muted">Due today or overdue</div>
        </div>

        <div
          onClick={() => setStatusFilter("pending")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition-all",
            statusFilter === "pending"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>PENDING</span>
            <Calendar className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400">{stats.pending}</div>
          <div className="mt-1 text-[11px] text-muted">All active follow-ups</div>
        </div>

        <div
          onClick={() => setStatusFilter("overdue")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition-all",
            statusFilter === "overdue"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>OVERDUE</span>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-400">{stats.overdue}</div>
          <div className="mt-1 text-[11px] text-muted">Past scheduled date</div>
        </div>

        <div
          onClick={() => setStatusFilter("done")}
          className={cn(
            "cursor-pointer rounded-2xl border p-4 transition-all",
            statusFilter === "done"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
              : "border-line bg-fg/[0.02] hover:bg-fg/[0.04]"
          )}
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>COMPLETED</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{stats.completed}</div>
          <div className="mt-1 text-[11px] text-muted">Follow-ups completed</div>
        </div>
      </div>

      {/* Main Panel Container matching DataTable */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search records…"
              className="pl-9 text-xs"
              aria-label="Search"
            />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2" ref={menuRef}>
            {/* Columns menu */}
            <div className="relative">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setMenu(menu === "cols" ? null : "cols")}
              >
                <Columns3 className="h-4 w-4" /> Columns
              </Button>
              {menu === "cols" && (
                <div className="anim-fade absolute right-0 z-30 mt-2 max-h-80 w-56 overflow-auto rounded-xl border border-line bg-solid p-2 shadow-xl scroll-thin">
                  {columnDefs.map((c) => (
                    <label
                      key={c.key}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-fg/8"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-accent"
                        checked={!hiddenCols.has(c.key)}
                        onChange={() => toggleCol(c.key)}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export menu */}
            {can.export && (
              <div className="relative">
                <Button
                  variant="secondary"
                  size="md"
                  loading={busyExport}
                  onClick={() => setMenu(menu === "export" ? null : "export")}
                >
                  <Download className="h-4 w-4" /> Export
                </Button>
                {menu === "export" && (
                  <div className="anim-fade absolute right-0 z-30 mt-2 w-52 rounded-xl border border-line bg-solid p-1.5 shadow-xl">
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8"
                      onClick={() => handleExport("pdf")}
                    >
                      <FileText className="h-4 w-4 text-red-500" /> Export PDF
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8"
                      onClick={() => handleExport("xlsx")}
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Excel
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8"
                      onClick={() => {
                        setMenu(null);
                        setPrint({ spec: getExportSpec(), auto: false });
                      }}
                    >
                      <Eye className="h-4 w-4 text-sky-500" /> Print Preview
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8"
                      onClick={() => {
                        setMenu(null);
                        setPrint({ spec: getExportSpec(), auto: true });
                      }}
                    >
                      <Printer className="h-4 w-4 text-violet-500" /> Print
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters Section (From, To, Status, Client) */}
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3 bg-fg/[0.01]">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            From
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-36 h-9 text-xs font-normal normal-case"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            To
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-36 h-9 text-xs font-normal normal-case"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Status
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-44 h-9 text-xs font-normal normal-case"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="today">Due Today</option>
              <option value="overdue">Overdue</option>
              <option value="done">Done / Completed</option>
            </Select>
          </label>

          {clientOptions.length > 0 && (
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Client
              <Select
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-56 h-9 text-xs font-normal normal-case"
              >
                <option value="">All clients</option>
                {clientOptions.map(([id, label]) => (
                  <option key={id} value={String(id)}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          )}

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
        </div>

        {/* Table View */}
        {loading && data.length === 0 ? (
          <Spinner label="Loading follow-up tasks..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchFollowUps} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No matching records" : "No follow-up records yet"}
            description={
              hasFilters
                ? "Try clearing or adjusting your search and filter criteria."
                : "Follow-up tasks you schedule will appear here."
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <ButtonLink href="/sales/clients/new" variant="primary">
                  <UserPlus className="h-4 w-4" /> Add New Client
                </ButtonLink>
              )
            }
          />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted font-semibold bg-fg/[0.02]">
                  <th className="w-12 px-4 py-3">#</th>
                  {!hiddenCols.has("client") && <th className="px-4 py-3">Client</th>}
                  {!hiddenCols.has("dueDate") && (
                    <th className="px-4 py-3 min-w-[170px]">Follow-up Date</th>
                  )}
                  {!hiddenCols.has("method") && (
                    <th className="px-4 py-3 min-w-[140px]">Follow-up Method</th>
                  )}
                  {!hiddenCols.has("result") && (
                    <th className="px-4 py-3 min-w-[185px]">Next Result</th>
                  )}
                  {!hiddenCols.has("notes") && (
                    <th className="px-4 py-3 min-w-[180px]">Remarks / Notes</th>
                  )}
                  {!hiddenCols.has("status") && <th className="px-4 py-3">Status</th>}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const s = rowState[r.id] || {
                    result: r.result || "",
                    method: r.method || "Phone Call",
                    notes: r.notes || "",
                    nextDate: "",
                    isSubmitting: false,
                    isEditingDate: false,
                    dateInput: r.dueDate,
                    isSavingDate: false,
                  };
                  const isDone = r.status === "done";

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-line/60 transition-colors last:border-0 hover:bg-fg/[0.03]"
                    >
                      {/* Serial Number */}
                      <td className="px-4 py-3.5 text-muted align-top text-xs">
                        {(cur - 1) * pageSize + i + 1}
                      </td>

                      {/* Client */}
                      {!hiddenCols.has("client") && (
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-semibold text-fg flex items-center gap-1.5">
                            {r.clientName}
                            {r.clientCategory && (
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                  r.clientCategory === "Potential"
                                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                    : r.clientCategory === "Quotation"
                                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                    : r.clientCategory === "Sale"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                                )}
                              >
                                {r.clientCategory}
                              </span>
                            )}
                          </div>
                          {r.clientDesignation && (
                            <div className="text-xs text-muted mt-0.5">
                              {r.clientDesignation}
                            </div>
                          )}
                          <div className="text-xs font-medium text-fg/80 mt-1">
                            {r.clientCompany || "—"}
                          </div>
                          {r.clientPhone && (
                            <div className="mt-1">
                              <a
                                href={`tel:${r.clientPhone}`}
                                className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent font-medium"
                              >
                                <Phone className="h-3 w-3" />
                                {r.clientPhone}
                              </a>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Follow-up Date (with inline date editor) */}
                      {!hiddenCols.has("dueDate") && (
                        <td className="px-4 py-3.5 align-top min-w-[170px]">
                          {s.isEditingDate ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="date"
                                value={s.dateInput}
                                onChange={(e) =>
                                  setRowState((prev) => ({
                                    ...prev,
                                    [r.id]: { ...prev[r.id], dateInput: e.target.value },
                                  }))
                                }
                                className="h-8 text-xs px-2 w-32"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineDate(r.id)}
                                disabled={s.isSavingDate}
                                className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                                title="Save date"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRowState((prev) => ({
                                    ...prev,
                                    [r.id]: {
                                      ...prev[r.id],
                                      isEditingDate: false,
                                      dateInput: r.dueDate,
                                    },
                                  }))
                                }
                                className="grid h-8 w-8 place-items-center rounded-lg bg-fg/10 text-muted hover:bg-fg/20 border border-line"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-fg">
                                  {fmt.date(r.dueDate)}
                                </span>
                                {!isDone && can.edit && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRowState((prev) => ({
                                        ...prev,
                                        [r.id]: { ...prev[r.id], isEditingDate: true },
                                      }))
                                    }
                                    className="text-muted hover:text-accent p-0.5 rounded transition"
                                    title="Edit scheduled follow-up date"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {r.status === "pending" && r.isOverdue && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                                  <AlertCircle className="h-2.5 w-2.5" /> Overdue
                                </span>
                              )}
                              {r.status === "pending" && r.isToday && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Clock className="h-2.5 w-2.5" /> Due Today
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Follow-up Method Dropdown */}
                      {!hiddenCols.has("method") && (
                        <td className="px-4 py-3.5 align-top min-w-[140px]">
                          {isDone ? (
                            <span className="text-xs text-muted">
                              {r.method || r.type || "—"}
                            </span>
                          ) : (
                            <Select
                              value={s.method || "Phone Call"}
                              onChange={(e) => handleMethodChange(r.id, e.target.value)}
                              className="h-8 text-xs py-1"
                            >
                              {METHOD_OPTIONS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </Select>
                          )}
                        </td>
                      )}

                      {/* Next Result Dropdown & Auto Date Picker */}
                      {!hiddenCols.has("result") && (
                        <td className="px-4 py-3.5 align-top min-w-[185px]">
                          {isDone ? (
                            <span className="text-xs text-muted font-medium">
                              {r.result || "—"}
                            </span>
                          ) : (
                            <div className="space-y-1.5">
                              <Select
                                value={s.result}
                                onChange={(e) => handleResultChange(r.id, e.target.value)}
                                className="h-8 text-xs py-1"
                              >
                                <option value="">Select Result</option>
                                {RESULT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </Select>

                              {/* Show customizable date picker if a result is selected */}
                              {s.result && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] text-muted">
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
                                    onChange={(e) => handleCustomDateChange(r.id, e.target.value)}
                                    className="h-7 text-xs px-2"
                                    title="Customize next follow-up date"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Remarks / Notes Input */}
                      {!hiddenCols.has("notes") && (
                        <td className="px-4 py-3.5 align-top min-w-[180px]">
                          {isDone ? (
                            <span className="text-xs text-muted italic">
                              {r.notes || "—"}
                            </span>
                          ) : (
                            <Input
                              type="text"
                              value={s.notes}
                              onChange={(e) => handleNotesChange(r.id, e.target.value)}
                              placeholder="Remarks / note..."
                              className="h-8 text-xs"
                            />
                          )}
                        </td>
                      )}

                      {/* Status */}
                      {!hiddenCols.has("status") && (
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <Badge
                            tone={
                              r.status === "done"
                                ? "emerald"
                                : r.isOverdue
                                ? "red"
                                : "amber"
                            }
                          >
                            {r.status === "done"
                              ? "Done"
                              : r.isOverdue
                              ? "Overdue"
                              : "Pending"}
                          </Badge>
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* DONE Button */}
                          {!isDone && can.edit && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleDone(r)}
                              loading={s.isSubmitting}
                              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-900/20"
                            >
                              <Check className="h-3.5 w-3.5" />
                              DONE
                            </Button>
                          )}

                          {/* View details */}
                          <button
                            title="View details"
                            onClick={() => setDrawer({ mode: "view", row: r })}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-fg/5 text-fg/80 hover:bg-fg/12 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit record */}
                          {can.edit && (
                            <button
                              title="Edit record"
                              onClick={() => setDrawer({ mode: "edit", row: r })}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-fg/5 text-fg/80 hover:bg-fg/12 transition"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Delete record */}
                          {can.delete && (
                            <button
                              title="Delete record"
                              onClick={() => setDelTarget(r)}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-fg/5 text-red-500 hover:bg-red-500/15 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
            <div className="flex items-center gap-3 text-muted text-xs">
              <span>
                Showing {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, filtered.length)} of{" "}
                {filtered.length}
                {filtered.length !== data.length ? ` (filtered from ${data.length})` : ""}
              </span>
              <Select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 w-24 text-xs"
                aria-label="Rows per page"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={cur <= 1}
                onClick={() => setPage(cur - 1)}
                className="h-8 text-xs"
              >
                Prev
              </Button>
              <span className="px-2 text-xs text-muted">
                Page {cur} / {pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={cur >= pages}
                onClick={() => setPage(cur + 1)}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer for View / Edit / Create */}
      <Drawer
        open={Boolean(drawer)}
        onClose={() => setDrawer(null)}
        title={
          drawer?.mode === "create"
            ? "Add Follow-up"
            : drawer?.mode === "edit"
            ? "Edit Follow-up"
            : "Follow-up Details"
        }
        subtitle={
          drawer?.row
            ? `${drawer.row.clientName} (${drawer.row.clientCompany || "Client"})`
            : undefined
        }
        wide
        footer={
          drawer?.mode === "view" && drawer.row ? (
            <>
              {can.edit && (
                <Button
                  variant="primary"
                  onClick={() => setDrawer({ mode: "edit", row: drawer.row })}
                >
                  Edit Record
                </Button>
              )}
              <Button variant="secondary" onClick={() => setDrawer(null)}>
                Close
              </Button>
            </>
          ) : undefined
        }
      >
        {drawer?.mode === "view" && drawer.row && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Client Name
              </dt>
              <dd className="mt-1 text-sm font-semibold">{drawer.row.clientName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Designation
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {drawer.row.clientDesignation || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Company Name
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {drawer.row.clientCompany || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Current Client Category
              </dt>
              <dd className="mt-1 text-sm font-medium">
                <Badge tone="blue">{drawer.row.clientCategory || "Potential"}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Contact Phone
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {drawer.row.clientPhone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Contact Email
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {drawer.row.clientEmail || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Scheduled Follow-up Date
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {fmt.date(drawer.row.dueDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Status
              </dt>
              <dd className="mt-1 text-sm font-medium">
                <Badge tone={drawer.row.status === "done" ? "emerald" : "amber"}>
                  {drawer.row.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Follow-up Method
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {drawer.row.method || drawer.row.type || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Next Result
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {drawer.row.result || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                Follow-up Notes / Remarks
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm font-medium rounded-xl border border-line bg-fg/[0.02] p-3">
                {drawer.row.notes || "No notes recorded"}
              </dd>
            </div>
          </dl>
        )}

        {(drawer?.mode === "create" || drawer?.mode === "edit") && (
          <ResourceForm
            key={`${drawer.mode}-${drawer.row?.id ?? "new"}`}
            def={def}
            initial={drawer.row}
            onCancel={() => setDrawer(null)}
            onSaved={() => {
              toast.success(
                drawer.mode === "create"
                  ? "Follow-up created"
                  : "Follow-up updated"
              );
              setDrawer(null);
              fetchFollowUps();
            }}
          />
        )}
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(delTarget)}
        title="Delete Follow-up Record?"
        message={
          <>
            Are you sure you want to delete the follow-up record for{" "}
            <b>{delTarget?.clientName || `#${delTarget?.id}`}</b>? This action cannot be
            undone.
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
        loading={deleting}
      />

      {/* Print Sheet Mount */}
      {print && (
        <PrintSheet
          spec={print.spec}
          autoPrint={print.auto}
          onClose={() => setPrint(null)}
        />
      )}
    </div>
  );
}
