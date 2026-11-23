"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Database, Download, FileUp, KeyRound, Link2, LogOut, Play, Plus, Power, RotateCcw, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { Col } from "@/lib/columns";
import { ACTIONS, DEPTS, DEPT_ORDER, ROLES, ROLE_ORDER, type Action, type DeptCode, type RoleCode } from "@/lib/constants";
import { api, useApp, useCan, useFmt, useToast } from "./AppContext";
import { DataTable, IconBtn } from "./DataTable";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner } from "./ui";

type Row = Record<string, unknown>;

/* ───────────────────────── Users ───────────────────────── */
interface UserRow { id: number; username: string; email: string; name: string; phone: string | null; role: string; department: string; active: boolean; lastLoginAt: string | null; sessionCount: number }

const emptyUser = { username: "", name: "", email: "", phone: "", role: "staff", department: "sales", active: true, password: "" };

export function UserManagement() {
  const { user: me } = useApp();
  const can = useCan();
  const toast = useToast();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<(typeof emptyUser & { id?: number }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [pwFor, setPwFor] = useState<UserRow | null>(null);
  const [pw, setPw] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [del, setDel] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows((await api<{ rows: UserRow[] }>("/api/admin/users")).rows); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cols: Col[] = [
    { key: "name", label: "Name", type: "text" },
    { key: "username", label: "Username", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "role", label: "Role", type: "select", options: ROLE_ORDER.map((r) => ({ value: r, label: ROLES[r].name, tone: r === "super_admin" ? "red" : r === "administrator" ? "purple" : r === "manager" ? "blue" : r === "staff" ? "cyan" : "slate" })) },
    { key: "department", label: "Department", type: "select", options: DEPT_ORDER.map((d) => ({ value: d, label: DEPTS[d].short })) },
    { key: "active", label: "Status", type: "select", options: [{ value: "true", label: "Active", tone: "emerald" }, { value: "false", label: "Deactivated", tone: "red" }] },
    { key: "lastLoginAt", label: "Last Login", type: "datetime" },
    { key: "sessionCount", label: "Sessions", type: "number" },
  ];
  const tableRows = rows.map((r) => ({ ...r, active: String(r.active) })) as unknown as Row[];

  const save = async () => {
    if (!edit) return;
    setSaving(true); setFormErr("");
    try {
      const { id, password, ...rest } = edit;
      if (id) await api(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(rest) });
      else await api("/api/admin/users", { method: "POST", body: JSON.stringify({ ...rest, password }) });
      toast.success(id ? "User updated" : "User created");
      setEdit(null); load();
    } catch (e) { setFormErr((e as Error).message); } finally { setSaving(false); }
  };

  const action = async (u: UserRow, body: Record<string, unknown>, ok: string) => {
    try {
      const r = await api<{ link?: string }>(`/api/admin/users/${u.id}`, { method: "POST", body: JSON.stringify(body) });
      if (r.link) setLink(r.link); else toast.success(ok);
      load();
    } catch (e) { toast.error((e as Error).message); }
  };
  const toggle = async (u: UserRow) => {
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PUT", body: JSON.stringify({ username: u.username, email: u.email, name: u.name, phone: u.phone, role: u.role, department: u.department, active: !u.active }) });
      toast.success(u.active ? "Account deactivated and sessions revoked" : "Account activated");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="User Management" subtitle="Create accounts, assign roles and departments, activate or deactivate access, and manage sessions."
        actions={can(["admin"], "create") ? <Button variant="primary" size="lg" onClick={() => { setFormErr(""); setEdit({ ...emptyUser }); }}><Plus className="h-4 w-4" /> Add User</Button> : undefined} />
      <DataTable title="Users" columns={cols} rows={tableRows} loading={loading} error={error} onRetry={load} storageKey="users" canExport={can(["admin"], "export")} meta={{ department: "Administration" }} statusKey="active" statusOptions={[{ value: "true", label: "Active" }, { value: "false", label: "Deactivated" }]} categoryKey="role" categoryLabel="Role" categoryOptions={ROLE_ORDER.map((r) => ({ value: r, label: ROLES[r].name }))}
        onEdit={can(["admin"], "edit") ? (r) => { setFormErr(""); const u = r as unknown as UserRow; setEdit({ id: u.id, username: u.username, name: u.name, email: u.email, phone: u.phone ?? "", role: u.role, department: u.department, active: u.active as unknown as string === "true" || u.active === true, password: "" }); } : undefined}
        onDelete={can(["admin"], "delete") ? (r) => setDel(r as unknown as UserRow) : undefined}
        rowActions={can(["admin"], "edit") ? (r) => {
          const u = r as unknown as UserRow;
          const isActive = (u.active as unknown) === "true" || u.active === true;
          return (<>
            <IconBtn label="Set new password" onClick={() => { setPw(""); setPwFor(u); }}><KeyRound className="h-4 w-4" /></IconBtn>
            <IconBtn label="Issue password-reset link" onClick={() => action(u, { action: "reset_link" }, "")}><Link2 className="h-4 w-4" /></IconBtn>
            <IconBtn label="Revoke all sessions" onClick={() => action(u, { action: "revoke_sessions" }, "Sessions revoked")}><LogOut className="h-4 w-4" /></IconBtn>
            <IconBtn label={isActive ? "Deactivate account" : "Activate account"} disabled={u.id === me.id} onClick={() => toggle({ ...u, active: isActive })}><Power className={`h-4 w-4 ${isActive ? "text-emerald-500" : "text-red-500"}`} /></IconBtn>
          </>);
        } : undefined} />

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit User" : "Add User"} size="md" footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save User</Button></>}>
        {edit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formErr && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500 sm:col-span-2">{formErr}</div>}
            <Field label="Full name" required><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Username" required><Input value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} autoComplete="off" /></Field>
            <Field label="Email" required><Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Role" required><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{ROLE_ORDER.filter((r) => r !== "super_admin" || me.role === "super_admin").map((r) => <option key={r} value={r}>{ROLES[r].name}</option>)}</Select></Field>
            <Field label="Department" required><Select value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })}>{DEPT_ORDER.map((d) => <option key={d} value={d}>{DEPTS[d].name}</option>)}</Select></Field>
            {!edit.id && <Field label="Initial password" required hint="At least 8 characters, letters and numbers" className="sm:col-span-2"><Input type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" /></Field>}
            <label className="flex h-10 items-center gap-3 text-sm font-medium sm:col-span-2"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Account active</label>
            <p className="text-xs text-muted sm:col-span-2">{ROLES[edit.role as RoleCode]?.description}. Non-administrator roles can only access their own department.</p>
          </div>
        )}
      </Modal>

      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`Set password — ${pwFor?.username ?? ""}`} size="sm" footer={<><Button onClick={() => setPwFor(null)}>Cancel</Button><Button variant="primary" onClick={async () => { await action(pwFor!, { action: "reset_password", password: pw }, "Password updated; user signed out everywhere"); setPwFor(null); }}>Set Password</Button></>}>
        <Field label="New password" hint="The user will be signed out of all sessions"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
      </Modal>

      <Modal open={!!link} onClose={() => setLink(null)} title="Password reset link" size="md" footer={<Button onClick={() => setLink(null)}>Done</Button>}>
        <p className="mb-3 text-sm text-muted">Send this one-time link to the user. It expires in 1 hour and works once.</p>
        <div className="flex gap-2"><Input readOnly value={link ?? ""} onFocus={(e) => e.currentTarget.select()} /><Button onClick={() => { navigator.clipboard?.writeText(link ?? ""); toast.success("Link copied"); }}><Copy className="h-4 w-4" /> Copy</Button></div>
      </Modal>

      <ConfirmDialog open={!!del} title="Delete user?" message={<>Delete <b>{del?.name}</b> ({del?.username}) permanently? Records assigned to this user will become unassigned. Consider deactivating instead.</>} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await api(`/api/admin/users/${del!.id}`, { method: "DELETE" }); toast.success("User deleted"); load(); } catch (e) { toast.error((e as Error).message); } setDel(null); }} />
    </>
  );
}

