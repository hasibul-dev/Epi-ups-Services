"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Calendar,
  Filter,
  Printer,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Building2,
  User,
  Truck,
  Landmark,
  Wallet,
} from "lucide-react";

interface LedgerEntry {
  id: string;
  date: string;
  voucherNo: string;
  voucherType: string;
  accountCode?: string;
  accountName?: string;
  partyName?: string;
  partyType?: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerResponse {
  type: string;
  accountId?: string;
  account?: { id: string; code: string; name: string; type: string };
  party?: { id: string; name: string; company?: string };
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
  accountsList?: Array<{ id: string; code: string; name: string; type: string }>;
  customersList?: Array<{ id: string; name: string; company?: string }>;
  suppliersList?: Array<{ id: string; name: string; company?: string }>;
}

export default function ErpLedger() {
  const [ledgerType, setLedgerType] = useState<"general" | "customer" | "supplier" | "cash" | "bank">("general");
  const [selectedId, setSelectedId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        type: ledgerType,
      });
      if (selectedId) params.append("targetId", selectedId);
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);

      const res = await fetch(`/api/erp/ledger?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load ledger records");
      const json = await res.json();
      setData(json);
      if (!selectedId && json.defaultId) {
        setSelectedId(json.defaultId);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [ledgerType, selectedId, dateFrom, dateTo]);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data || !data.entries.length) return;
    const headers = ["Date", "Voucher No", "Voucher Type", "Particulars / Account", "Debit (BDT)", "Credit (BDT)", "Running Balance (BDT)"];
    const rows = data.entries.map((e) => [
      e.date,
      e.voucherNo,
      e.voucherType,
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit.toFixed(2),
      e.credit.toFixed(2),
      e.runningBalance.toFixed(2),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Ledger_${ledgerType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = (data?.entries || []).filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.voucherNo?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.accountName?.toLowerCase().includes(q) ||
      e.partyName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 print:p-0 print:space-y-3">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Accounts Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed transaction statements with opening and running balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLedger}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Printable Letterhead (visible only on print) */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-3">
        <h2 className="text-lg font-bold text-black uppercase tracking-wider">EPI UPS Bangladesh Limited</h2>
        <p className="text-xs text-slate-700">Official Accounts Ledger Statement</p>
        <p className="text-xs text-slate-600">
          Period: {dateFrom || "Inception"} to {dateTo || "Current Date"} | Printed on: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Ledger Navigation Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg print:hidden">
        <button
          onClick={() => {
            setLedgerType("general");
            setSelectedId("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
            ledgerType === "general" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          General Ledger
        </button>
        <button
          onClick={() => {
            setLedgerType("customer");
            setSelectedId("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
            ledgerType === "customer" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Customer Ledger
        </button>
        <button
          onClick={() => {
            setLedgerType("supplier");
            setSelectedId("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
            ledgerType === "supplier" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Supplier Ledger
        </button>
        <button
          onClick={() => {
            setLedgerType("cash");
            setSelectedId("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
            ledgerType === "cash" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          Cash Ledger
        </button>
        <button
          onClick={() => {
            setLedgerType("bank");
            setSelectedId("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
            ledgerType === "bank" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          Bank Ledger
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {/* Account / Party Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {ledgerType === "customer"
              ? "Select Customer"
              : ledgerType === "supplier"
              ? "Select Supplier"
              : "Select Account"}
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- All Accounts / Master --</option>
            {ledgerType === "general" &&
              (data?.accountsList || []).map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name} ({acc.type})
                </option>
              ))}
            {ledgerType === "customer" &&
              (data?.customersList || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ""}
                </option>
              ))}
            {ledgerType === "supplier" &&
              (data?.suppliersList || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.company ? `(${s.company})` : ""}
                </option>
              ))}
            {ledgerType === "cash" &&
              (data?.accountsList || [])
                .filter((a) => a.code.startsWith("101") || a.name.toLowerCase().includes("cash"))
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
            {ledgerType === "bank" &&
              (data?.accountsList || [])
                .filter((a) => a.code.startsWith("102") || a.name.toLowerCase().includes("bank"))
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Date From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Date To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Search Within Ledger */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Search Particulars / Voucher
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search in statement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Opening Balance</span>
          <p className="text-base font-bold text-slate-200 mt-1">
            {fmtCurrency(data?.openingBalance)}
          </p>
          <span className="text-[10px] text-slate-500">As of period start</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Debit</span>
          <p className="text-base font-bold text-emerald-400 mt-1">
            {fmtCurrency(data?.totalDebit)}
          </p>
          <span className="text-[10px] text-emerald-500/80">Incoming / Dr postings</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Credit</span>
          <p className="text-base font-bold text-rose-400 mt-1">
            {fmtCurrency(data?.totalCredit)}
          </p>
          <span className="text-[10px] text-rose-500/80">Outgoing / Cr postings</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Closing Balance</span>
          <p className="text-base font-bold text-indigo-400 mt-1">
            {fmtCurrency(data?.closingBalance)}
          </p>
          <span className="text-[10px] text-indigo-400/80">Net running position</span>
        </div>
      </div>

      {/* Account Info Banner */}
      {(data?.account || data?.party) && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-100">
              {data.account ? `${data.account.code} - ${data.account.name}` : data.party?.name}
            </span>
            {data.party?.company && <span className="text-slate-400">({data.party.company})</span>}
          </div>
          <div className="text-slate-400 text-[11px]">
            {filteredEntries.length} transaction entries found
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Particulars / Account</th>
                <th className="py-2.5 px-3 text-right">Debit (৳)</th>
                <th className="py-2.5 px-3 text-right">Credit (৳)</th>
                <th className="py-2.5 px-3 text-right">Balance (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {/* Row for Opening Balance */}
              <tr className="bg-slate-950/40 text-slate-400 italic">
                <td className="py-2 px-3 text-slate-500">{dateFrom || "-"}</td>
                <td className="py-2 px-3">-</td>
                <td className="py-2 px-3">-</td>
                <td className="py-2 px-3 font-medium text-slate-300">Opening Balance B/F</td>
                <td className="py-2 px-3 text-right">-</td>
                <td className="py-2 px-3 text-right">-</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-200">
                  {fmtCurrency(data?.openingBalance)}
                </td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading ledger records...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No ledger transactions found for this period or account.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">{row.date}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-medium text-indigo-400">
                      {row.voucherNo || "-"}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {row.voucherType || "ENTRY"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-200">{row.description}</div>
                      {(row.accountName || row.partyName) && (
                        <div className="text-[11px] text-slate-400">
                          {row.accountCode ? `${row.accountCode} - ` : ""}
                          {row.accountName || row.partyName}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                      {row.debit > 0 ? fmtCurrency(row.debit) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-400">
                      {row.credit > 0 ? fmtCurrency(row.credit) : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-100">
                      {fmtCurrency(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data && (
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950 font-semibold text-slate-200 text-xs">
                  <td colSpan={4} className="py-2.5 px-3 uppercase text-right tracking-wider">
                    Total Period Activity / Closing:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                    {fmtCurrency(data.totalDebit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                    {fmtCurrency(data.totalCredit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-400 text-sm">
                    {fmtCurrency(data.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
