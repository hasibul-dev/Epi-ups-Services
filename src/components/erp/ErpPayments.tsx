"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Search,
  Plus,
  RefreshCw,
  Printer,
  X,
  CreditCard,
  Building,
  User,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  paymentNo?: string;
  type: "receipt" | "payment";
  partyType?: string;
  partyName?: string;
  partyCompany?: string;
  amount: number;
  paymentMethod: string;
  accountName?: string;
  date: string;
  reference?: string;
  notes?: string;
}

export default function ErpPayments() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<"all" | "receipt" | "payment">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<"receipt" | "payment">("receipt");
  const [selectedVoucher, setSelectedVoucher] = useState<PaymentRecord | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    partyType: "customer",
    partyId: "",
    manualPartyName: "",
    amount: "",
    paymentMethod: "Bank",
    accountId: "",
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, custRes, supRes, accRes] = await Promise.all([
        fetch("/api/erp/payments"),
        fetch("/api/erp/customers"),
        fetch("/api/erp/suppliers"),
        fetch("/api/erp/accounts"),
      ]);

      if (payRes.ok) {
        const payJson = await payRes.json();
        setPayments(payJson.payments || []);
      }
      if (custRes.ok) {
        const custJson = await custRes.json();
        setCustomers(custJson.customers || []);
      }
      if (supRes.ok) {
        const supJson = await supRes.json();
        setSuppliers(supJson.suppliers || []);
      }
      if (accRes.ok) {
        const accJson = await accRes.json();
        setAccounts(accJson.accounts || []);
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load payment records" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenModal = (type: "receipt" | "payment") => {
    setModalType(type);
    setFormData({
      partyType: type === "receipt" ? "customer" : "supplier",
      partyId: "",
      manualPartyName: "",
      amount: "",
      paymentMethod: "Bank",
      accountId: "",
      date: new Date().toISOString().slice(0, 10),
      reference: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setNotification({ type: "error", text: "Please enter a valid amount" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: modalType,
          partyType: formData.partyType,
          partyId: formData.partyId || undefined,
          manualPartyName: formData.manualPartyName.trim() || undefined,
          amount,
          paymentMethod: formData.paymentMethod,
          accountId: formData.accountId || undefined,
          date: formData.date,
          reference: formData.reference.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to record transaction");

      setNotification({
        type: "success",
        text: `${modalType === "receipt" ? "Receipt Voucher" : "Payment Voucher"} recorded successfully!`,
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save transaction" });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter((p) => {
    if (activeTab !== "all" && p.type !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.paymentNo?.toLowerCase().includes(q) ||
      p.partyName?.toLowerCase().includes(q) ||
      p.partyCompany?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q)
    );
  });

  const totalReceipts = payments
    .filter((p) => p.type === "receipt")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPayments = payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const netCashFlow = totalReceipts - totalPayments;

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs font-medium border ${
            notification.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-400" />
            Receipts & Payments (Money Vouchers)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized money receipts, vendor disbursements, expense payments, and printable cash slips
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => handleOpenModal("receipt")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-sm transition"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Money Receipt
          </button>
          <button
            onClick={() => handleOpenModal("payment")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-md shadow-sm transition"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Payment Voucher
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Money Received</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalReceipts)}</p>
          <span className="text-[10px] text-emerald-500/80">Inflow receipts & collections</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Disbursements</span>
          <p className="text-lg font-bold text-rose-400 mt-1">{fmtCurrency(totalPayments)}</p>
          <span className="text-[10px] text-rose-500/80">Vendor & expense payments</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Net Cash Position</span>
          <p className={`text-lg font-bold mt-1 ${netCashFlow >= 0 ? "text-indigo-400" : "text-amber-400"}`}>
            {fmtCurrency(netCashFlow)}
          </p>
          <span className="text-[10px] text-slate-500">Inflows minus outflows</span>
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Voucher #, Party, Reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "All Vouchers" },
            { id: "receipt", label: "Money Receipts" },
            { id: "payment", label: "Payment Vouchers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 text-xs rounded font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Party / Payee</th>
                <th className="py-2.5 px-3">Mode / Account</th>
                <th className="py-2.5 px-3">Reference / Remarks</th>
                <th className="py-2.5 px-3 text-right">Amount (৳)</th>
                <th className="py-2.5 px-3 text-center">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No transactions found. Click &quot;Money Receipt&quot; or &quot;Payment Voucher&quot; to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-indigo-400">
                      {p.paymentNo || "VOUCHER"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{p.date}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {p.type === "receipt" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800 uppercase">
                          <ArrowDownLeft className="w-3 h-3" /> Receipt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-950/60 text-rose-400 border border-rose-800 uppercase">
                          <ArrowUpRight className="w-3 h-3" /> Payment
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">{p.partyName || "Direct Party"}</div>
                      {p.partyCompany && <div className="text-[11px] text-slate-400">{p.partyCompany}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-200 font-medium">{p.paymentMethod}</span>
                      {p.accountName && (
                        <div className="text-[10px] text-slate-500">{p.accountName}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-300">{p.reference || "-"}</div>
                      {p.notes && <div className="text-[11px] text-slate-500 italic">{p.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={p.type === "receipt" ? "text-emerald-400" : "text-rose-400"}>
                        {p.type === "receipt" ? "+" : "-"}
                        {fmtCurrency(p.amount)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        title="Print Voucher Slip"
                        onClick={() => setSelectedVoucher(p)}
                        className="p-1 text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-slate-700 rounded transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {modalType === "receipt" ? (
                  <>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    Record Money Receipt (Inflow)
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    Record Payment Voucher (Outflow)
                  </>
                )}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Party Type
                  </label>
                  <select
                    value={formData.partyType}
                    onChange={(e) => {
                      setFormData({ ...formData, partyType: e.target.value, partyId: "" });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    {modalType === "receipt" ? (
                      <>
                        <option value="customer">Customer / Debtor</option>
                        <option value="other">Other Income / Direct</option>
                      </>
                    ) : (
                      <>
                        <option value="supplier">Supplier / Creditor</option>
                        <option value="expense">Operating Expense</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {formData.partyType === "customer" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Select Customer
                  </label>
                  <select
                    value={formData.partyId}
                    onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""} - Due: ৳{Number(c.balanceDue || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.partyType === "supplier" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Select Supplier
                  </label>
                  <select
                    value={formData.partyId}
                    onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name} - Payable: ৳{Number(s.balancePayable || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(formData.partyType === "other" || formData.partyType === "expense" || !formData.partyId) && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Party / Payee Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka Electric Supply / Office Landlord"
                    value={formData.manualPartyName}
                    onChange={(e) => setFormData({ ...formData, manualPartyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Bank">Bank Transfer / Cheque</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Mobile">bKash / Nagad</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Cheque # / Instrument Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cheque #492019 or TXN-849102"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Particulars or description of transaction..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-sm transition disabled:opacity-50 ${
                    modalType === "receipt" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {submitting ? "Posting..." : modalType === "receipt" ? "Post Receipt" : "Post Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Voucher Slip Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-5 overflow-hidden shadow-2xl print:bg-white print:border-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden">
              <span className="text-xs font-semibold text-slate-300">Voucher Slip</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-center my-3">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider print:text-black">
                EPI UPS Bangladesh Limited
              </h2>
              <div className="inline-block mt-1 px-2.5 py-0.5 border border-slate-700 print:border-black rounded text-[11px] font-bold uppercase text-indigo-400 print:text-black">
                {selectedVoucher.type === "receipt" ? "OFFICIAL MONEY RECEIPT" : "PAYMENT VOUCHER"}
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 print:bg-white rounded border border-slate-800 print:border-black text-xs space-y-2 text-slate-300 print:text-black">
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-gray-600">Voucher No:</span>
                <span className="font-mono font-bold text-indigo-400 print:text-black">{selectedVoucher.paymentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-gray-600">Date:</span>
                <span>{selectedVoucher.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-gray-600">Party / Payee:</span>
                <span className="font-semibold text-slate-100 print:text-black">{selectedVoucher.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-gray-600">Payment Mode:</span>
                <span>{selectedVoucher.paymentMethod}</span>
              </div>
              {selectedVoucher.reference && (
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-gray-600">Cheque / Ref:</span>
                  <span>{selectedVoucher.reference}</span>
                </div>
              )}
              <div className="border-t border-slate-800 print:border-black pt-2 flex justify-between font-bold text-sm">
                <span>Amount:</span>
                <span className="font-mono text-emerald-400 print:text-black">{fmtCurrency(selectedVoucher.amount)}</span>
              </div>
            </div>

            <div className="flex justify-between pt-10 text-[10px] text-slate-400 print:text-black">
              <div className="border-t border-slate-700 print:border-black w-28 text-center pt-1">
                Prepared By
              </div>
              <div className="border-t border-slate-700 print:border-black w-28 text-center pt-1">
                Approved By
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
