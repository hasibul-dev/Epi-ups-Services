"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CalendarClock, ChevronDown, KeyRound, LogOut, Moon, PhoneCall, Search, ShieldAlert, Sun, Ticket, UserCheck, AlertTriangle } from "lucide-react";
import type { Notice, SearchHit } from "@/server/insights";
import { DEPTS, ROLES, type RoleCode } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { api, useApp, useToast } from "./AppContext";
import { Badge, Button, Field, Input, Modal, toneClass } from "./ui";

function useOutside(onOut: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  });
  return ref;
}

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useOutside(() => setOpen(false));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}`).then((r) => setHits(r.hits)).catch(() => setHits([])).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const groups = hits.reduce<Record<string, SearchHit[]>>((a, h) => ({ ...a, [h.group]: [...(a[h.group] ?? []), h] }), {});

  return (
    <div className="relative hidden md:block" ref={ref}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search clients, work, tickets…  Ctrl K" aria-label="Global search"
        className="h-10 w-64 rounded-xl border border-line bg-field pl-9 pr-3 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 lg:w-80" />
      {open && q.trim().length >= 2 && (
        <div className="anim-fade absolute right-0 z-50 mt-2 max-h-[70vh] w-[26rem] overflow-auto rounded-2xl border border-line bg-solid p-2 shadow-2xl scroll-thin">
          {loading && <p className="p-4 text-center text-sm text-muted">Searching…</p>}
          {!loading && hits.length === 0 && <p className="p-4 text-center text-sm text-muted">No results for “{q}”</p>}
          {Object.entries(groups).map(([g, items]) => (
            <div key={g} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">{g}</p>
              {items.map((h, i) => (
                <button key={i} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-fg/8" onClick={() => { setOpen(false); setQ(""); router.push(h.href); }}>
                  <span className="block truncate text-sm font-semibold">{h.title}</span>
                  {h.subtitle && <span className="block truncate text-xs text-muted">{h.subtitle}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const KIND_ICON = { upcoming: CalendarClock, overdue: AlertTriangle, followup: PhoneCall, warranty: ShieldAlert, tickets: Ticket, assigned: UserCheck };

export function Notifications() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useOutside(() => setOpen(false));
  useEffect(() => {
    let on = true;
    const load = () => api<{ items: Notice[] }>("/api/notifications").then((r) => on && setItems(r.items)).catch(() => undefined);
    load();
    const t = setInterval(load, 120_000);
    return () => { on = false; clearInterval(t); };
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-fg/5 hover:bg-fg/10">
        <Bell className="h-5 w-5" />
        {items.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{items.length > 99 ? "99+" : items.length}</span>}
      </button>
      {open && (
        <div className="anim-fade absolute right-0 z-50 mt-2 max-h-[70vh] w-[24rem] max-w-[92vw] overflow-auto rounded-2xl border border-line bg-solid shadow-2xl scroll-thin">
          <div className="sticky top-0 border-b border-line bg-solid px-4 py-3 text-sm font-bold">Notifications <span className="font-normal text-muted">({items.length})</span></div>
          {items.length === 0 && <p className="p-8 text-center text-sm text-muted">You’re all caught up 🎉</p>}
          {items.map((n) => {
            const I = KIND_ICON[n.kind];
            return (
              <button key={n.id} onClick={() => { setOpen(false); router.push(n.href); }} className="flex w-full items-start gap-3 border-b border-line/50 px-4 py-3 text-left last:border-0 hover:bg-fg/6">
                <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border", toneClass[n.tone])}><I className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{n.title}</span><span className="block truncate text-xs text-muted">{n.detail}</span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(!document.documentElement.classList.contains("light")), []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
    localStorage.setItem("epi-theme", next);
    setDark(!dark);
  };
  return (
    <button onClick={toggle} aria-label="Toggle theme" title="Toggle light / dark theme" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-fg/5 hover:bg-fg/10">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function ChangePassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr("");
    if (next !== confirm) return setErr("New passwords do not match");
    setBusy(true);
    try {
      await api("/api/profile/password", { method: "POST", body: JSON.stringify({ current: cur, next }) });
      toast.success("Password changed. Other sessions were signed out.");
      setCur(""); setNext(""); setConfirm("");
      onClose();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Change Password" size="sm" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>Update Password</Button></>}>
      <div className="space-y-4">
        {err && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">{err}</div>}
        <Field label="Current password"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 8 characters with letters and numbers"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Confirm new password"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
      </div>
    </Modal>
  );
}

export function UserMenu() {
  const { user } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  };
  const role = ROLES[user.role as RoleCode];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex h-10 items-center gap-2.5 rounded-xl border border-line bg-fg/5 pl-1.5 pr-2.5 hover:bg-fg/10">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-xs font-bold text-white">{initials(user.name)}</span>
        <span className="hidden text-left leading-tight lg:block"><span className="block text-[13px] font-semibold">{user.name}</span><span className="block text-[10px] text-muted">@{user.username}</span></span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div className="anim-fade absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-solid p-2 shadow-2xl">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
            <div className="mt-2 flex gap-1.5"><Badge tone="indigo">{role?.name ?? user.role}</Badge><Badge tone="slate">{DEPTS[user.department as keyof typeof DEPTS]?.short ?? user.department}</Badge></div>
          </div>
          <button onClick={() => { setOpen(false); setPw(true); }} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-fg/8"><KeyRound className="h-4 w-4" /> Change password</button>
          <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      )}
      <ChangePassword open={pw} onClose={() => setPw(false)} />
    </div>
  );
}

export { Link as _Link };
