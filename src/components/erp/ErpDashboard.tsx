"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Landmark,
  Package,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Button, ButtonLink, Card, PageHeader, Select, Spinner } from "@/components/ui";
import { useApp, useFmt } from "@/components/AppContext";

export function ErpDashboard() {
  const fmt = useFmt();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("this_year");

  const loadData = async (p = period) => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      let from = `${today.slice(0, 4)}-01-01`;
      const to = today;

      if (p === "this_month") {
        from = `${today.slice(0, 7)}-01`;
      } else if (p === "last_month") {
        const ym = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7);
        from = `${ym}-01`;
      }

      const res = await fetch(`/api/erp/dashboard?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to load financial dashboard");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  const m = data?.metrics || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Dashboard"
        subtitle="Live accounting overview, financial position, and business performance."
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-9 w-40 text-xs font-medium"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Fiscal Year</option>
            </Select>
            <ButtonLink href="/erp/vouchers" variant="primary" size="md">
              <Plus className="h-4 w-4" /> New Voucher
            </ButtonLink>
          </div>
        }
      />

      {loading && !data ? (
        <Spinner label="Loading financial data..." />
      ) : error ? (
        <Card className="p-6 text-center text-red-400">{error}</Card>
      ) : (
        <>
          {/* Top Primary Financial KPI Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <Card className="p-4 border-emerald-500/20 bg-emerald-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
                <span>Total Revenue</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-400">
                {fmt.money(m.revenue || 0)}
              </div>
              <div className="mt-1 text-[11px] text-muted">Sales & services</div>
            </Card>

            <Card className="p-4 border-red-500/20 bg-red-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
                <span>Total Expenses</span>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-red-400">
                {fmt.money(m.expenses || 0)}
              </div>
              <div className="mt-1 text-[11px] text-muted">Direct & operating</div>
            </Card>

            <Card className="p-4 border-purple-500/20 bg-purple-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
                <span>Net Profit</span>
                <Scale className="h-4 w-4 text-purple-400" />
              </div>
              <div className={`mt-2 text-xl font-bold ${m.netProfit >= 0 ? "text-purple-400" : "text-red-400"}`}>
                {fmt.money(m.netProfit || 0)}
              </div>
              <div className="mt-1 text-[11px] text-muted">Revenue − Expenses</div>
            </Card>

            <Card className="p-4 border-amber-500/20 bg-amber-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
                <span>Receivables</span>
                <Receipt className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-amber-400">
                {fmt.money(m.accountsReceivable || 0)}
              </div>
              <div className="mt-1 text-[11px] text-muted">Owed by customers</div>
            </Card>

            <Card className="p-4 border-rose-500/20 bg-rose-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
                <span>Payables</span>
                <ShoppingCart className="h-4 w-4 text-rose-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-rose-400">
                {fmt.money(m.accountsPayable || 0)}
              </div>
              <div className="mt-1 text-[11px] text-muted">Owed to suppliers</div>
            </Card>

            <Card className="p-4 border-cyan-500/20 bg-cyan-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
                <span>Cash Balance</span>
                <Wallet className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-cyan-400">
                {fmt.money(m.cashBalance || 0)}
              </div>
              <div className="mt-1 text-[11px] text-muted">Cash in Hand</div>
            </Card>

            <Card className="p-4 border-indigo-500/20 bg-indigo-500/[0.03]">
              <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider">
                <span>Bank Balance</span>
                <Landmark className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-indigo-400">
                {fmt.money(m.bankBalance || 0)}
              </div>
              <div className="mt-1 text-[11px] text-muted">Bank accounts</div>
            </Card>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Link href="/erp/accounts" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <FolderTree className="h-4 w-4 text-blue-400" />
              <span className="truncate">Accounts</span>
            </Link>
            <Link href="/erp/vouchers" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span className="truncate">Vouchers</span>
            </Link>
            <Link href="/erp/invoices" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <Receipt className="h-4 w-4 text-cyan-400" />
              <span className="truncate">Sales Invoices</span>
            </Link>
            <Link href="/erp/purchases" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <ShoppingCart className="h-4 w-4 text-rose-400" />
              <span className="truncate">Purchase Bills</span>
            </Link>
            <Link href="/erp/payments" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <Wallet className="h-4 w-4 text-purple-400" />
              <span className="truncate">Payments</span>
            </Link>
            <Link href="/erp/inventory" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <Package className="h-4 w-4 text-amber-400" />
              <span className="truncate">Inventory</span>
            </Link>
            <Link href="/erp/vat" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span className="truncate">Mushak 9.1</span>
            </Link>
            <Link href="/erp/reports" className="flex items-center gap-2 rounded-xl border border-line/60 bg-fg/[0.02] p-2.5 text-xs font-semibold hover:border-accent hover:bg-fg/[0.04] transition-all">
              <FileText className="h-4 w-4 text-teal-400" />
              <span className="truncate">16 Reports</span>
            </Link>
          </div>

          {/* Outstanding Customer Invoices & Supplier Bills */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Outstanding Invoices */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold">Outstanding Customer Invoices</h3>
                </div>
                <Link href="/erp/invoices" className="text-xs text-muted hover:text-fg flex items-center gap-1">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-line/60 text-muted uppercase tracking-wider text-[11px] bg-fg/[0.02]">
                      <th className="px-4 py-2.5 font-semibold">Invoice</th>
                      <th className="px-4 py-2.5 font-semibold">Customer</th>
                      <th className="px-4 py-2.5 font-semibold">Due Date</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Due Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.outstandingInvoices || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted">
                          No unpaid customer invoices
                        </td>
                      </tr>
                    ) : (
                      (data.outstandingInvoices || []).map((inv: any) => (
                        <tr key={inv.id} className="border-b border-line/40 hover:bg-fg/[0.02]">
                          <td className="px-4 py-2.5 font-semibold text-fg">{inv.invoiceNo}</td>
                          <td className="px-4 py-2.5 truncate max-w-[140px]">{inv.clientName}</td>
                          <td className="px-4 py-2.5 text-muted">{fmt.date(inv.dueDate || inv.issueDate)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-amber-400">
                            {fmt.money(inv.dueAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Outstanding Purchases */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-rose-400" />
                  <h3 className="text-sm font-bold">Outstanding Supplier Purchases</h3>
                </div>
                <Link href="/erp/purchases" className="text-xs text-muted hover:text-fg flex items-center gap-1">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-line/60 text-muted uppercase tracking-wider text-[11px] bg-fg/[0.02]">
                      <th className="px-4 py-2.5 font-semibold">Purchase No</th>
                      <th className="px-4 py-2.5 font-semibold">Supplier</th>
                      <th className="px-4 py-2.5 font-semibold">Date</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.outstandingPurchases || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted">
                          No unpaid supplier purchases
                        </td>
                      </tr>
                    ) : (
                      (data.outstandingPurchases || []).map((pur: any) => (
                        <tr key={pur.id} className="border-b border-line/40 hover:bg-fg/[0.02]">
                          <td className="px-4 py-2.5 font-semibold text-fg">{pur.purchaseNo}</td>
                          <td className="px-4 py-2.5 truncate max-w-[140px]">{pur.supplier}</td>
                          <td className="px-4 py-2.5 text-muted">{fmt.date(pur.purchaseDate)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-rose-400">
                            {fmt.money(pur.dueAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Financial Transactions */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Recent Financial Ledger Postings</h3>
              </div>
              <Link href="/erp/ledger" className="text-xs text-muted hover:text-fg flex items-center gap-1">
                Full General Ledger <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-line/60 text-muted uppercase tracking-wider text-[11px] bg-fg/[0.02]">
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Voucher / Ref</th>
                    <th className="px-4 py-2.5 font-semibold">Account</th>
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Debit (Dr)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recentTransactions || []).map((tx: any) => (
                    <tr key={tx.id} className="border-b border-line/40 hover:bg-fg/[0.02]">
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted">{fmt.date(tx.date)}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-accent font-semibold">{tx.voucherNo || "—"}</td>
                      <td className="px-4 py-2.5 font-medium">{tx.account}</td>
                      <td className="px-4 py-2.5 text-muted truncate max-w-xs">{tx.description || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                        {Number(tx.debit) > 0 ? fmt.money(tx.debit) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-cyan-400">
                        {Number(tx.credit) > 0 ? fmt.money(tx.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default ErpDashboard;
