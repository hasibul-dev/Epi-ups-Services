"use client";

import Link from "next/link";
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertTriangle, Inbox, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/resource-config";

/* ───────── Buttons ───────── */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 disabled:pointer-events-none",
    size === "sm" && "h-9 px-3 text-[13px]",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-11 px-5 text-sm",
    variant === "primary" && "bg-accent text-white shadow-lg shadow-accent/25 hover:brightness-110",
    variant === "secondary" && "border border-line bg-fg/5 text-fg hover:bg-fg/10",
    variant === "ghost" && "text-muted hover:text-fg hover:bg-fg/8",
    variant === "danger" && "border border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20",
    variant === "success" && "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
    extra,
  );
}

export function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type="button" {...rest} disabled={disabled || loading} className={buttonClass(variant, size, className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "secondary", size = "md", className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ───────── Form controls ───────── */
const controlBase = "w-full rounded-xl border border-line bg-field px-3.5 text-sm text-fg placeholder:text-muted/70 transition focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(controlBase, "h-10", className)} />;
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(controlBase, "min-h-24 py-2.5", className)} />;
}
export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cn(controlBase, "h-10 pr-8", className)}>
      {children}
    </select>
  );
}

export function Field({ label, error, required, children, className, hint }: { label: string; error?: string; required?: boolean; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-500">{error}</span>}
    </label>
  );
}

/* ───────── Badges ───────── */
export const toneClass: Record<Tone, string> = {
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
  cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  red: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
};

const AUTO: Record<string, Tone> = {
  completed: "emerald", done: "emerald", resolved: "emerald", closed: "slate", published: "emerald", active: "emerald", paid: "emerald", received: "emerald", issued: "blue", commissioned: "emerald", handed_over: "blue",
  in_progress: "cyan", scheduled: "blue", new: "blue", open: "blue", todo: "blue", planned: "blue", pending: "amber", on_hold: "amber", draft: "slate", cancelled: "red", overdue: "red", expired: "red", urgent: "red", high: "amber",
  normal: "blue", low: "slate", partial: "cyan", unpaid: "amber", paused: "amber", testing: "cyan", review: "amber", spare: "blue", in_repair: "amber", retired: "slate", void: "slate", claimed: "amber",
};
export const autoTone = (v: string): Tone => AUTO[v] ?? "slate";

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize leading-5 whitespace-nowrap", toneClass[tone], className)}>{children}</span>;
}

/* ───────── Cards / states ───────── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <Loader2 className="h-5 w-5 animate-spin text-accent" /> {label}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent"><Inbox className="h-7 w-7" /></div>
      <p className="mt-2 text-base font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500"><AlertTriangle className="h-7 w-7" /></div>
      <p className="mt-2 text-base font-semibold">Something went wrong</p>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry && <Button className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────── Overlays ───────── */
function useEscape(onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && ref.current();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  useEscape(() => open && onClose());
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade" onClick={onClose} />
      <div className={cn("relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-solid shadow-2xl anim-fade", size === "sm" && "max-w-md", size === "md" && "max-w-xl", size === "lg" && "max-w-3xl")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-fg/10 hover:text-fg" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEscape(() => open && onClose());
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade" onClick={onClose} />
      <aside className={cn("anim-slide absolute right-0 top-0 flex h-full w-full flex-col border-l border-line bg-solid shadow-2xl", wide ? "max-w-3xl" : "max-w-2xl")}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-fg/10 hover:text-fg" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, loading }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm" footer={<><Button onClick={onCancel}>Cancel</Button><Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-500"><AlertTriangle className="h-5 w-5" /></div>
        <div className="text-sm text-muted">{message}</div>
      </div>
    </Modal>
  );
}