/* ───────────────────────── Roles & Permissions ───────────────────────── */
type PermRow = { role: string; module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canExport: boolean };
const KEY: Record<Action, keyof PermRow> = { view: "canView", create: "canCreate", edit: "canEdit", delete: "canDelete", export: "canExport" };

export function RolePermissions() {
  const { user } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState<PermRow[]>([]);
  const [role, setRole] = useState<RoleCode>("manager");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editable = user.role === "super_admin";

  useEffect(() => {
    api<{ rows: PermRow[] }>("/api/admin/permissions").then((r) => setRows(r.rows)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  const get = (m: string): PermRow => rows.find((r) => r.role === role && r.module === m) ?? { role, module: m, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false };
  const set = (m: string, a: Action, v: boolean) => {
    setRows((rs) => {
      const cur = rs.find((r) => r.role === role && r.module === m) ?? get(m);
      const next = { ...cur, [KEY[a]]: v } as PermRow;
      if (a === "view" && !v) { next.canCreate = next.canEdit = next.canDelete = next.canExport = false; }
      else if (a !== "view" && v) next.canView = true;
      return [...rs.filter((r) => !(r.role === role && r.module === m)), next];
    });
  };
  const save = async () => {
    setSaving(true);
    try { await api("/api/admin/permissions", { method: "PUT", body: JSON.stringify({ rows: rows.filter((r) => r.role !== "super_admin") }) }); toast.success("Permissions saved. They apply immediately."); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  return (
    <>
      <PageHeader title="Roles & Permissions" subtitle="Permissions are enforced on the server for every request. Non-administrator roles are additionally limited to their own department."
        actions={editable ? <Button variant="primary" size="lg" loading={saving} onClick={save}><ShieldCheck className="h-4 w-4" /> Save Permissions</Button> : <Badge tone="amber">Read-only — Super Administrator required to edit</Badge>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {ROLE_ORDER.map((r) => <button key={r} onClick={() => setRole(r)} className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${role === r ? "border-accent bg-accent/15 text-accent" : "border-line hover:bg-fg/8"}`}>{ROLES[r].name}</button>)}
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4 text-sm text-muted">{ROLES[role].description}</div>
        {role === "super_admin" ? <EmptyState title="Full access" description="The Super Administrator always has every permission in every department and cannot be restricted." /> : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted"><th className="px-5 py-3">Module / Department</th>{ACTIONS.map((a) => <th key={a} className="px-5 py-3 text-center capitalize">{a}</th>)}</tr></thead>
              <tbody>
                {DEPT_ORDER.map((m) => {
                  const row = get(m);
                  return (
                    <tr key={m} className="border-t border-line/60">
                      <td className="px-5 py-3"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: DEPTS[m as DeptCode].color }} /><b>{DEPTS[m as DeptCode].name}</b></td>
                      {ACTIONS.map((a) => <td key={a} className="px-5 py-3 text-center"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" disabled={!editable} checked={!!row[KEY[a]]} onChange={(e) => set(m, a, e.target.checked)} aria-label={`${m} ${a}`} /></td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ───────────────────────── Backup & Restore ───────────────────────── */
interface BackupRow { id: number; name: string; kind: string; sizeBytes: number; checksum: string; tableCounts: Record<string, number>; createdAt: string; createdBy: string | null }
interface RestoreTarget { backupId?: number; payload?: string; fileName: string; counts: Record<string, number>; createdAt: string }

export function BackupManager() {
  const { user } = useApp();
  const fmt = useFmt();
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<RestoreTarget | null>(null);
  const [confirm, setConfirm] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [del, setDel] = useState<BackupRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows((await api<{ rows: BackupRow[] }>("/api/admin/backups")).rows); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user.role === "super_admin") load(); else setLoading(false); }, [load, user.role]);

  if (user.role !== "super_admin") return <Card className="p-10 text-center text-sm text-muted">Backup & restore is limited to the Super Administrator.</Card>;

  const create = async () => {
    setCreating(true);
    try { await api("/api/admin/backups", { method: "POST", body: JSON.stringify({ name }) }); toast.success("Backup created"); setName(""); load(); } catch (e) { toast.error((e as Error).message); } finally { setCreating(false); }
  };
  const validate = async (b: BackupRow) => {
    setBusyId(b.id);
    try { const r = await api<{ counts: Record<string, number> }>(`/api/admin/backups/${b.id}?validate=1`); toast.success(`Backup is valid — ${Object.values(r.counts).reduce((a, n) => a + n, 0)} records, checksum verified`); } catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
  };
  const prepareRestore = async (b: BackupRow) => {
    setBusyId(b.id);
    try {
      const r = await api<{ counts: Record<string, number>; createdAt: string }>("/api/admin/restore", { method: "POST", body: JSON.stringify({ backupId: b.id, mode: "validate" }) });
      setConfirm(""); setTarget({ backupId: b.id, fileName: b.name, counts: r.counts, createdAt: r.createdAt });
    } catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const payload = await file.text();
      const r = await api<{ counts: Record<string, number>; createdAt: string }>("/api/admin/restore", { method: "POST", body: JSON.stringify({ payload, mode: "validate", fileName: file.name }) });
      setConfirm(""); setTarget({ payload, fileName: file.name, counts: r.counts, createdAt: r.createdAt });
    } catch (e) { toast.error((e as Error).message); }
  };
  const restore = async () => {
    if (!target) return;
    setRestoring(true);
    try {
      await api("/api/admin/restore", { method: "POST", body: JSON.stringify({ backupId: target.backupId, payload: target.payload, fileName: target.fileName, mode: "restore", confirm }) });
      toast.success("Restore complete. Signing you out…");
      setTimeout(() => { router.push("/login"); router.refresh(); }, 1500);
    } catch (e) { toast.error((e as Error).message); setRestoring(false); }
  };

  const cols: Col[] = [
    { key: "name", label: "Backup", type: "text" },
    { key: "kind", label: "Type", type: "select", options: [{ value: "manual", label: "Manual", tone: "blue" }, { value: "auto", label: "Scheduled", tone: "emerald" }, { value: "pre-restore", label: "Pre-restore", tone: "amber" }] },
    { key: "createdAt", label: "Created", type: "datetime" },
    { key: "createdBy", label: "By", type: "text" },
    { key: "size", label: "Size", type: "text" },
    { key: "records", label: "Records", type: "number" },
  ];
  const tableRows = rows.map((b) => ({ ...b, size: `${(b.sizeBytes / 1024).toFixed(1)} KB`, records: Object.values(b.tableCounts).reduce((a, n) => a + n, 0) })) as unknown as Row[];
  const total = target ? Object.values(target.counts).reduce((a, n) => a + n, 0) : 0;

  return (
    <>
      <PageHeader title="Backup & Restore" subtitle="Full database snapshots with integrity checksum. Restoring replaces ALL current data and always takes a safety backup first." />
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Backup name (optional)" className="min-w-[240px] flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. before-month-end" /></Field>
          <Button variant="primary" size="lg" loading={creating} onClick={create}><Database className="h-4 w-4" /> Create Backup</Button>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-fg/5 px-5 text-sm font-semibold hover:bg-fg/10"><Upload className="h-4 w-4" /> Import Backup File<input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} /></label>
        </div>
      </Card>
      <DataTable title="Backup History" columns={cols} rows={tableRows} loading={loading} error={error} onRetry={load} hideFilters storageKey="backups" meta={{ department: "Administration" }} emptyTitle="No backups yet"
        rowActions={(r) => {
          const b = r as unknown as BackupRow;
          return (<>
            <IconBtn label="Validate integrity" disabled={busyId === b.id} onClick={() => validate(b)}><ShieldCheck className="h-4 w-4" /></IconBtn>
            <a href={`/api/admin/backups/${b.id}`} title="Export / download" aria-label="Download" className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-fg/5 hover:bg-fg/12"><Download className="h-4 w-4" /></a>
            <IconBtn label="Restore…" disabled={busyId === b.id} onClick={() => prepareRestore(b)}><RotateCcw className="h-4 w-4 text-amber-500" /></IconBtn>
          </>);
        }}
        onDelete={(r) => setDel(r as unknown as BackupRow)} />
      <p className="mt-3 text-xs text-muted">Retention keeps the newest backups as configured in System Settings. Pre-restore safety backups are kept in the same history.</p>

      <Modal open={!!target} onClose={() => !restoring && setTarget(null)} title="Confirm restore" size="md" footer={<><Button disabled={restoring} onClick={() => setTarget(null)}>Cancel</Button><Button variant="danger" loading={restoring} disabled={confirm !== "RESTORE"} onClick={restore}><FileUp className="h-4 w-4" /> Restore & Replace Data</Button></>}>
        {target && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300"><b>Warning:</b> this replaces ALL current application data (users, clients, work, finance…) with the backup content. A safety backup of the current data is created first. All users, including you, will be signed out.</div>
            <p><b>Source:</b> {target.fileName}<br /><b>Backup created:</b> {fmt.dateTime(target.createdAt)}<br /><b>Validation:</b> <span className="text-emerald-500">structure and checksum OK</span> — {total} records</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border border-line p-3 text-xs sm:grid-cols-3">{Object.entries(target.counts).map(([k, v]) => <div key={k} className="flex justify-between gap-2"><span className="text-muted">{k.replace(/_/g, " ")}</span><b>{v}</b></div>)}</div>
            <Field label='Type "RESTORE" to confirm'><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESTORE" autoComplete="off" /></Field>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title="Delete backup?" message={<>Delete backup <b>{del?.name}</b>? This cannot be undone.</>} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await api(`/api/admin/backups/${del!.id}`, { method: "DELETE" }); toast.success("Backup deleted"); load(); } catch (e) { toast.error((e as Error).message); } setDel(null); }} />
    </>
  );
}

/* ───────────────────────── Database management ───────────────────────── */
export function DatabaseManager() {
  const { user } = useApp();
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState<{ counts: Record<string, number>; sizeBytes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const load = useCallback(() => { api<{ counts: Record<string, number>; sizeBytes: number }>("/api/admin/seed").then(setData).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (user.role === "super_admin") load(); }, [load, user.role]);

  if (user.role !== "super_admin") return <Card className="p-10 text-center text-sm text-muted">Database management is limited to the Super Administrator.</Card>;
  if (error) return <ErrorState message={error} onRetry={() => { setError(null); load(); }} />;
  if (!data) return <Spinner />;
  const total = Object.values(data.counts).reduce((a, n) => a + n, 0);

  const seed = async () => {
    setSeeding(true);
    try { const r = await api<{ seeded: boolean; message: string }>("/api/admin/seed", { method: "POST", body: JSON.stringify({ confirm: true }) }); (r.seeded ? toast.success : toast.error)(r.message); setSeedOpen(false); load(); router.refresh(); } catch (e) { toast.error((e as Error).message); } finally { setSeeding(false); }
  };
  return (
    <>
      <PageHeader title="Database Management" subtitle="Live record counts and size of the PostgreSQL database." actions={<><Button size="lg" onClick={() => router.push("/admin/backup")}><Database className="h-4 w-4" /> Backup & Restore</Button></>} />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total records</p><p className="mt-2 text-3xl font-extrabold">{total.toLocaleString()}</p></Card>
        <Card className="p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">Database size</p><p className="mt-2 text-3xl font-extrabold">{(data.sizeBytes / 1024 / 1024).toFixed(2)} MB</p></Card>
        <Card className="p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-muted">Tables tracked</p><p className="mt-2 text-3xl font-extrabold">{Object.keys(data.counts).length}</p></Card>
      </div>
      <Card className="mb-5 overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted"><th className="px-5 py-3">Table</th><th className="px-5 py-3 text-right">Records</th></tr></thead>
          <tbody>{Object.entries(data.counts).map(([k, v]) => <tr key={k} className="border-t border-line/60"><td className="px-5 py-2.5 font-mono text-[13px]">{k}</td><td className="px-5 py-2.5 text-right tabular-nums">{v.toLocaleString()}</td></tr>)}</tbody></table>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold">Optional demo data</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted">Loads sample clients, work, tickets, invoices and demo users so you can explore the system. It is never loaded automatically and only works on a system that has no clients yet. Demo users share the password <code className="rounded bg-fg/10 px-1.5">Demo@12345</code> — remove them before going live.</p>
        <Button className="mt-4" size="lg" onClick={() => setSeedOpen(true)}><Play className="h-4 w-4" /> Load Demo Data…</Button>
      </Card>
      <ConfirmDialog open={seedOpen} title="Load demo data?" confirmLabel="Load demo data" message="This adds sample records and demo user accounts. Continue?" onCancel={() => setSeedOpen(false)} onConfirm={seed} loading={seeding} />
      <span className="hidden"><Trash2 /></span>
    </>
  );
}
