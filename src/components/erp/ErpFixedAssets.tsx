"use client";

import React, { useState, useEffect } from "react";
import {
  Building,
  Search,
  Plus,
  RefreshCw,
  Play,
  Calculator,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  usefulLifeYears: number;
  salvageValue: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  depreciationRate: number;
  status: string;
}

export default function ErpFixedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isRunOpen, setIsRunOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "Office Equipment",
    purchaseDate: new Date().toISOString().slice(0, 10),
    cost: "100000",
    usefulLifeYears: "5",
    salvageValue: "0",
  });

  const [depMonth, setDepMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/erp/fixed-assets");
      if (!res.ok) throw new Error("Failed to load fixed assets register");
      const json = await res.json();
      setAssets(json.assets || []);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load assets" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setNotification({ type: "error", text: "Asset name is required" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/fixed-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_asset",
          code: formData.code.trim() || undefined,
          name: formData.name.trim(),
          category: formData.category,
          purchaseDate: formData.purchaseDate,
          cost: parseFloat(formData.cost) || 0,
          usefulLifeYears: parseFloat(formData.usefulLifeYears) || 5,
          salvageValue: parseFloat(formData.salvageValue) || 0,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to add fixed asset");

      setNotification({ type: "success", text: "Fixed asset recorded successfully!" });
      setIsAddOpen(false);
      setFormData({
        code: "",
        name: "",
        category: "Office Equipment",
        purchaseDate: new Date().toISOString().slice(0, 10),
        cost: "100000",
        usefulLifeYears: "5",
        salvageValue: "0",
      });
      fetchAssets();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save asset" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/fixed-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_depreciation",
          month: depMonth,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to run depreciation");

      setNotification({
        type: "success",
        text: `Depreciation calculated and posted via Voucher ${resData.voucherNo || ""}!`,
      });
      setIsRunOpen(false);
      fetchAssets();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to post depreciation" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = assets.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
  const totalAccumulated = assets.reduce((sum, a) => sum + (Number(a.accumulatedDepreciation) || 0), 0);
  const totalNetBookValue = assets.reduce((sum, a) => sum + (Number(a.netBookValue) || 0), 0);

  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q);
  });

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
            <Building className="w-5 h-5 text-indigo-400" />
            Fixed Assets Register & Depreciation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Asset register, useful life schedules, straight-line depreciation engine, and Net Book Value (NBV)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAssets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Asset
          </button>
          <button
            onClick={() => setIsRunOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Calculator className="w-3.5 h-3.5" />
            Run Monthly Depreciation
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Acquisition Cost</span>
          <p className="text-lg font-bold text-slate-100 mt-1">{fmtCurrency(totalCost)}</p>
          <span className="text-[10px] text-slate-500">{assets.length} registered asset items</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Accumulated Depreciation</span>
          <p className="text-lg font-bold text-rose-400 mt-1">{fmtCurrency(totalAccumulated)}</p>
          <span className="text-[10px] text-rose-500/80">Total written off to date</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Net Book Value (NBV)</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalNetBookValue)}</p>
          <span className="text-[10px] text-emerald-500/80">Balance sheet carrying amount</span>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Fixed Asset Schedule
          </h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-2.5 py-1 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Asset Code</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Purchase Date</th>
                <th className="py-2.5 px-3 text-right">Cost (৳)</th>
                <th className="py-2.5 px-3 text-center">Life (Yrs)</th>
                <th className="py-2.5 px-3 text-right">Acc. Dep (৳)</th>
                <th className="py-2.5 px-3 text-right">Net Book Value (৳)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading asset register...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    No fixed assets found. Click &quot;Add Asset&quot; to register equipment and facilities.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-indigo-400">
                      {asset.code}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {asset.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {asset.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{asset.purchaseDate}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                      {fmtCurrency(asset.cost)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {asset.usefulLifeYears} Yrs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                      {fmtCurrency(asset.accumulatedDepreciation)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {fmtCurrency(asset.netBookValue)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800 uppercase">
                        {asset.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-400" />
                Register New Fixed Asset
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Asset Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto or e.g. AST-004"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Asset Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Office Equipment">Office Equipment</option>
                    <option value="Computer & IT">Computer & IT Equipment</option>
                    <option value="Furniture & Fixtures">Furniture & Fixtures</option>
                    <option value="Motor Vehicles">Motor Vehicles & Delivery</option>
                    <option value="Plant & Machinery">Plant & Machinery / Testing Tools</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Asset Name / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell PowerEdge Server & Rack"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Acquisition Cost (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Useful Life (Years) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={formData.usefulLifeYears}
                    onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Salvage / Scrap Value (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salvageValue}
                    onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
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
                  {submitting ? "Saving..." : "Save Fixed Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Depreciation Modal */}
      {isRunOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                Run Periodic Depreciation
              </h2>
              <button onClick={() => setIsRunOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRunDepreciation} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Depreciation Month *
                </label>
                <input
                  type="month"
                  required
                  value={depMonth}
                  onChange={(e) => setDepMonth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-md text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Eligible Active Assets:</span>
                  <span className="font-semibold text-slate-200">{assets.length} Items</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                  This straight-line depreciation engine calculates monthly asset wear-and-tear and automatically posts a Journal Voucher debiting <strong>Depreciation Expense (505)</strong> and crediting <strong>Accumulated Depreciation (106)</strong>.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRunOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Calculating..." : "Post Depreciation Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
