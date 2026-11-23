"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Save, Trash2, Upload } from "lucide-react";
import { DEPT_SETTINGS, type DeptCode } from "@/lib/constants";
import { api, useApp, useCan, useToast } from "./AppContext";
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from "./ui";

const FALLBACK_TZ = ["Asia/Dhaka", "Asia/Kolkata", "Asia/Karachi", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "UTC"];

function useSave(keys: string[]) {
  const { settings, setSettings } = useApp();
  const toast = useToast();
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(keys.map((k) => [k, settings[k] ?? ""])));
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ settings: Record<string, string> }>("/api/settings", { method: "PUT", body: JSON.stringify(vals) });
      setSettings(r.settings);
      toast.success("Settings saved");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return { vals, set, save, busy };
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </Card>
  );
}

const SYSTEM_KEYS = [
  "company.name", "company.address", "company.phone", "company.email", "company.website", "company.logo",
  "theme.default", "format.date", "format.timezone", "format.currency",
  "print.orientation", "print.footer", "print.signatures",
  "notify.enabled", "notify.upcomingDays", "notify.warrantyDays", "backup.retention",
];

export function SystemSettings() {
  const can = useCan();
  const toast = useToast();
  const { vals, set, save, busy } = useSave(SYSTEM_KEYS);
  const editable = can(["admin"], "edit");
  const tzs = useMemo(() => {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? FALLBACK_TZ;
    return all.includes("Asia/Dhaka") ? all : ["Asia/Dhaka", ...all];
  }, []);

  const onLogo = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) return toast.error("Logo must be PNG, JPEG, SVG or WebP");
    if (file.size > 500_000) return toast.error("Logo must be under 500 KB");
    const r = new FileReader();
    r.onload = () => set("company.logo", String(r.result));
    r.readAsDataURL(file);
  };
  const dis = !editable;

  return (
    <>
      <PageHeader title="System Settings" subtitle="Company identity, regional formats, print defaults, notifications and backup retention."
        actions={editable ? <Button variant="primary" size="lg" loading={busy} onClick={save}><Save className="h-4 w-4" /> Save Settings</Button> : undefined} />
      <div className="space-y-5">
        <Section title="Company Information" description="Shown on the top bar, printed reports, PDF and Excel exports.">
          <Field label="Company name"><Input disabled={dis} value={vals["company.name"]} onChange={(e) => set("company.name", e.target.value)} /></Field>
          <Field label="Phone"><Input disabled={dis} value={vals["company.phone"]} onChange={(e) => set("company.phone", e.target.value)} /></Field>
          <Field label="Email"><Input disabled={dis} value={vals["company.email"]} onChange={(e) => set("company.email", e.target.value)} /></Field>
          <Field label="Website"><Input disabled={dis} value={vals["company.website"]} onChange={(e) => set("company.website", e.target.value)} /></Field>
          <Field label="Address" className="md:col-span-2"><Input disabled={dis} value={vals["company.address"]} onChange={(e) => set("company.address", e.target.value)} /></Field>
          <div className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Company logo</span>
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vals["company.logo"] || "/logo.svg"} alt="Logo preview" className="h-16 w-auto rounded-lg bg-white p-1" />
              {editable && (<>
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-fg/5 px-4 text-sm font-semibold hover:bg-fg/10"><Upload className="h-4 w-4" /> Upload logo<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} /></label>
                {vals["company.logo"] && <Button onClick={() => set("company.logo", "")}><Trash2 className="h-4 w-4" /> Use default</Button>}
              </>)}
            </div>
            <p className="mt-1 text-xs text-muted">PNG / JPEG / SVG / WebP under 500 KB. Used in the app and on all printed and exported reports.</p>
          </div>
        </Section>

        <Section title="Regional & Theme">
          <Field label="Date format"><Select disabled={dis} value={vals["format.date"]} onChange={(e) => set("format.date", e.target.value)}><option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Select></Field>
          <Field label="Time zone"><Select disabled={dis} value={vals["format.timezone"]} onChange={(e) => set("format.timezone", e.target.value)}>{tzs.map((z) => <option key={z}>{z}</option>)}</Select></Field>
          <Field label="Currency symbol"><Input disabled={dis} value={vals["format.currency"]} onChange={(e) => set("format.currency", e.target.value)} maxLength={6} /></Field>
          <Field label="Default theme" hint="Used until a user picks their own with the top-bar toggle"><Select disabled={dis} value={vals["theme.default"]} onChange={(e) => set("theme.default", e.target.value)}><option value="dark">Dark</option><option value="light">Light</option></Select></Field>
        </Section>

        <Section title="Print Settings" description="Defaults used by every report's print preview, PDF and Excel export.">
          <Field label="Default orientation"><Select disabled={dis} value={vals["print.orientation"]} onChange={(e) => set("print.orientation", e.target.value)}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></Select></Field>
          <Field label="Signature labels" hint="Comma-separated, shown on reports with a signature section"><Input disabled={dis} value={vals["print.signatures"]} onChange={(e) => set("print.signatures", e.target.value)} /></Field>
          <Field label="Footer text" className="md:col-span-2"><Input disabled={dis} value={vals["print.footer"]} onChange={(e) => set("print.footer", e.target.value)} /></Field>
        </Section>

        <Section title="Notifications & Backup">
          <Field label="Notifications"><Select disabled={dis} value={vals["notify.enabled"]} onChange={(e) => set("notify.enabled", e.target.value)}><option value="true">Enabled</option><option value="false">Disabled</option></Select></Field>
          <Field label="Upcoming work window (days)"><Input disabled={dis} type="number" min={1} max={60} value={vals["notify.upcomingDays"]} onChange={(e) => set("notify.upcomingDays", e.target.value)} /></Field>
          <Field label="Warranty alert window (days)"><Input disabled={dis} type="number" min={1} max={365} value={vals["notify.warrantyDays"]} onChange={(e) => set("notify.warrantyDays", e.target.value)} /></Field>
          <Field label="Backups to keep (retention)" hint="Older backups are removed automatically. Scheduled backups use /api/cron/backup (see README)."><Input disabled={dis} type="number" min={1} max={200} value={vals["backup.retention"]} onChange={(e) => set("backup.retention", e.target.value)} /></Field>
        </Section>
      </div>
    </>
  );
}

export function DeptSettings({ dept }: { dept: DeptCode }) {
  const fields = DEPT_SETTINGS[dept] ?? [];
  const can = useCan();
  const { vals, set, save, busy } = useSave(fields.map((f) => f.key));
  const editable = can([dept], "edit");
  return (
    <>
      <PageHeader title="Settings" subtitle="Department-level configuration." actions={editable ? <Button variant="primary" size="lg" loading={busy} onClick={save}><Save className="h-4 w-4" /> Save Settings</Button> : undefined} />
      <Card className="max-w-3xl space-y-5 p-6">
        {fields.length === 0 && <p className="text-sm text-muted">No configurable settings for this department.</p>}
        {fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.help}>
            {f.type === "list" ? <Textarea disabled={!editable} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} /> : <Input disabled={!editable} type={f.type === "number" ? "number" : "text"} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
          </Field>
        ))}
      </Card>
    </>
  );
}
