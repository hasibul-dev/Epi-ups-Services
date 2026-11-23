"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Sliders,
  X,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  reorderLevel: number;
  totalValuation: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export default function ErpInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add Item form state
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "UPS",
    unit: "Pcs",
    costPrice: "0",
    sellingPrice: "0",
    openingStock: "0",
    reorderLevel: "5",
  });

  // Adjustment form state
  const [adjustData, setAdjustData] = useState({
    itemId: "",
    type: "in",
    quantity: "1",
    reason: "",
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/erp/inventory");
      if (!res.ok) throw new Error("Failed to load inventory items");
      const json = await res.json();
      setItems(json.items || []);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load inventory" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setNotification({ type: "error", text: "Item name is required" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formData.sku.trim() || undefined,
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit,
          costPrice: parseFloat(formData.costPrice) || 0,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          openingStock: parseFloat(formData.openingStock) || 0,
          reorderLevel: parseFloat(formData.reorderLevel) || 5,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save item");

      setNotification({ type: "success", text: "Inventory item added successfully!" });
      setIsAddOpen(false);
      setFormData({
        sku: "",
        name: "",
        category: "UPS",
        unit: "Pcs",
        costPrice: "0",
        sellingPrice: "0",
        openingStock: "0",
        reorderLevel: "5",
      });
      fetchInventory();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save inventory item" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustData.itemId) {
      setNotification({ type: "error", text: "Please select an item" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: adjustData.itemId,
          type: adjustData.type,
          quantity: parseFloat(adjustData.quantity) || 1,
          reason: adjustData.reason.trim() || "Stock Audit Adjustment",
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to adjust stock");

      setNotification({ type: "success", text: "Stock adjustment recorded successfully!" });
      setIsAdjustOpen(false);
      setAdjustData({ itemId: "", type: "in", quantity: "1", reason: "" });
      fetchInventory();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to adjust stock" });
    } finally {
      setSubmitting(false);
    }
  };

  const categories = Array.from(new Set(items.map((i) => i.category || "General"))).filter(Boolean);

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && (item.category || "General") !== categoryFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q);
  });

  const totalSKUs = items.length;
  const totalValuation = items.reduce((sum, i) => sum + (Number(i.totalValuation) || 0), 0);
  const lowStockCount = items.filter((i) => i.stockQty <= i.reorderLevel).length;

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
            <Package className="w-5 h-5 text-indigo-400" />
            Inventory Items & Stock Valuation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            UPS, battery, and spare parts catalog, reorder levels, stock-in/out, and asset valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInventory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAdjustOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Stock Adjustment
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Inventory Items</span>
          <p className="text-lg font-bold text-slate-100 mt-1">{totalSKUs} SKUs</p>
          <span className="text-[10px] text-slate-500">Active stock catalog</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Stock Valuation</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalValuation)}</p>
          <span className="text-[10px] text-emerald-500/80">Current asset value at cost</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warnings</span>
          <p className={`text-lg font-bold mt-1 ${lowStockCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
            {lowStockCount} Items
          </p>
          <span className="text-[10px] text-amber-500/80">Below reorder safety threshold</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by SKU, product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-2.5 py-1 text-xs rounded font-medium transition ${
              categoryFilter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition whitespace-nowrap ${
                categoryFilter === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Stock Qty</th>
                <th className="py-2.5 px-3 text-right">Cost Price (৳)</th>
                <th className="py-2.5 px-3 text-right">Selling Price (৳)</th>
                <th className="py-2.5 px-3 text-right">Total Value (৳)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading stock records...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No inventory items found. Click &quot;Add Item&quot; to populate your catalog.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.stockQty <= item.reorderLevel && item.stockQty > 0;
                  const isOut = item.stockQty <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-indigo-400">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500">
                          Reorder Level: {item.reorderLevel} {item.unit}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-100">
                        {item.stockQty} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {fmtCurrency(item.costPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        {fmtCurrency(item.sellingPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                        {fmtCurrency(item.totalValuation)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isOut ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-950/60 text-rose-400 border border-rose-800">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-950/60 text-amber-400 border border-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            In Stock
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

      {/* Add Item Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                Add New Inventory Item
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto or e.g. UPS-1KVA-ONL"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="UPS">Online UPS</option>
                    <option value="Battery">Battery & Bank</option>
                    <option value="AVR">Voltage Regulator / AVR</option>
                    <option value="Inverter">Inverter / Solar</option>
                    <option value="Spare Parts">Spare Parts & Accessories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Item Description / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EPI 2kVA Online UPS (Standard Model)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Unit of Supply
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Set">Set</option>
                    <option value="Unit">Unit</option>
                    <option value="Box">Box</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Cost Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Selling Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Opening Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.openingStock}
                    onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
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
                  {submitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-indigo-400" />
                Physical Stock Adjustment / Audit
              </h2>
              <button onClick={() => setIsAdjustOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Select Item *
                </label>
                <select
                  required
                  value={adjustData.itemId}
                  onChange={(e) => setAdjustData({ ...adjustData, itemId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Current Stock: {i.stockQty} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustData.type}
                    onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="in">Stock In (+) / Found</option>
                    <option value="out">Stock Out (-) / Used</option>
                    <option value="damage">Damaged (-) / Written Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustData.quantity}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Reason / Audit Remarks *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual warehouse audit adjustment"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Commit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
