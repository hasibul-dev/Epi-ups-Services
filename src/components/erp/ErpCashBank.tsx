"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Building,
  Check,
  CheckCircle2,
  Download,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { Badge, Button, ButtonLink, Card, Drawer, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useFmt, useToast } from "@/components/AppContext";

export function ErpCashBank() {
  const fmt = useFmt();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transferModal, setTransferModal] = useState<"deposit" | "withdraw" | "transfer" | null>(null);
  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/erp/cash-bank");
      if (!res.ok) throw new Error("Failed to load cash and bank accounts");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const accounts = data?.accounts || [];
  const recent = data?.recent || [];

  const cashAccounts = accounts.filter((a: any) => a.category.toLowerCase().includes("cash") || a.code === "1011");
  const bankAccounts = accounts.filter((a: any) => a.category.toLowerCase().includes("bank") || a.code.startsWith("101") && a.code !== "1011");

  const totalCash = cashAccounts.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
  const totalBank = bankAccounts.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

  const handleOpenTransfer = (type: "deposit" | "withdraw" | "transfer") => {
    const cashAcc = cashAccounts[0]?.id ? String(cashAccounts[0].id) : "";
    const bankAcc = bankAccounts[0]?.id ? String(bankAccounts[0].id) : "";

    setTransferForm({
      fromAccountId: type === "deposit" ? cashAcc : bankAcc,
      toAccountId: type === "deposit" ? bankAcc : type === "withdraw" ? cashAcc : "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      reference: "",
      description: "",
    });
    setTransferModal(type);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.amount || Number(transferForm.amount) <= 0) {
      toast.error("Please enter a valid transfer amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/erp/cash-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: transferModal,
          ...transferForm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Transfer failed");

      toast.success("Transfer recorded and posted to accounts ledger!");
      setTransferModal(null);
      loadData();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash & Bank Accounts"
        subtitle="Manage liquidity, bank balances, inter-account contra transfers, and cash in hand."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={() => handleOpenTransfer("deposit")}>
              <ArrowDownLeft className="h-4 w-4 mr-1 text-emerald-400" /> Bank Deposit
            </Button>
            <Button variant="secondary" size="md" onClick={() => handleOpenTransfer("withdraw")}>
              <ArrowUpRight className="h-4 w-4 mr-1 text-amber-400" /> Bank Withdrawal
            </Button>
            <Button variant="primary" size="md" onClick={() => handleOpenTransfer("transfer")}>
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer Funds
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <Spinner label="Loading liquidity accounts..." />
      ) : error ? (
        <Card className="p-6 text-center text-red-400">{error}</Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5 border-cyan-500/20 bg-cyan-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase tracking-wider">
                <span>Total Cash in Hand</span>
                <Wallet className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-cyan-400">{fmt.money(totalCash)}</div>
              <div className="mt-1 text-xs text-muted">{cashAccounts.length} Cash counter account(s)</div>
            </Card>

            <Card className="p-5 border-indigo-500/20 bg-indigo-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase tracking-wider">
                <span>Total Bank Balance</span>
                <Landmark className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-indigo-400">{fmt.money(totalBank)}</div>
              <div className="mt-1 text-xs text-muted">{bankAccounts.length} Corporate bank account(s)</div>
            </Card>

            <Card className="p-5 border-emerald-500/20 bg-emerald-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-xs font-semibold uppercase tracking-wider">
                <span>Total Liquid Funds</span>
                <Building className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">{fmt.money(totalCash + totalBank)}</div>
              <div className="mt-1 text-xs text-muted">Available liquidity for operations</div>
            </Card>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc: any) => {
              const isCash = acc.category.toLowerCase().includes("cash") || acc.code === "1011";
              return (
                <Card key={acc.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isCash ? (
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                            <Wallet className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <Landmark className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-fg">{acc.name}</h4>
                          <span className="text-[11px] font-mono text-accent">{acc.code}</span>
                        </div>
                      </div>
                      <Badge tone={isCash ? "cyan" : "indigo"}>{acc.category}</Badge>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line/60">
                      <div className="text-xs text-muted">Current Ledger Balance</div>
                      <div className="text-xl font-bold text-fg mt-0.5">{fmt.money(acc.balance || 0)}</div>
                    </div>

                    {acc.bankAccountNumber && (
                      <div className="mt-3 text-[11px] text-muted space-y-0.5 bg-fg/[0.02] p-2 rounded-lg border border-line/40">
                        <div>A/C Number: <span className="font-mono text-fg font-semibold">{acc.bankAccountNumber}</span></div>
                        {acc.bankBranch && <div>Branch: <span className="text-fg">{acc.bankBranch}</span></div>}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                    <span className="text-[11px] text-muted">Opening: {fmt.money(acc.openingBalance || 0)}</span>
                    <ButtonLink
                      href={`/erp/ledger?account=${acc.code}`}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      View Ledger <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </ButtonLink>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Recent Liquid Transactions */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold">Recent Cash & Bank Transactions</h3>
              </div>
              <ButtonLink href="/erp/ledger?account=101" variant="ghost" size="sm" className="text-xs">
                Open Cash & Bank Ledger <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </ButtonLink>
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider text-[11px] bg-fg/[0.02]">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Account</th>
                    <th className="px-4 py-2.5 font-semibold">Voucher / Ref</th>
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Inflow (Dr)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Outflow (Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-line/40 hover:bg-fg/[0.02]">
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted">{fmt.date(tx.date)}</td>
                        <td className="px-4 py-2.5 font-semibold text-fg">{tx.account}</td>
                        <td className="px-4 py-2.5 font-mono text-accent">{tx.voucherNo || "—"}</td>
                        <td className="px-4 py-2.5 text-muted truncate max-w-xs">{tx.description || "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-semibold">
                          {Number(tx.debit) > 0 ? fmt.money(tx.debit) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-rose-400 font-semibold">
                          {Number(tx.credit) > 0 ? fmt.money(tx.credit) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Contra Transfer Drawer */}
      <Drawer
        open={Boolean(transferModal)}
        onClose={() => setTransferModal(null)}
        title={
          transferModal === "deposit"
            ? "Record Bank Deposit (Cash → Bank)"
            : transferModal === "withdraw"
            ? "Record Bank Withdrawal (Bank → Cash)"
            : "Inter-Account Funds Transfer (Contra)"
        }
        subtitle="Contra transaction that automatically balances debit and credit across selected accounts."
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Field label="Source Account (Credit / Outflow) *">
            <Select
              value={transferForm.fromAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
              required
            >
              <option value="">Select source account…</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name} ({fmt.money(a.balance || 0)})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Destination Account (Debit / Inflow) *">
            <Select
              value={transferForm.toAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
              required
            >
              <option value="">Select destination account…</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name} ({fmt.money(a.balance || 0)})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Transfer Amount (৳) *">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </Field>

            <Field label="Transfer Date *">
              <Input
                type="date"
                value={transferForm.date}
                onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                required
              />
            </Field>
          </div>

          <Field label="Cheque No / Slip Reference">
            <Input
              value={transferForm.reference}
              onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })}
              placeholder="e.g. Deposit slip #82910, CHQ-2019"
            />
          </Field>

          <Field label="Notes / Narration">
            <Textarea
              value={transferForm.description}
              onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
              placeholder="e.g. Cash deposited from office cash drawer into City Bank account"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setTransferModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              <Check className="h-4 w-4 mr-1" /> Post Contra Transfer
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

export default ErpCashBank;
