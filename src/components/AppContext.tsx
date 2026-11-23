"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Action, DeptCode } from "@/lib/constants";
import type { ResourceDef } from "@/lib/resource-config";
import { formatDate, formatDateTime, formatMoney, todayStr } from "@/lib/utils";

export interface ClientUser { id: number; name: string; username: string; email: string; role: string; department: string }
export type PermMap = Record<DeptCode, Record<Action, boolean>>;

interface Ctx {
  user: ClientUser;
  settings: Record<string, string>;
  setSettings: (s: Record<string, string>) => void;
  perms: PermMap;
}

const AppCtx = createContext<Ctx | null>(null);
const ToastCtx = createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(null);

export function AppProvider({ user, settings: initial, perms, children }: { user: ClientUser; settings: Record<string, string>; perms: PermMap; children: ReactNode }) {
  const [settings, setSettings] = useState(initial);
  const [toasts, setToasts] = useState<{ id: number; kind: "success" | "error"; text: string }[]>([]);
  const idRef = useRef(0);
  const push = useCallback((kind: "success" | "error", text: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  const toast = useMemo(() => ({ success: (m: string) => push("success", m), error: (m: string) => push("error", m) }), [push]);
  const value = useMemo(() => ({ user, settings, setSettings, perms }), [user, settings, perms]);
  return (
    <AppCtx.Provider value={value}>
      <ToastCtx.Provider value={toast}>
        {children}
        <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <div key={t.id} className="anim-fade pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border border-line bg-solid px-4 py-3 text-sm shadow-xl">
              {t.kind === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </AppCtx.Provider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppProvider missing");
  return c;
}
export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("AppProvider missing");
  return c;
}

export function useFmt() {
  const { settings } = useApp();
  const fmt = settings["format.date"] || "DD MMM YYYY";
  const tz = settings["format.timezone"] || "Asia/Dhaka";
  const cur = settings["format.currency"] || "৳";
  return useMemo(() => ({ date: (v: string | null | undefined) => formatDate(v, fmt), dateTime: (v: string | Date | null | undefined) => formatDateTime(v, tz, fmt), money: (n: number | string | null | undefined) => formatMoney(n, cur), today: () => todayStr(tz) }), [fmt, tz, cur]);
}

export function useCan() {
  const { perms } = useApp();
  return useCallback((modules: string[], action: Action) => modules.some((m) => perms[m as DeptCode]?.[action]), [perms]);
}

export function useResourceCan(def: ResourceDef) {
  const can = useCan();
  return useMemo(() => ({ create: can(def.modules, "create") && !def.readOnly && !def.noCreate, edit: can(def.modules, "edit") && !def.readOnly, delete: can(def.modules, "delete") && !def.readOnly && !def.noDelete, export: can(def.modules, "export") }), [can, def]);
}

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; fieldErrors?: Record<string, string> };
    const err = new Error(d.error || `Request failed (${res.status})`) as Error & { fieldErrors?: Record<string, string>; status?: number };
    err.fieldErrors = d.fieldErrors;
    err.status = res.status;
    throw err;
  }
  return data as T;
}
