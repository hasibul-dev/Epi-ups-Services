"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Request failed");
      setDone(j.message);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <main className="app-bg grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-muted">Enter your username or email. A one-hour reset link will be issued.</p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        {done ? <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{done}</div> : (
          <>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="Username or email" className="mt-6 h-12 w-full rounded-xl border border-line bg-field px-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <button disabled={busy} className="mt-4 h-12 w-full rounded-xl bg-accent text-sm font-bold text-white hover:brightness-110 disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}</button>
          </>
        )}
        <p className="mt-5 text-center text-sm"><Link href="/login" className="font-semibold text-accent hover:underline">← Back to sign in</Link></p>
      </form>
    </main>
  );
}
