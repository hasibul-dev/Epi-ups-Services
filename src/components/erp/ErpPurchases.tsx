"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  RefreshCw,
  Printer,
  X,
  CreditCard,
  Building,
  Truck,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PurchaseItem {
  id?: string;
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface Purchase {
  id: string;
  purchaseNo?: string;
  billNo?: string;
  supplierId: string;
  supplierName?: string;
  supplierCompany?: string;
  date: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balancePayable: number;
  status: string;
  items?: PurchaseItem[];
}

interface SupplierOption {
  id: string;
  code: string;
  name: string;
  company?: string;
}

interface InventoryItemOption {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
  stockQty: number;
}

export default function ErpPurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isViewOpen, setIsViewOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [activePurchase, setActivePurchase] = useState<Purchase | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [supplierId, setSupplierId] = useState<string>("");
  const [billNo, setBillNo] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [discount, setDiscount] = useState<string>("0");
  const [taxRate, setTaxRate] = useState<number>(15);
  const [lineItems, setLineItems] = useState<PurchaseItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 15, total: 0 },
  ]);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentRef, setPaymentRef] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purRes, supRes, itemRes] = await Promise.all([
        fetch("/api/erp/purchases"),
        fetch("/api/erp/suppliers"),
        fetch("/api/erp/inventory"),
      ]);

      if (purRes.ok) {
        const purJson = await purRes.json();
        setPurchases(purJson.purchases || []);
      }
      if (supRes.ok) {
        const supJson = await supRes.json();
        setSuppliers(supJson.suppliers || []);
      }
      if (itemRes.ok) {
        const itemJson = await itemRes.json();
        setInventoryItems(itemJson.items || []);
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load purchases" });
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

  const updateLineItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    if (field === "itemId") {
      const selectedInv = inventoryItems.find((p) => p.id === value);
      if (selectedInv) {
        item.description = `${selectedInv.name} (${selectedInv.sku})`;
        item.unitPrice = selectedInv.costPrice || 0;
      }
    }

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    item.total = qty * price;
    updated[index] = item;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, taxRate, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calcSubtotal = lineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const calcDiscount = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, calcSubtotal - calcDiscount);
  const calcTax = taxableAmount * (taxRate / 100);
  const calcGrandTotal = taxableAmount + calcTax;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setNotification({ type: "error", text: "Please select a supplier" });
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].description) {
      setNotification({ type: "error", text: "Please enter item details" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          billNo: billNo.trim() || undefined,
          date: purchaseDate,
          dueDate,
          items: lineItems.map((item) => ({
            itemId: item.itemId || undefined,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            taxRate: Number(item.taxRate) || 15,
            total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
          })),
          discount: calcDiscount,
          taxRate,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create purchase bill");

      setNotification({ type: "success", text: "Purchase bill recorded and inventory updated!" });
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save purchase bill" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSupplierId("");
    setBillNo("");
    setDiscount("0");
    setLineItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 15, total: 0 }]);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePurchase) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setNotification({ type: "error", text: "Please enter a valid payment amount" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          partyType: "supplier",
          partyId: activePurchase.supplierId,
          purchaseId: activePurchase.id,
          amount,
          paymentMethod,
          date: paymentDate,
          reference: paymentRef || `Payment for Bill ${activePurchase.billNo || activePurchase.purchaseNo}`,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to record payment");

      setNotification({ type: "success", text: "Supplier payment voucher recorded successfully!" });
      setIsPaymentOpen(false);
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to record payment" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter((pur) => {
    if (statusFilter !== "all" && pur.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      pur.purchaseNo?.toLowerCase().includes(q) ||
      pur.billNo?.toLowerCase().includes(q) ||
      pur.supplierName?.toLowerCase().includes(q) ||
      pur.supplierCompany?.toLowerCase().includes(q)
    );
  });

  const totalPurchasesSum = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const totalPaidSum = purchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const totalPayableSum = purchases.reduce((sum, p) => sum + (Number(p.balancePayable) || 0), 0);
  const totalInputTaxSum = purchases.reduce((sum, p) => sum + (Number(p.tax) || 0), 0);

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
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            Purchase Bills & Procurement
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Vendor bills, input VAT tax credit, inventory stock-in, and accounts payable
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
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Purchase Bill
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Purchases</span>
          <p className="text-lg font-bold text-slate-100 mt-1">{fmtCurrency(totalPurchasesSum)}</p>
          <span className="text-[10px] text-slate-500">{purchases.length} vendor bills</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Paid</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalPaidSum)}</p>
          <span className="text-[10px] text-emerald-500/80">Payments settled</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Payables</span>
          <p className="text-lg font-bold text-rose-400 mt-1">{fmtCurrency(totalPayableSum)}</p>
          <span className="text-[10px] text-rose-500/80">Outstanding liabilities</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Input VAT (Rebate)</span>
          <p className="text-lg font-bold text-indigo-400 mt-1">{fmtCurrency(totalInputTaxSum)}</p>
          <span className="text-[10px] text-indigo-400/80">Mushak 9.1 Part 4 Rebate</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Bill #, Supplier name, Purchase ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["all", "received", "paid", "partial", "draft"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-xs rounded font-medium capitalize transition ${
                statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Purchase # / Bill</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3 text-right">Subtotal (৳)</th>
                <th className="py-2.5 px-3 text-right">Input VAT (৳)</th>
                <th className="py-2.5 px-3 text-right">Grand Total (৳)</th>
                <th className="py-2.5 px-3 text-right">Balance Due (৳)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading purchase bills...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    No purchase bills recorded. Click &quot;Add Purchase Bill&quot; to create one.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur) => {
                  const due = Number(pur.balancePayable) || 0;
                  return (
                    <tr key={pur.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-semibold text-indigo-400">{pur.purchaseNo || "PUR"}</div>
                        {pur.billNo && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Bill Ref: {pur.billNo}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {pur.date}
                        {pur.dueDate && (
                          <div className="text-[10px] text-slate-500">Due: {pur.dueDate}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200">{pur.supplierName || "Supplier"}</div>
                        {pur.supplierCompany && (
                          <div className="text-[11px] text-slate-400">{pur.supplierCompany}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {fmtCurrency(pur.subtotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-300">
                        {fmtCurrency(pur.tax)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                        {fmtCurrency(pur.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                        {fmtCurrency(pur.balancePayable)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            pur.status?.toLowerCase() === "paid"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                              : pur.status?.toLowerCase() === "partial"
                              ? "bg-sky-950/60 text-sky-400 border border-sky-800"
                              : "bg-rose-950/60 text-rose-400 border border-rose-800"
                          }`}
                        >
                          {pur.status || "RECEIVED"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="View / Print Bill"
                            onClick={() => {
                              setActivePurchase(pur);
                              setIsViewOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-slate-700 rounded transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {due > 0 && (
                            <button
                              title="Make Payment to Vendor"
                              onClick={() => {
                                setActivePurchase(pur);
                                setPaymentAmount(due.toString());
                                setIsPaymentOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/50 hover:bg-rose-950 border border-rose-800 rounded transition"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Drawer */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-400" />
                Record Vendor Purchase Bill
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Supplier / Vendor *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name} {s.company ? `(${s.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Vendor Bill / Challan #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NAV-2026-041"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Purchased Goods / Stock Items
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item Line
                  </button>
                </div>

                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <th className="p-2 w-1/4">Inventory Item (Stock-In)</th>
                        <th className="p-2 w-1/3">Description / Specs *</th>
                        <th className="p-2 w-20 text-center">Qty</th>
                        <th className="p-2 w-28 text-right">Unit Cost (৳)</th>
                        <th className="p-2 w-28 text-right">Total (৳)</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                      {lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={item.itemId || ""}
                              onChange={(e) => updateLineItem(idx, "itemId", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded p-1"
                            >
                              <option value="">-- Generic Expense / Part --</option>
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name} (Stock: {inv.stockQty})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="e.g. 12V 100Ah Deep Cycle AGM Battery"
                              value={item.description}
                              onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded p-1"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-center text-[11px] rounded p-1"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-right text-[11px] rounded p-1"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-slate-200">
                            {fmtCurrency(item.total)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              disabled={lineItems.length === 1}
                              className="text-slate-500 hover:text-rose-400 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-72 bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-200 font-semibold">{fmtCurrency(calcSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Discount (৳):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 bg-slate-900 border border-slate-700 text-slate-200 text-right text-xs rounded px-1.5 py-0.5"
                    />
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>VAT Rate:</span>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5"
                    >
                      <option value={15}>Standard 15%</option>
                      <option value={10}>10%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-indigo-400">
                    <span>Input VAT (Rebate):</span>
                    <span className="font-mono font-semibold">{fmtCurrency(calcTax)}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-slate-100">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-400">{fmtCurrency(calcGrandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Saving & Posting..." : "Post Purchase Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View / Print Purchase Bill Modal */}
      {isViewOpen && activePurchase && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Purchase Bill Detail</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 rounded my-3 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Purchase Reference:</span>
                <span className="font-mono font-bold text-indigo-400">{activePurchase.purchaseNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vendor Bill #:</span>
                <span className="font-mono text-slate-200">{activePurchase.billNo || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="text-slate-200 font-semibold">{activePurchase.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="text-slate-300">{activePurchase.date}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-slate-100">
                <span>Total Bill Amount:</span>
                <span className="font-mono text-emerald-400">{fmtCurrency(activePurchase.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-semibold">
                <span>Balance Payable:</span>
                <span className="font-mono">{fmtCurrency(activePurchase.balancePayable)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentOpen && activePurchase && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-400" />
                Record Vendor Settlement / Payment
              </h2>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-4 space-y-3">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-md text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Bill / Ref:</span>
                  <span className="font-mono text-indigo-400 font-semibold">{activePurchase.purchaseNo}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Supplier:</span>
                  <span className="text-slate-200">{activePurchase.supplierName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Bill:</span>
                  <span className="font-mono text-slate-200">{fmtCurrency(activePurchase.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800 pt-1">
                  <span>Payable Due:</span>
                  <span className="font-mono">{fmtCurrency(activePurchase.balancePayable)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Payment Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={activePurchase.balancePayable}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Bank">Bank Transfer / Cheque</option>
                    <option value="Cash">Cash in Hand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Bank Cheque # / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cheque #192083"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
