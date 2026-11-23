"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Reset failed");
      setOk(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };
  const cls = "mt-4 h-12 w-full rounded-xl border border-line bg-field px-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
  return (
    <form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">At least 8 characters, with letters and numbers.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
      {ok ? <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">Password updated. Redirecting to sign in…</div> : (
        <>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" required autoComplete="new-password" className={cls} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" required autoComplete="new-password" className={cls} />
          <button disabled={busy || !token} className="mt-4 h-12 w-full rounded-xl bg-accent text-sm font-bold text-white hover:brightness-110 disabled:opacity-60">{busy ? "Saving…" : "Update password"}</button>
        </>
      )}
      <p className="mt-5 text-center text-sm"><Link href="/login" className="font-semibold text-accent hover:underline">← Back to sign in</Link></p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="app-bg grid min-h-screen place-items-center p-6">
      <Suspense fallback={null}><ResetForm /></Suspense>
    </main>
  );
}
