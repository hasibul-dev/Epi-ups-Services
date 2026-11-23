"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Login failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="app-bg grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="EPI UPS" className="h-14 w-auto rounded-lg bg-white p-1" />
          <div><p className="text-lg font-extrabold">EPI UPS</p><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5b8def]">Bangladesh Limited</p></div>
        </div>
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Enterprise Management System</h1>
          <p className="mt-4 text-lg text-muted">Sales, Service, ERP & Accounts, Digital Marketing and IT Support — one secure platform, one source of truth.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {["Role-based access control", "Real-time dashboards", "A4 print, PDF & Excel reports", "Audit trail & backups"].map((t) => <div key={t} className="rounded-xl border border-line bg-white/5 px-4 py-3">✓ {t}</div>)}
          </div>
        </div>
        <p className="relative text-xs text-muted">© {new Date().getFullYear()} EPI UPS (Bangladesh) Limited</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="EPI UPS" className="h-12 w-auto rounded-lg bg-white p-1" />
            <span className="text-lg font-extrabold">EPI UPS</span>
          </div>
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your company account to continue.</p>
          {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">{error}</div>}
          <label className="mt-6 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Username or email</span>
            <span className="relative block"><User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required autoFocus className="h-12 w-full rounded-xl border border-line bg-field pl-10 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" /></span>
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Password</span>
            <span className="relative block"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="h-12 w-full rounded-xl border border-line bg-field pl-10 pr-11 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></span>
          </label>
          <button disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-white shadow-lg shadow-accent/30 transition hover:brightness-110 disabled:opacity-60">
            <LogIn className="h-4 w-4" /> {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-5 text-center text-sm"><Link href="/forgot-password" className="font-semibold text-accent hover:underline">Forgot your password?</Link></p>
        </form>
      </section>
    </main>
  );
}
