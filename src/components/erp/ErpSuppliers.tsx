"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
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

interface Supplier {
  id: string;
  code: string;
  name: string;
  company?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  bin?: string;
  tin?: string;
  openingBalance?: number;
  totalPurchases?: number;
  totalPaid?: number;
  balancePayable?: number;
}

export default function ErpSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    company: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    bin: "",
    tin: "",
    openingBalance: "0",
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/erp/suppliers");
      if (!res.ok) throw new Error("Failed to load suppliers");
      const json = await res.json();
      setSuppliers(json.suppliers || []);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error loading suppliers" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setNotification({ type: "error", text: "Supplier / Vendor name is required" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code.trim() || undefined,
          name: formData.name.trim(),
          company: formData.company.trim() || undefined,
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          bin: formData.bin.trim() || undefined,
          tin: formData.tin.trim() || undefined,
          openingBalance: parseFloat(formData.openingBalance) || 0,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create supplier");

      setNotification({ type: "success", text: "Supplier added successfully!" });
      setIsAddOpen(false);
      setFormData({
        code: "",
        name: "",
        company: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        bin: "",
        tin: "",
        openingBalance: "0",
      });
      fetchSuppliers();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save supplier" });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = suppliers.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.company?.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    );
  });

  const totalPayables = suppliers.reduce((sum, s) => sum + (Number(s.balancePayable) || 0), 0);
  const totalPurchases = suppliers.reduce((sum, s) => sum + (Number(s.totalPurchases) || 0), 0);
  const totalPaid = suppliers.reduce((sum, s) => sum + (Number(s.totalPaid) || 0), 0);

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
            <Truck className="w-5 h-5 text-indigo-400" />
            Suppliers & Vendors
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Vendor records, total procurement bills, payments, and payable liabilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuppliers}
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
            Add Supplier
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Purchases</span>
          <p className="text-lg font-bold text-slate-100 mt-1">{fmtCurrency(totalPurchases)}</p>
          <span className="text-[10px] text-slate-500">{suppliers.length} active suppliers</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Paid</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalPaid)}</p>
          <span className="text-[10px] text-emerald-500/80">Procurement settlements</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Payables</span>
          <p className="text-lg font-bold text-rose-400 mt-1">{fmtCurrency(totalPayables)}</p>
          <span className="text-[10px] text-rose-500/80">Vendor liabilities due</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by supplier name, company, code, contact..."
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
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Supplier / Company</th>
                <th className="py-2.5 px-3">Contact Person</th>
                <th className="py-2.5 px-3 text-right">Purchases (৳)</th>
                <th className="py-2.5 px-3 text-right">Paid (৳)</th>
                <th className="py-2.5 px-3 text-right">Payable Balance (৳)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading suppliers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No suppliers found. Click &quot;Add Supplier&quot; to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const payable = Number(s.balancePayable) || 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-indigo-400">
                        {s.code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{s.name}</div>
                        {s.company && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-500" />
                            {s.company}
                          </div>
                        )}
                        {s.bin && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            BIN: {s.bin}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {s.contactPerson && (
                          <div className="text-slate-300 font-medium">{s.contactPerson}</div>
                        )}
                        {s.phone && (
                          <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {s.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-300">
                        {fmtCurrency(s.totalPurchases)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                        {fmtCurrency(s.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                        {fmtCurrency(s.balancePayable)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {payable <= 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            Settled
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-950/60 text-rose-400 border border-rose-800">
                            Due
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

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                Add New Supplier
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
                    Supplier / Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Navana Batteries Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Supplier Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto generated or SUP-004"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Md. Rahim"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Company / Trade Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Navana Group"
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
                    placeholder="018xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sales@supplier.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Supplier Address
                </label>
                <input
                  type="text"
                  placeholder="Factory / Office address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    BIN (VAT #)
                  </label>
                  <input
                    type="text"
                    placeholder="123456789-0101"
                    value={formData.bin}
                    onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    TIN
                  </label>
                  <input
                    type="text"
                    placeholder="Taxpayer ID"
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Opening Payable (৳)
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
                  {submitting ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
