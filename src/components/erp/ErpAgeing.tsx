"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Search,
  RefreshCw,
  Printer,
  Download,
  Users,
  Truck,
  AlertCircle,
  Building,
} from "lucide-react";

interface AgeingBucketItem {
  id: string;
  name: string;
  company?: string;
  contactNumber?: string;
  totalBalance: number;
  current: number; // 0-30 days
  days31to60: number; // 31-60 days
  days61to90: number; // 61-90 days
  days90Plus: number; // >90 days
}

interface AgeingResponse {
  type: "receivable" | "payable";
  summary: {
    total: number;
    current: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
  };
  items: AgeingBucketItem[];
}

export default function ErpAgeing() {
  const [reportType, setReportType] = useState<"receivable" | "payable">("receivable");
  const [data, setData] = useState<AgeingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchAgeing = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/erp/ageing?type=${reportType}`);
      if (!res.ok) throw new Error("Failed to load ageing records");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load ageing report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgeing();
  }, [reportType]);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredItems = (data?.items || []).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(q) || item.company?.toLowerCase().includes(q);
  });

  const handleExportCSV = () => {
    if (!data || !data.items.length) return;
    const headers = [
      reportType === "receivable" ? "Customer" : "Supplier",
      "Company",
      "Total Outstanding (৳)",
      "Current 0-30d (৳)",
      "31-60d (৳)",
      "61-90d (৳)",
      ">90d Overdue (৳)",
    ];
    const rows = data.items.map((i) => [
      `"${i.name.replace(/"/g, '""')}"`,
      `"${(i.company || "").replace(/"/g, '""')}"`,
      i.totalBalance.toFixed(2),
      i.current.toFixed(2),
      i.days31to60.toFixed(2),
      i.days61to90.toFixed(2),
      i.days90Plus.toFixed(2),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Ageing_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 print:p-0 print:space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Ageing Analysis (Receivables & Payables)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Credit risk management, customer overdue ageing and vendor payment scheduling
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAgeing}
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
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Switcher Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg print:hidden">
        <button
          onClick={() => setReportType("receivable")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
            reportType === "receivable"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Users className="w-4 h-4" />
          Accounts Receivable Ageing (Customer Dues)
        </button>
        <button
          onClick={() => setReportType("payable")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
            reportType === "payable"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Truck className="w-4 h-4" />
          Accounts Payable Ageing (Vendor Liabilities)
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Outstanding</span>
          <p className="text-base font-bold text-slate-100 mt-1">{fmtCurrency(data?.summary?.total)}</p>
          <span className="text-[10px] text-slate-500">Gross position</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current (0-30d)</span>
          <p className="text-base font-bold text-emerald-400 mt-1">{fmtCurrency(data?.summary?.current)}</p>
          <span className="text-[10px] text-emerald-500/80">Within normal credit</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">31 - 60 Days</span>
          <p className="text-base font-bold text-sky-400 mt-1">{fmtCurrency(data?.summary?.days31to60)}</p>
          <span className="text-[10px] text-sky-500/80">Mild overdue</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">61 - 90 Days</span>
          <p className="text-base font-bold text-amber-400 mt-1">{fmtCurrency(data?.summary?.days61to90)}</p>
          <span className="text-[10px] text-amber-500/80">Follow-up needed</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">&gt; 90 Days Overdue</span>
          <p className="text-base font-bold text-rose-400 mt-1">{fmtCurrency(data?.summary?.days90Plus)}</p>
          <span className="text-[10px] text-rose-500/80">High risk / critical</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 print:hidden">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder={`Search ${reportType === "receivable" ? "customer" : "supplier"} name or company...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Ageing Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">{reportType === "receivable" ? "Customer" : "Supplier"}</th>
                <th className="py-2.5 px-3 text-right">Total Outstanding (৳)</th>
                <th className="py-2.5 px-3 text-right">0-30 Days (৳)</th>
                <th className="py-2.5 px-3 text-right">31-60 Days (৳)</th>
                <th className="py-2.5 px-3 text-right">61-90 Days (৳)</th>
                <th className="py-2.5 px-3 text-right">&gt;90 Days Overdue (৳)</th>
                <th className="py-2.5 px-3 text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Calculating ageing balances...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No outstanding {reportType} balances found. All accounts are settled!
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isHighRisk = item.days90Plus > 0;
                  const isMediumRisk = item.days61to90 > 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        {item.company && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-500" />
                            {item.company}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                        {fmtCurrency(item.totalBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        {fmtCurrency(item.current)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sky-400">
                        {fmtCurrency(item.days31to60)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                        {fmtCurrency(item.days61to90)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                        {fmtCurrency(item.days90Plus)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isHighRisk ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-950/60 text-rose-400 border border-rose-800">
                            Critical
                          </span>
                        ) : isMediumRisk ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-950/60 text-amber-400 border border-amber-800">
                            Attention
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            Current
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {data && data.summary && (
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950 font-semibold text-slate-200 text-xs">
                  <td className="py-2.5 px-3 uppercase tracking-wider">Total Portfolio:</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-100">
                    {fmtCurrency(data.summary.total)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                    {fmtCurrency(data.summary.current)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sky-400">
                    {fmtCurrency(data.summary.days31to60)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                    {fmtCurrency(data.summary.days61to90)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                    {fmtCurrency(data.summary.days90Plus)}
                  </td>
                  <td className="py-2.5 px-3 text-center">-</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
