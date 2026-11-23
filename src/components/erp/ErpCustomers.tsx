"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  company?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  paymentTerms?: string;
  openingBalance?: number;
  totalInvoiced?: number;
  totalPaid?: number;
  balanceDue?: number;
}

export default function ErpCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    contactNumber: "",
    email: "",
    address: "",
    creditLimit: "0",
    paymentTerms: "Net 30",
    openingBalance: "0",
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/erp/customers");
      if (!res.ok) throw new Error("Failed to load customers");
      const json = await res.json();
      setCustomers(json.customers || []);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error loading customers" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setNotification({ type: "error", text: "Customer contact name is required" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          company: formData.company.trim() || undefined,
          contactNumber: formData.contactNumber.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          creditLimit: parseFloat(formData.creditLimit) || 0,
          paymentTerms: formData.paymentTerms || "Net 30",
          openingBalance: parseFloat(formData.openingBalance) || 0,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create customer");

      setNotification({ type: "success", text: "Customer added successfully!" });
      setIsAddOpen(false);
      setFormData({
        name: "",
        company: "",
        contactNumber: "",
        email: "",
        address: "",
        creditLimit: "0",
        paymentTerms: "Net 30",
        openingBalance: "0",
      });
      fetchCustomers();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save customer" });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.contactNumber?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const totalReceivables = customers.reduce((sum, c) => sum + (Number(c.balanceDue) || 0), 0);
  const totalInvoiced = customers.reduce((sum, c) => sum + (Number(c.totalInvoiced) || 0), 0);
  const totalCollected = customers.reduce((sum, c) => sum + (Number(c.totalPaid) || 0), 0);

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
            <Users className="w-5 h-5 text-indigo-400" />
            Customers & Debtors
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Customer directory, credit limits, invoiced totals and receivable balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
          <p className="text-lg font-bold text-slate-100 mt-1">{fmtCurrency(totalInvoiced)}</p>
          <span className="text-[10px] text-slate-500">{customers.length} total customers</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Received</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalCollected)}</p>
          <span className="text-[10px] text-emerald-500/80">Collections recorded</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Receivables</span>
          <p className="text-lg font-bold text-amber-400 mt-1">{fmtCurrency(totalReceivables)}</p>
          <span className="text-[10px] text-amber-500/80">Current balance due</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer name, company, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Customer / Company</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Credit Terms</th>
                <th className="py-2.5 px-3 text-right">Invoiced (৳)</th>
                <th className="py-2.5 px-3 text-right">Received (৳)</th>
                <th className="py-2.5 px-3 text-right">Balance Due (৳)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No customers found. Click &quot;Add Customer&quot; to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const balance = Number(c.balanceDue) || 0;
                  const creditLimit = Number(c.creditLimit) || 0;
                  const isOverLimit = creditLimit > 0 && balance > creditLimit;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{c.name}</div>
                        {c.company && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-500" />
                            {c.company}
                          </div>
                        )}
                        {c.address && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {c.address}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {c.contactNumber && (
                          <div className="text-slate-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {c.contactNumber}
                          </div>
                        )}
                        {c.email && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {c.email}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-300 font-medium">{c.paymentTerms || "Net 30"}</div>
                        <div className="text-[11px] text-slate-500">
                          Limit: {creditLimit > 0 ? fmtCurrency(creditLimit) : "No limit"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-300">
                        {fmtCurrency(c.totalInvoiced)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                        {fmtCurrency(c.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {fmtCurrency(c.balanceDue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {balance <= 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            Clear
                          </span>
                        ) : isOverLimit ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-950/60 text-rose-400 border border-rose-800">
                            Over Limit
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-950/60 text-amber-400 border border-amber-800">
                            Active Due
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Add New Customer
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Ahmed"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Telecom Ltd"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="017xxxxxxxx"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="billing@apex.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Billing Address
                </label>
                <input
                  type="text"
                  placeholder="Plot #, Road #, Motijheel C/A, Dhaka"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Credit Limit (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Immediate">Immediate / Cash</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Opening Balance (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
