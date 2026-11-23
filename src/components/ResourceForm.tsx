"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, Save, X } from "lucide-react";
import { buildSchema, defaultValues, fieldOptions, formFields, type FieldDef, type Option, type ResourceDef } from "@/lib/resource-config";
import { api, useApp, useFmt } from "./AppContext";
import { Button, Field, Input, Select, Textarea } from "./ui";

const refCache = new Map<string, { at: number; p: Promise<Option[]> }>();
export function loadRefOptions(ref: string, fresh = false): Promise<Option[]> {
  const hit = refCache.get(ref);
  if (hit && !fresh && Date.now() - hit.at < 30_000) return hit.p;
  const p = api<{ options: { value: number; label: string }[] }>(`/api/options/${ref}`).then((r) => r.options.map((o) => ({ value: String(o.value), label: o.label })));
  refCache.set(ref, { at: Date.now(), p });
  return p;
}
export function useRefOptions(ref?: string) {
  const [opts, setOpts] = useState<Option[]>([]);
  useEffect(() => {
    if (!ref) return;
    let on = true;
    loadRefOptions(ref).then((o) => on && setOpts(o)).catch(() => undefined);
    return () => { on = false; };
  }, [ref]);
  return opts;
}

export function toFormValues(def: ResourceDef, row: Record<string, unknown>, today: string): Record<string, unknown> {
  const base = defaultValues(def, today);
  const out: Record<string, unknown> = {};
  for (const f of formFields(def)) {
    const v = row[f.name];
    if (f.type === "boolean") out[f.name] = !!v;
    else if (f.type === "files") out[f.name] = Array.isArray(v) ? v : [];
    else if (v === null || v === undefined) out[f.name] = "";
    else if (f.type === "ref" && f.ref === "clients") {
      out[f.name] = String(row[`${f.name}__label`] || row.clientName || v);
    }
    else out[f.name] = f.type === "ref" ? String(v) : v;
  }
  return { ...base, ...out };
}

