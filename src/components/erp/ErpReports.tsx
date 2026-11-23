"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Calendar,
  Filter,
  Printer,
  Download,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertCircle,
  PieChart,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface ReportData {
  reportId: string;
  title: string;
  companyName: string;
  periodText: string;
  columns: string[];
  rows: any[][];
  summary?: { [key: string]: any };
  isBalanced?: boolean;
}

const REPORTS_LIST = [
  { id: "trial_balance", name: "1. Trial Balance", category: "Financial Statements" },
  { id: "profit_loss", name: "2. Profit & Loss Statement (Income Statement)", category: "Financial Statements" },
  { id: "balance_sheet", name: "3. Balance Sheet (Financial Position)", category: "Financial Statements" },
  { id: "cash_flow", name: "4. Cash Flow Statement", category: "Financial Statements" },
  { id: "general_ledger", name: "5. General Ledger Summary", category: "Ledgers" },
  { id: "customer_ledger", name: "6. Customer Ledger Report", category: "Ledgers" },
  { id: "supplier_ledger", name: "7. Supplier Ledger Report", category: "Ledgers" },
  { id: "receivables", name: "8. Accounts Receivable (Debtors)", category: "Operations" },
  { id: "payables", name: "9. Accounts Payable (Creditors)", category: "Operations" },
  { id: "sales_summary", name: "10. Sales Summary Report", category: "Operations" },
  { id: "purchase_summary", name: "11. Purchase Summary Report", category: "Operations" },
  { id: "expenses_analysis", name: "12. Expense Analysis Report", category: "Analytics" },
  { id: "income_summary", name: "13. Income Summary Report", category: "Analytics" },
  { id: "cash_bank_book", name: "14. Cash & Bank Book", category: "Cash & Bank" },
  { id: "vat_mushak_9_1", name: "15. VAT Mushak 9.1 Report", category: "Compliance" },
  { id: "voucher_register", name: "16. Voucher Register Report", category: "Audit" },
];

