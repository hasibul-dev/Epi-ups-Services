"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  Plus,
  RefreshCw,
  Printer,
  X,
  CreditCard,
  Building,
  User,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Eye,
  FileCheck,
} from "lucide-react";

interface InvoiceItem {
  id?: string;
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  mushakNo?: string;
  clientId: string;
  clientName?: string;
  clientCompany?: string;
  date: string;
  dueDate?: string;
  subtotal: number;
  vatAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  items?: InvoiceItem[];
}

interface InventoryItemOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sellingPrice: number;
  stockQty: number;
}

interface CustomerOption {
  id: string;
  name: string;
  company?: string;
}

export default function ErpInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isViewOpen, setIsViewOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state for creating invoice
  const [clientId, setClientId] = useState<string>("");
  const [manualClientName, setManualClientName] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [discount, setDiscount] = useState<string>("0");
  const [vatRate, setVatRate] = useState<number>(15);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
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
      const [invRes, custRes, itemRes] = await Promise.all([
        fetch("/api/erp/invoices"),
        fetch("/api/erp/customers"),
        fetch("/api/erp/inventory"),
      ]);

      if (invRes.ok) {
        const invJson = await invRes.json();
        setInvoices(invJson.invoices || []);
      }
      if (custRes.ok) {
        const custJson = await custRes.json();
        setCustomers(custJson.customers || []);
      }
      if (itemRes.ok) {
        const itemJson = await itemRes.json();
        setInventoryItems(itemJson.items || []);
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load invoices" });
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

  // Recalculate line items
  const updateLineItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    if (field === "itemId") {
      const selectedInv = inventoryItems.find((p) => p.id === value);
      if (selectedInv) {
        item.description = `${selectedInv.name} (${selectedInv.sku})`;
        item.unitPrice = selectedInv.sellingPrice || 0;
      }
    }

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    item.total = qty * price;
    updated[index] = item;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, taxRate: vatRate, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calcSubtotal = lineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const calcDiscount = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, calcSubtotal - calcDiscount);
  const calcVat = taxableAmount * (vatRate / 100);
  const calcGrandTotal = taxableAmount + calcVat;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId && !manualClientName.trim()) {
      setNotification({ type: "error", text: "Please select or enter customer name" });
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].description) {
      setNotification({ type: "error", text: "Please add at least one line item" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          manualClientName: manualClientName.trim() || undefined,
          date: invoiceDate,
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
          vatRate,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to issue invoice");

      setNotification({ type: "success", text: `Invoice ${resData.invoice?.invoiceNo || ""} created successfully!` });
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to create invoice" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setClientId("");
    setManualClientName("");
    setDiscount("0");
    setLineItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 15, total: 0 }]);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setNotification({ type: "error", text: "Please enter a valid receipt amount" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "receipt",
          partyType: "customer",
          partyId: activeInvoice.clientId,
          invoiceId: activeInvoice.id,
          amount,
          paymentMethod,
          date: paymentDate,
          reference: paymentRef || `Payment for ${activeInvoice.invoiceNo}`,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to record payment");

      setNotification({ type: "success", text: `Receipt recorded for ${activeInvoice.invoiceNo}!` });
      setIsPaymentOpen(false);
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to record payment" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNo?.toLowerCase().includes(q) ||
      inv.mushakNo?.toLowerCase().includes(q) ||
      inv.clientName?.toLowerCase().includes(q) ||
      inv.clientCompany?.toLowerCase().includes(q)
    );
  });

  const totalInvoicedSum = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const totalCollectedSum = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  const totalReceivablesSum = invoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0);
  const totalVatSum = invoices.reduce((sum, inv) => sum + (Number(inv.vatAmount) || 0), 0);

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
            <Receipt className="w-5 h-5 text-indigo-400" />
            Sales Invoices & Mushak 6.3
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Itemized VAT tax invoices, double-entry sales revenue posting, and receivables tracking
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
            Create Invoice
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
          <p className="text-lg font-bold text-slate-100 mt-1">{fmtCurrency(totalInvoicedSum)}</p>
          <span className="text-[10px] text-slate-500">{invoices.length} invoices generated</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Collected</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalCollectedSum)}</p>
          <span className="text-[10px] text-emerald-500/80">Payments received</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Receivables</span>
          <p className="text-lg font-bold text-amber-400 mt-1">{fmtCurrency(totalReceivablesSum)}</p>
          <span className="text-[10px] text-amber-500/80">Outstanding balance</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Output VAT (15%)</span>
          <p className="text-lg font-bold text-indigo-400 mt-1">{fmtCurrency(totalVatSum)}</p>
          <span className="text-[10px] text-indigo-400/80">Mushak 6.3 Tax Total</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Invoice #, Mushak #, customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["all", "issued", "paid", "partial", "draft"].map((status) => (
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

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Invoice # / Mushak</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-right">Subtotal (৳)</th>
                <th className="py-2.5 px-3 text-right">VAT 15% (৳)</th>
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
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    No sales invoices found. Click &quot;Create Invoice&quot; to generate one.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const due = Number(inv.balanceDue) || 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-semibold text-indigo-400">{inv.invoiceNo}</div>
                        {inv.mushakNo && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Mushak 6.3: {inv.mushakNo}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                        {inv.date}
                        {inv.dueDate && (
                          <div className="text-[10px] text-slate-500">Due: {inv.dueDate}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200">{inv.clientName || "Customer"}</div>
                        {inv.clientCompany && (
                          <div className="text-[11px] text-slate-400">{inv.clientCompany}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {fmtCurrency(inv.subtotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-300">
                        {fmtCurrency(inv.vatAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                        {fmtCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {fmtCurrency(inv.balanceDue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            inv.status?.toLowerCase() === "paid"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                              : inv.status?.toLowerCase() === "partial"
                              ? "bg-sky-950/60 text-sky-400 border border-sky-800"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {inv.status || "ISSUED"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="View / Print Tax Invoice"
                            onClick={() => {
                              setActiveInvoice(inv);
                              setIsViewOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-400 bg-slate-800 hover:bg-slate-700 rounded transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {due > 0 && (
                            <button
                              title="Record Payment Receipt"
                              onClick={() => {
                                setActiveInvoice(inv);
                                setPaymentAmount(due.toString());
                                setIsPaymentOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-950 border border-emerald-800 rounded transition"
                            >
                              Receive
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

      {/* Create Invoice Drawer/Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Create New Sales Tax Invoice (Mushak 6.3)
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Customer and Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Customer *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      if (e.target.value) setManualClientName("");
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Registered Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                  {!clientId && (
                    <input
                      type="text"
                      placeholder="Or enter walk-in customer name"
                      value={manualClientName}
                      onChange={(e) => setManualClientName(e.target.value)}
                      className="mt-1.5 w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Due Date
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
                    Itemized Products / Services
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
                        <th className="p-2 w-1/4">Inventory Item (Optional)</th>
                        <th className="p-2 w-1/3">Description / Specification *</th>
                        <th className="p-2 w-20 text-center">Qty</th>
                        <th className="p-2 w-28 text-right">Unit Price (৳)</th>
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
                              <option value="">-- Custom Item --</option>
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
                              placeholder="e.g. EPI 3kVA Online UPS with SNMP"
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
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5"
                    >
                      <option value={15}>Standard 15%</option>
                      <option value={10}>10%</option>
                      <option value={7.5}>7.5%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0% (Exempt)</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-indigo-400">
                    <span>VAT Amount:</span>
                    <span className="font-mono font-semibold">{fmtCurrency(calcVat)}</span>
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
                  {submitting ? "Posting..." : "Issue Tax Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Mushak 6.3 Printable Tax Invoice Modal */}
      {isViewOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl print:bg-white print:border-none print:shadow-none print:max-h-full">
            {/* Header controls (hidden on print) */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950 print:hidden">
              <span className="text-xs font-semibold text-slate-300">
                Tax Invoice Preview (Mushak-6.3)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Mushak 6.3
                </button>
                <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Mushak 6.3 Layout */}
            <div className="p-6 bg-white text-black font-sans text-xs overflow-y-auto flex-1 print:p-0">
              <div className="text-center border-b border-black pb-2 mb-3">
                <p className="text-[10px] uppercase font-semibold text-gray-700">
                  Government of the People&apos;s Republic of Bangladesh | National Board of Revenue
                </p>
                <h1 className="text-base font-bold uppercase tracking-wider text-black">
                  TAX INVOICE / কর চালানপত্র
                </h1>
                <p className="text-[10px] text-gray-800 italic">
                  [See rule 40, sub-rule (1), clause (ga) and clause (cha)] / [বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) ও দফা (চ) দ্রষ্টব্য]
                </p>
                <div className="inline-block mt-1 px-3 py-0.5 border border-black font-mono font-bold text-xs uppercase">
                  Mushak-6.3 / মূসক-৬.৩
                </div>
              </div>

              {/* Seller and Buyer Details */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-[11px] border border-gray-300 p-2.5">
                <div>
                  <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-0.5 mb-1 uppercase">
                    Registered Supplier / বিক্রেতার তথ্য
                  </h3>
                  <p className="font-bold">EPI UPS Bangladesh Limited</p>
                  <p>Plot #12, Road #4, Motijheel C/A, Dhaka-1000</p>
                  <p className="font-mono mt-0.5">
                    <strong>Seller BIN:</strong> 002145892-0101
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-0.5 mb-1 uppercase">
                    Registered Purchaser / ক্রেতার তথ্য
                  </h3>
                  <p className="font-bold">{activeInvoice.clientName}</p>
                  {activeInvoice.clientCompany && <p>{activeInvoice.clientCompany}</p>}
                  <p className="font-mono mt-0.5">
                    <strong>Invoice #:</strong> {activeInvoice.invoiceNo}
                  </p>
                  <p className="font-mono">
                    <strong>Date & Time:</strong> {activeInvoice.date}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-black text-[11px] mb-4">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-center font-bold">
                    <th className="border border-black p-1.5 w-8">SL</th>
                    <th className="border border-black p-1.5 text-left">Goods or Services Description</th>
                    <th className="border border-black p-1.5 w-14">Qty</th>
                    <th className="border border-black p-1.5 w-24 text-right">Unit Value (৳)</th>
                    <th className="border border-black p-1.5 w-24 text-right">Total Value (৳)</th>
                    <th className="border border-black p-1.5 w-20 text-right">VAT (15%)</th>
                    <th className="border border-black p-1.5 w-24 text-right">Net Total (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.items && activeInvoice.items.length > 0 ? (
                    activeInvoice.items.map((item, idx) => {
                      const itemVat = item.total * (item.taxRate / 100);
                      const itemGross = item.total + itemVat;
                      return (
                        <tr key={idx} className="border-b border-gray-300">
                          <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                          <td className="border border-black p-1.5">{item.description}</td>
                          <td className="border border-black p-1.5 text-center">{item.quantity}</td>
                          <td className="border border-black p-1.5 text-right font-mono">
                            {Number(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="border border-black p-1.5 text-right font-mono">
                            {Number(item.total).toFixed(2)}
                          </td>
                          <td className="border border-black p-1.5 text-right font-mono">
                            {itemVat.toFixed(2)}
                          </td>
                          <td className="border border-black p-1.5 text-right font-mono font-bold">
                            {itemGross.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="border border-black p-1.5 text-center">1</td>
                      <td className="border border-black p-1.5">EPI UPS Enterprise Equipment & Services</td>
                      <td className="border border-black p-1.5 text-center">1</td>
                      <td className="border border-black p-1.5 text-right font-mono">
                        {Number(activeInvoice.subtotal).toFixed(2)}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono">
                        {Number(activeInvoice.subtotal).toFixed(2)}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono">
                        {Number(activeInvoice.vatAmount).toFixed(2)}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono font-bold">
                        {Number(activeInvoice.totalAmount).toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black font-bold">
                    <td colSpan={4} className="border border-black p-1.5 text-right uppercase">
                      Subtotal / নিট মূল্য:
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {Number(activeInvoice.subtotal).toFixed(2)}
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {Number(activeInvoice.vatAmount).toFixed(2)}
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                      {Number(activeInvoice.totalAmount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Amount in Words & Signatures */}
              <div className="border border-gray-300 p-2 mb-6 text-[11px]">
                <p>
                  <strong>Total Value in Words:</strong> Bangladeshi Taka{" "}
                  {Number(activeInvoice.totalAmount).toLocaleString()} Only.
                </p>
              </div>

              <div className="flex justify-between pt-12 text-center text-[10px]">
                <div className="w-48 border-t border-black pt-1">
                  <p className="font-semibold">Customer Receiver Signature</p>
                  <p className="text-gray-600">Seal & Date</p>
                </div>
                <div className="w-48 border-t border-black pt-1">
                  <p className="font-semibold">For EPI UPS Bangladesh Limited</p>
                  <p className="text-gray-600">Authorised Officer Signature & Seal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Record Collection / Receipt
              </h2>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-4 space-y-3">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-md text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Invoice No:</span>
                  <span className="font-mono text-indigo-400 font-semibold">{activeInvoice.invoiceNo}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Customer:</span>
                  <span className="text-slate-200">{activeInvoice.clientName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Amount:</span>
                  <span className="font-mono text-slate-200">{fmtCurrency(activeInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800 pt-1">
                  <span>Remaining Due:</span>
                  <span className="font-mono">{fmtCurrency(activeInvoice.balanceDue)}</span>
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
                  max={activeInvoice.balanceDue}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Deposit Mode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Bank">Bank Deposit / Cheque</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Mobile">bKash / Nagad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Receipt Date
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
                  Cheque # / Transaction Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. City Bank Chq #481029"
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
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Confirm Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