function ClientComboboxInput({
  f,
  value,
  onChange,
  error,
  disabled,
}: {
  f: FieldDef;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const opts = useRefOptions("clients");
  const listId = `datalist-clients-${f.name}`;

  return (
    <Field
      label={f.label}
      required={f.required}
      error={error}
      hint="Type client name manually or select from suggestions"
    >
      <div className="relative">
        <Input
          type="text"
          list={listId}
          placeholder={f.placeholder || "Enter client name..."}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        <datalist id={listId}>
          {opts.map((o) => (
            <option key={o.value} value={o.label} />
          ))}
        </datalist>
      </div>
    </Field>
  );
}

function RefSelect({ f, reg, error, disabled }: { f: FieldDef; reg: ReturnType<ReturnType<typeof useForm>["register"]>; error?: string; disabled?: boolean }) {
  const opts = useRefOptions(f.ref);
  return (
    <Field label={f.label} required={f.required} error={error}>
      <Select {...reg} disabled={disabled}>
        <option value="">{f.required ? "Select…" : "— None —"}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Field>
  );
}

interface Props {
  def: ResourceDef;
  initial?: Record<string, unknown> | null;
  onSaved: (row: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function ResourceForm({ def, initial, onSaved, onCancel }: Props) {
  const { settings } = useApp();
  const fmt = useFmt();
  const editing = !!initial?.id;
  const schema = useMemo(() => buildSchema(def), [def]);
  const form = useForm<FieldValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: initial ? toFormValues(def, initial, fmt.today()) : defaultValues(def, fmt.today()),
  });
  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } = form;
  const [serverError, setServerError] = useState("");
  const category = def.categoryField ? (watch(def.categoryField) as string) : undefined;
  const fields = formFields(def);
  const files = (watch(fields.find((f) => f.type === "files")?.name ?? "__none") as unknown) as { name: string; size: number; type: string; dataUrl: string }[] | undefined;

  const onSubmit = handleSubmit(async (values) => {
    setServerError("");
    try {
      const res = await api<{ row: Record<string, unknown> }>(editing ? `/api/r/${def.key}/${initial!.id}` : `/api/r/${def.key}`, { method: editing ? "PUT" : "POST", body: JSON.stringify(values) });
      onSaved(res.row);
    } catch (e) {
      const err = e as Error & { fieldErrors?: Record<string, string> };
      if (err.fieldErrors) for (const [k, m] of Object.entries(err.fieldErrors)) if (k !== "_" && fields.some((f) => f.name === k)) setError(k, { message: m });
      setServerError(err.message);
    }
  });

  const addFiles = async (name: string, list: FileList | null) => {
    if (!list) return;
    const cur = (form.getValues(name) as unknown[]) ?? [];
    const next = [...cur];
    for (const file of Array.from(list)) {
      if (file.size > 1_000_000) { setServerError(`“${file.name}” is larger than 1 MB`); continue; }
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
      next.push({ name: file.name, size: file.size, type: file.type, dataUrl });
    }
    setValue(name, next, { shouldDirty: true });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {serverError && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{serverError}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((f) => {
          if (f.showFor && !(category && f.showFor.includes(category))) return null;
          const label = (category && f.labels?.[category]) || f.label;
          const ff = { ...f, label };
          const err = errors[f.name]?.message as string | undefined;
          const span = f.full || f.type === "textarea" || f.type === "files" ? "md:col-span-2" : "";
          if (f.type === "ref") {
            if (f.ref === "clients") {
              return (
                <div key={f.name} className={span}>
                  <ClientComboboxInput
                    f={ff}
                    value={(watch(f.name) as string) ?? ""}
                    onChange={(val) => setValue(f.name, val, { shouldValidate: true, shouldDirty: true })}
                    error={err}
                  />
                </div>
              );
            }
            return <div key={f.name} className={span}><RefSelect f={ff} reg={register(f.name)} error={err} /></div>;
          }
          if (f.type === "select") {
            const opts = fieldOptions(f, settings);
            return (
              <Field key={f.name} label={label} required={f.required} error={err} className={span}>
                <Select {...register(f.name)}>
                  <option value="">{f.required ? "Select…" : "— None —"}</option>
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            );
          }
          if (f.type === "textarea") return <Field key={f.name} label={label} required={f.required} error={err} className={span}><Textarea {...register(f.name)} placeholder={f.placeholder} /></Field>;
          if (f.type === "boolean") return (
            <label key={f.name} className="flex h-10 items-center gap-3 self-end text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" {...register(f.name)} /> {label}</label>
          );
          if (f.type === "files") return (
            <Field key={f.name} label={label} className={span} hint="Up to 1 MB per file">
              <div className="rounded-xl border border-dashed border-line p-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-fg/5 px-3 py-2 text-sm font-semibold hover:bg-fg/10"><Paperclip className="h-4 w-4" /> Add files<input type="file" multiple className="hidden" onChange={(e) => { addFiles(f.name, e.target.files); e.target.value = ""; }} /></label>
                <ul className="mt-2 space-y-1.5">
                  {(files ?? []).map((a, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-fg/5 px-3 py-1.5 text-sm"><span className="truncate">{a.name} <span className="text-muted">({Math.round(a.size / 1024)} KB)</span></span>
                      <button type="button" className="text-red-500" onClick={() => setValue(f.name, (files ?? []).filter((_, j) => j !== i), { shouldDirty: true })} aria-label="Remove"><X className="h-4 w-4" /></button></li>
                  ))}
                </ul>
              </div>
            </Field>
          );
          const type = f.type === "money" || f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "phone" ? "tel" : "text";
          return (
            <Field key={f.name} label={label} required={f.required} error={err} className={span}>
              <Input type={type} step={f.type === "money" ? "0.01" : f.type === "number" ? "1" : undefined} min={f.type === "money" || f.type === "number" ? (f.min ?? 0) : undefined} placeholder={f.placeholder} {...register(f.name)} />
            </Field>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        {onCancel && <Button size="lg" onClick={onCancel}>Cancel</Button>}
        <Button size="lg" variant="primary" loading={isSubmitting} onClick={() => onSubmit()}><Save className="h-4 w-4" /> {editing ? "Save Changes" : `Save ${def.singular}`}</Button>
      </div>
    </form>
  );
}