export default function ErpReports() {
  const [selectedReport, setSelectedReport] = useState<string>("trial_balance");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [periodPreset, setPeriodPreset] = useState<string>("this_month");

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: string) => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === "this_month") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      setDateFrom(`${y}-${m}-01`);
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "this_year") {
      const y = now.getFullYear();
      setDateFrom(`${y}-01-01`);
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        report: selectedReport,
      });
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);

      const res = await fetch(`/api/erp/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to compile financial report");
      const json = await res.json();

      let normalizedRows: any[][] = [];
      let cols: string[] = json.columns || [];

      if (Array.isArray(json.rows)) {
        if (json.rows.length > 0 && Array.isArray(json.rows[0])) {
          normalizedRows = json.rows;
        } else if (json.rows.length > 0 && typeof json.rows[0] === "object") {
          if (!cols.length) {
            cols = Object.keys(json.rows[0]).map((k) =>
              k.replace(/([A-Z])/g, " $1").toUpperCase()
            );
          }
          normalizedRows = json.rows.map((obj: any) => Object.values(obj));
        }
      } else if (json.income || json.expenses) {
        cols = ["Particulars", "Classification", "Amount (৳)"];
        normalizedRows = [
          ["## REVENUE / OPERATING INCOME", "", ""],
          ...(json.income || []).map((i: any) => [i.account, "Revenue", i.amount]),
          ["Total Revenue", "", json.totalRevenue],
          ["## OPERATING & ADMINISTRATIVE EXPENSES", "", ""],
          ...(json.expenses || []).map((e: any) => [e.account, "Expense", e.amount]),
          ["Total Expenses", "", json.totalExpenses],
          ["NET PROFIT / (LOSS)", "Net Result", json.netProfit],
        ];
      } else if (json.assets || json.liabilities) {
        cols = ["Account Code", "Particulars", "Classification", "Amount (৳)"];
        normalizedRows = [
          ["## ASSETS", "", "", ""],
          ...(json.assets || []).map((a: any) => [a.code, a.name, a.category, a.amount]),
          ["TOTAL ASSETS", "", "", json.totalAssets],
          ["## LIABILITIES", "", "", ""],
          ...(json.liabilities || []).map((l: any) => [l.code, l.name, l.category, l.amount]),
          ["TOTAL LIABILITIES", "", "", json.totalLiabilities],
          ["## EQUITY", "", "", ""],
          ...(json.equity || []).map((e: any) => [e.code, e.name, e.category, e.amount]),
          ["TOTAL EQUITY", "", "", json.totalEquity],
          ["TOTAL LIABILITIES & EQUITY", "", "", json.totalLiabEquity],
        ];
      }

      setReportData({
        reportId: selectedReport,
        title: json.title || json.report || "Financial Statement",
        companyName: json.company?.name || "EPI UPS Bangladesh Limited",
        periodText: json.periodText || `Period: ${dateFrom || "Inception"} to ${dateTo || "Present"}`,
        columns: cols,
        rows: normalizedRows,
        summary: json.summary || json.totals || { totalRevenue: json.totalRevenue, totalExpenses: json.totalExpenses, netProfit: json.netProfit },
        isBalanced: json.isBalanced ?? json.totals?.isBalanced,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyPreset("this_month");
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedReport, dateFrom, dateTo]);

  const fmtCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return val || "-";
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.rows.length) return;
    const headers = reportData.columns.map((c) => `"${c.replace(/"/g, '""')}"`);
    const rows = reportData.rows.map((r) =>
      r.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedReport}_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <FileText className="w-5 h-5 text-indigo-400" />
            Financial Reports & Statements (Print & Export)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-ready financial statements, ledgers, tax returns, and operational performance reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
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

      {/* Control Bar: Report Selection and Date Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-3 print:hidden">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Select Financial Report (16 Statements)
          </label>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            {REPORTS_LIST.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPeriodPreset("custom");
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPeriodPreset("custom");
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-end gap-1.5">
          <button
            onClick={() => applyPreset("this_month")}
            className={`px-3 py-1.5 text-xs rounded font-medium transition ${
              periodPreset === "this_month"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => applyPreset("this_year")}
            className={`px-3 py-1.5 text-xs rounded font-medium transition ${
              periodPreset === "this_year"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => applyPreset("all")}
            className={`px-3 py-1.5 text-xs rounded font-medium transition ${
              periodPreset === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Inception / All
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="text-center border-b border-slate-800 print:border-black pb-3 print:pb-2">
        <h2 className="text-lg font-bold text-slate-100 print:text-black uppercase tracking-wider">
          EPI UPS Bangladesh Limited
        </h2>
        <p className="text-xs text-indigo-400 print:text-black font-semibold mt-0.5">
          {reportData?.title || "Financial Report"}
        </p>
        <p className="text-[11px] text-slate-400 print:text-gray-600">
          Period: {dateFrom || "Inception"} to {dateTo || "Present"} | Currency: BDT (৳) | Printed:{" "}
          {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Trial Balance Balance Checker Indicator */}
      {selectedReport === "trial_balance" && reportData && (
        <div
          className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold border ${
            reportData.isBalanced
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {reportData.isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {reportData.isBalanced
                ? "Double-Entry Verification Passed: Total Debits exactly equal Total Credits (Balanced)."
                : "Notice: Imbalance detected between debit and credit sides."}
            </span>
          </div>
          {reportData.summary && (
            <div className="font-mono">
              Dr: {fmtCurrency(reportData.summary.totalDebit)} | Cr: {fmtCurrency(reportData.summary.totalCredit)}
            </div>
          )}
        </div>
      )}

      {/* Report Rendered Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm print:bg-white print:border print:border-black">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse print:text-black">
            <thead>
              <tr className="border-b border-slate-800 print:border-black bg-slate-950/70 print:bg-gray-100 text-slate-400 print:text-black font-semibold uppercase tracking-wider text-[11px]">
                {(reportData?.columns || []).map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-2.5 px-3 ${
                      col.toLowerCase().includes("debit") ||
                      col.toLowerCase().includes("credit") ||
                      col.toLowerCase().includes("amount") ||
                      col.toLowerCase().includes("balance") ||
                      col.toLowerCase().includes("total")
                        ? "text-right"
                        : ""
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-300 text-slate-300 print:text-black">
              {loading ? (
                <tr>
                  <td colSpan={reportData?.columns.length || 5} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Generating financial statement from database...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={reportData?.columns.length || 5} className="text-center py-6 text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : !reportData || reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData?.columns.length || 5} className="text-center py-8 text-slate-500">
                    No records found for the selected reporting parameters.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rIdx) => {
                  const isHeaderRow = row[0] && String(row[0]).startsWith("##");
                  const isTotalRow =
                    row[0] &&
                    (String(row[0]).toLowerCase().includes("total") ||
                      String(row[1] || "").toLowerCase().includes("total") ||
                      String(row[0]).toLowerCase().includes("net profit"));

                  if (isHeaderRow) {
                    return (
                      <tr key={rIdx} className="bg-slate-950/50 print:bg-gray-200 font-bold text-indigo-400 print:text-black">
                        <td colSpan={reportData.columns.length} className="py-2 px-3 uppercase tracking-wider text-[11px]">
                          {String(row[0]).replace("##", "").trim()}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={rIdx}
                      className={`hover:bg-slate-800/40 transition ${
                        isTotalRow
                          ? "bg-slate-950/80 font-bold text-slate-100 border-t border-slate-700 print:border-black"
                          : ""
                      }`}
                    >
                      {row.map((cell, cIdx) => {
                        const colName = (reportData.columns[cIdx] || "").toLowerCase();
                        const isNumeric =
                          colName.includes("debit") ||
                          colName.includes("credit") ||
                          colName.includes("amount") ||
                          colName.includes("balance") ||
                          colName.includes("total") ||
                          typeof cell === "number";

                        return (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 ${
                              isNumeric ? "text-right font-mono" : ""
                            }`}
                          >
                            {isNumeric && typeof cell === "number" ? fmtCurrency(cell) : cell || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature block on print */}
      <div className="hidden print:flex justify-between pt-16 text-center text-[10px] text-black">
        <div className="w-36 border-t border-black pt-1">Accounts Officer</div>
        <div className="w-36 border-t border-black pt-1">Internal Auditor</div>
        <div className="w-36 border-t border-black pt-1">Managing Director</div>
      </div>
    </div>
  );
}
