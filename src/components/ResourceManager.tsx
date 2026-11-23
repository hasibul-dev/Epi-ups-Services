"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, Plus } from "lucide-react";
import { colsFromFields, cellText } from "@/lib/columns";
import { DEPTS, type DeptCode } from "@/lib/constants";
import { RESOURCES, fieldOptions, getListFields, type ResourceDef } from "@/lib/resource-config";
import { api, useApp, useFmt, useResourceCan, useToast } from "./AppContext";
import { DataTable } from "./DataTable";
import { ResourceForm } from "./ResourceForm";
import { Badge, Button, Card, ConfirmDialog, Drawer, PageHeader, Spinner } from "./ui";

type Row = Record<string, unknown>;

function ClientHistorySection({ clientId }: { clientId: number }) {
  const [works, setWorks] = useState<Row[]>([]);
  const [followUps, setFollowUps] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const fmt = useFmt();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api<{ rows: Row[] }>(`/api/r/sales_work?client=${clientId}`),
      fetch(`/api/sales/follow-ups?status=all`).then((r) => r.json()),
    ])
      .then(([wRes, fuRes]) => {
        if (!mounted) return;
        setWorks(wRes.rows || []);
        const allFu = (fuRes.followUps || []) as Row[];
        setFollowUps(allFu.filter((f) => f.clientId === clientId));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [clientId]);

  if (loading) {
    return <div className="py-4 text-xs text-muted">Loading client history...</div>;
  }

  return (
    <div className="sm:col-span-2 mt-6 space-y-6 border-t border-line pt-6">
      {/* Related Follow-ups */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            Follow-up History &amp; Schedule ({followUps.length})
          </h4>
          <Link
            href="/sales/follow-ups"
            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
          >
            Open Follow-ups &rarr;
          </Link>
        </div>
        {followUps.length === 0 ? (
          <p className="text-xs text-muted italic">No follow-ups recorded for this client.</p>
        ) : (
          <div className="scroll-thin overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-xs text-left">
              <thead className="bg-fg/[0.02] border-b border-line text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Due Date</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold">Result</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((f) => (
                  <tr key={f.id as number} className="border-b border-line/50 last:border-0 hover:bg-fg/[0.02]">
                    <td className="px-3 py-2 font-medium">{fmt.date(f.dueDate as string)}</td>
                    <td className="px-3 py-2">{String(f.method || f.type || "—")}</td>
                    <td className="px-3 py-2">{String(f.result || "—")}</td>
                    <td className="px-3 py-2">
                      <Badge tone={f.status === "done" ? "emerald" : "amber"}>{String(f.status)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted truncate max-w-xs">{String(f.notes || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Related Sales Work Orders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            Related Work Orders ({works.length})
          </h4>
          <Link
            href="/sales/work/new"
            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
          >
            + Add Work &rarr;
          </Link>
        </div>
        {works.length === 0 ? (
          <p className="text-xs text-muted italic">No work orders connected to this client yet.</p>
        ) : (
          <div className="scroll-thin overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-xs text-left">
              <thead className="bg-fg/[0.02] border-b border-line text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Work Title</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {works.map((w) => (
                  <tr key={w.id as number} className="border-b border-line/50 last:border-0 hover:bg-fg/[0.02]">
                    <td className="px-3 py-2 font-medium text-fg">{String(w.title)}</td>
                    <td className="px-3 py-2">{fmt.date(w.dueDate as string)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={w.status === "completed" ? "emerald" : "blue"}>{String(w.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailView({ def, row }: { def: ResourceDef; row: Row }) {
  const { settings } = useApp();
  const cols = colsFromFields(def.fields.filter((f) => !f.virtual || ["paidAmount", "balance", "paymentStatus", "costPerLead", "budgetUsed"].includes(f.name)));
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {cols.map((c) => {
        if (c.type === "files") {
          const files = (row[c.key] as { name: string; dataUrl: string }[]) ?? [];
          return (
            <div key={c.key} className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</dt>
              <dd className="mt-1.5 flex flex-wrap gap-2">
                {files.length === 0 && <span className="text-sm text-muted">—</span>}
                {files.map((a, i) => <a key={i} href={a.dataUrl} download={a.name} className="inline-flex items-center gap-2 rounded-lg border border-line bg-fg/5 px-3 py-1.5 text-sm font-medium hover:bg-fg/10"><Download className="h-4 w-4" />{a.name}</a>)}
              </dd>
            </div>
          );
        }
        const text = cellText(c, row, { settings });
        const long = ["textarea"].includes(def.fields.find((f) => f.name === c.key)?.type ?? "");
        return (
          <div key={c.key} className={long ? "sm:col-span-2" : ""}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{c.type === "select" && row[c.key] ? <Badge tone="blue">{text}</Badge> : text}</dd>
          </div>
        );
      })}
      {def.key === "clients" && typeof row.id === "number" && (
        <ClientHistorySection clientId={row.id} />
      )}
    </dl>
  );
}

export function ResourceManager({ resource, preset, title, subtitle, initialQ }: { resource: string; preset?: string; title?: string; subtitle?: string; initialQ?: string }) {
  const def = RESOURCES[resource];
  const { settings } = useApp();
  const toast = useToast();
  const can = useResourceCan(def);
  const fmt = useFmt();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ mode: "create" | "edit" | "view"; row?: Row } | null>(null);
  const [opening, setOpening] = useState(false);
  const [del, setDel] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ rows: Row[] }>(`/api/r/${def.key}${preset ? `?preset=${preset}` : ""}`);
      setRows(res.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [def.key, preset]);
  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => colsFromFields(getListFields(def)), [def]);
  const statusField = def.fields.find((f) => f.name === def.statusField);
  const catField = def.fields.find((f) => f.name === def.categoryField);
  const statusOptions = useMemo(() => {
    const base = statusField ? fieldOptions(statusField, settings) : [];
    return def.overdue ? [...base, { value: "overdue", label: "Overdue" }] : base;
  }, [statusField, settings, def.overdue]);

  const open = async (mode: "view" | "edit", row: Row) => {
    setOpening(true);
    try {
      const res = await api<{ row: Row }>(`/api/r/${def.key}/${row.id}`);
      setDrawer({ mode, row: res.row });
    } catch (e) { toast.error((e as Error).message); } finally { setOpening(false); }
  };

  const complete = async (row: Row) => {
    try {
      await api(`/api/r/${def.key}/${row.id}`, { method: "PUT", body: JSON.stringify({ [def.statusField ?? "status"]: def.completeAction!.status }) });
      toast.success(`${def.singular} marked as ${def.completeAction!.status.replace(/_/g, " ")}`);
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await api(`/api/r/${def.key}/${del.id}`, { method: "DELETE" });
      toast.success(`${def.singular} deleted`);
      setDel(null);
      load();
    } catch (e) { toast.error((e as Error).message); setDel(null); } finally { setDeleting(false); }
  };

  const dept = DEPTS[def.modules[0] as DeptCode];
  const doneSet = def.overdue?.done ?? (def.completeAction ? [def.completeAction.status, "cancelled"] : []);
  const heading = title ?? def.label;

  return (
    <>
      <PageHeader
        title={heading}
        subtitle={subtitle ?? (preset ? `Filtered view: ${preset.replace(/_/g, " ")}` : undefined)}
        actions={can.create ? <Button variant="primary" size="lg" onClick={() => setDrawer({ mode: "create" })}><Plus className="h-4 w-4" /> Add {def.singular}</Button> : undefined}
      />
      <DataTable
        title={heading}
        storageKey={def.key}
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={load}
        dateField={def.dateField && columns.some((c) => c.key === def.dateField) ? def.dateField : def.dateField && def.dateField !== "createdAt" ? def.dateField : undefined}
        statusKey={def.statusField}
        statusOptions={statusOptions}
        categoryKey={def.categoryField}
        categoryOptions={catField ? fieldOptions(catField, settings) : undefined}
        categoryLabel={catField?.label}
        clientKey={def.clientField}
        initialSearch={initialQ}
        canExport={can.export}
        meta={{ department: dept?.name ?? "EPI UPS" }}
        onView={(r) => open("view", r)}
        onEdit={can.edit ? (r) => open("edit", r) : undefined}
        onDelete={can.delete ? (r) => setDel(r) : undefined}
        rowActions={def.completeAction && can.edit ? (r) => (!doneSet.includes(String(r[def.statusField ?? "status"])) ? <Button size="sm" variant="success" onClick={() => complete(r)}><CheckCircle2 className="h-4 w-4" /> Complete</Button> : null) : undefined}
        emptyAction={can.create ? <Button variant="primary" onClick={() => setDrawer({ mode: "create" })}><Plus className="h-4 w-4" /> Add {def.singular}</Button> : undefined}
      />

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.mode === "create" ? `Add ${def.singular}` : drawer?.mode === "edit" ? `Edit ${def.singular}` : `${def.singular} Details`}
        subtitle={drawer?.row ? String(drawer.row[def.titleField] ?? "") : undefined}
        wide
        footer={drawer?.mode === "view" && drawer.row ? (<>{can.edit && <Button variant="primary" onClick={() => setDrawer({ mode: "edit", row: drawer.row })}>Edit</Button>}<Button onClick={() => setDrawer(null)}>Close</Button></>) : undefined}
      >
        {drawer?.mode === "view" && drawer.row && <DetailView def={def} row={drawer.row} />}
        {(drawer?.mode === "create" || drawer?.mode === "edit") && (
          <ResourceForm key={`${drawer.mode}-${drawer.row?.id ?? "new"}`} def={def} initial={drawer.row} onCancel={() => setDrawer(null)} onSaved={() => { toast.success(drawer.mode === "create" ? `${def.singular} created` : `${def.singular} updated`); setDrawer(null); load(); }} />
        )}
      </Drawer>
      {opening && <div className="no-print fixed inset-0 z-[80] grid place-items-center bg-black/30"><Spinner /></div>}
      <ConfirmDialog open={!!del} title={`Delete ${def.singular}?`} message={<>This will permanently delete <b>{del ? String(del[def.titleField] ?? `#${del.id}`) : ""}</b>. This action cannot be undone.</>} onConfirm={confirmDelete} onCancel={() => setDel(null)} loading={deleting} />
      <span className="hidden">{fmt.today()}</span>
    </>
  );
}

export function ResourceFormPage({ resource, back, title }: { resource: string; back: string; title?: string }) {
  const def = RESOURCES[resource];
  const router = useRouter();
  const toast = useToast();
  const can = useResourceCan(def);
  if (!can.create) return <Card className="p-8 text-center text-sm text-muted">You do not have permission to add {def.label.toLowerCase()}.</Card>;
  return (
    <>
      <PageHeader title={title ?? `Add ${def.singular}`} subtitle="Fill in the details below. Fields marked * are required." />
      <Card className="max-w-4xl p-6">
        <ResourceForm def={def} onCancel={() => router.push(back)} onSaved={() => { toast.success(`${def.singular} saved`); router.push(back); router.refresh(); }} />
      </Card>
    </>
  );
}
