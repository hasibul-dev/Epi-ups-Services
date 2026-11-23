"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Building,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  FileSpreadsheet,
  Coins,
} from "lucide-react";

export default function ErpSettings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState({
    companyName: "EPI UPS Bangladesh Limited",
    address: "Plot #12, Road #4, Motijheel C/A, Dhaka-1000",
    phone: "+880 2 9568123",
    email: "accounts@epi-ups.com.bd",
    website: "https://epi-ups.com.bd",
    bin: "002145892-0101",
    tin: "581920481902",
    currency: "BDT",
    currencySymbol: "৳",
    fiscalYearStart: "July",
    vatRate: "15.00",
    prefixJournal: "JV-",
    prefixPayment: "PV-",
    prefixReceipt: "RV-",
    prefixContra: "CV-",
    prefixAsset: "AV-",
    prefixInvoice: "INV-",
    prefixPurchase: "PUR-",
    prefixMushak: "M63-",
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/erp/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings((prev) => ({ ...prev, ...json.settings }));
        }
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update settings");

      setNotification({ type: "success", text: "Accounts & ERP settings updated successfully!" });
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save settings" });
    } finally {
      setSubmitting(false);
    }
  };

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
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            Accounts & ERP Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Company information, Bangladesh VAT registration, fiscal calendars, and document auto-numbering prefixes
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={submitting}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {submitting ? "Saving Changes..." : "Save Settings"}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Company Legal Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building className="w-4 h-4 text-indigo-400" />
            Company & Entity Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
              Registered Office Address
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* VAT & Statutory Registration */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Bangladesh Statutory & VAT Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Business Identification Number (BIN)
              </label>
              <input
                type="text"
                value={settings.bin}
                onChange={(e) => setSettings({ ...settings, bin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono font-medium"
              />
              <span className="text-[10px] text-slate-500">Printed on Mushak 6.3 Tax Invoices</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Taxpayer Identification Number (TIN)
              </label>
              <input
                type="text"
                value={settings.tin}
                onChange={(e) => setSettings({ ...settings, tin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Default Standard VAT Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.vatRate}
                onChange={(e) => setSettings({ ...settings, vatRate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-500">Standard NBR rate (15%)</span>
            </div>
          </div>
        </div>

        {/* Currency & Financial Calendar */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <Coins className="w-4 h-4 text-amber-400" />
            Accounting Currency & Fiscal Year
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Base Accounting Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="BDT">Bangladeshi Taka (BDT)</option>
                <option value="USD">US Dollar (USD)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Fiscal Year Start Month
              </label>
              <select
                value={settings.fiscalYearStart}
                onChange={(e) => setSettings({ ...settings, fiscalYearStart: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="July">July (Bangladesh Standard)</option>
                <option value="January">January (Calendar Year)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Voucher and Auto Numbering Prefixes */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            Document & Voucher Numbering Prefixes
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Journal Voucher (JV)
              </label>
              <input
                type="text"
                value={settings.prefixJournal}
                onChange={(e) => setSettings({ ...settings, prefixJournal: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Payment Voucher (PV)
              </label>
              <input
                type="text"
                value={settings.prefixPayment}
                onChange={(e) => setSettings({ ...settings, prefixPayment: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Receipt Voucher (RV)
              </label>
              <input
                type="text"
                value={settings.prefixReceipt}
                onChange={(e) => setSettings({ ...settings, prefixReceipt: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Contra Voucher (CV)
              </label>
              <input
                type="text"
                value={settings.prefixContra}
                onChange={(e) => setSettings({ ...settings, prefixContra: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Sales Invoice (INV)
              </label>
              <input
                type="text"
                value={settings.prefixInvoice}
                onChange={(e) => setSettings({ ...settings, prefixInvoice: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Purchase Bill (PUR)
              </label>
              <input
                type="text"
                value={settings.prefixPurchase}
                onChange={(e) => setSettings({ ...settings, prefixPurchase: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Mushak 6.3 Challan
              </label>
              <input
                type="text"
                value={settings.prefixMushak}
                onChange={(e) => setSettings({ ...settings, prefixMushak: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Asset Code (AV)
              </label>
              <input
                type="text"
                value={settings.prefixAsset}
                onChange={(e) => setSettings({ ...settings, prefixAsset: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
