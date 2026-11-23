"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Calendar,
  Printer,
  Download,
  RefreshCw,
  Building,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface VatSummary {
  period: string;
  bin: string;
  companyName: string;
  outputVat: {
    taxableSales: number;
    vatAmount: number;
    zeroRatedSales: number;
    exemptSales: number;
  };
  inputVat: {
    taxablePurchases: number;
    vatPaid: number;
    rebateClaimed: number;
  };
  netVatPayable: number;
  adjustments: number;
  finalPayable: number;
  invoicesCount: number;
  purchasesCount: number;
}

export default function ErpVat() {
  const [data, setData] = useState<VatSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [error, setError] = useState<string | null>(null);

  const fetchVat = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/erp/vat?month=${month}`);
      if (!res.ok) throw new Error("Failed to load VAT return summary");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load VAT report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVat();
  }, [month]);

  const fmtCurrency = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-5 print:p-0 print:space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Bangladesh VAT & Tax Management (NBR Mushak 9.1)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Value Added Tax return summary pursuant to Bangladesh Value Added Tax and Supplementary Duty Act 2012
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchVat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Mushak 9.1 Return
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300 uppercase">
            Tax Return Period (Month):
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          VAT Registration (BIN):{" "}
          <strong className="text-indigo-400 font-mono">{data?.bin || "002145892-0101"}</strong>
        </div>
      </div>

      {/* Printable Header on Print */}
      <div className="hidden print:block text-center border-b border-black pb-3 mb-4">
        <p className="text-[10px] uppercase font-bold text-gray-700">
          Government of the People&apos;s Republic of Bangladesh | National Board of Revenue
        </p>
        <h2 className="text-base font-bold uppercase tracking-wider text-black">
          Value Added Tax Return (Mushak 9.1)
        </h2>
        <p className="text-xs text-black font-semibold">EPI UPS Bangladesh Limited | BIN: 002145892-0101</p>
        <p className="text-xs text-gray-600">Tax Return Period: {month}</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Output VAT (Sales)
          </span>
          <p className="text-lg font-bold text-indigo-400 mt-1">
            {fmtCurrency(data?.outputVat?.vatAmount)}
          </p>
          <span className="text-[10px] text-slate-500">
            From {data?.invoicesCount || 0} Mushak 6.3 Tax Invoices
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Input VAT (Rebate Credit)
          </span>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            {fmtCurrency(data?.inputVat?.rebateClaimed)}
          </p>
          <span className="text-[10px] text-emerald-500/80">
            From {data?.purchasesCount || 0} Registered Procurement Bills
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Net VAT Payable / (Refund)
          </span>
          <p className="text-lg font-bold text-amber-400 mt-1">
            {fmtCurrency(data?.finalPayable)}
          </p>
          <span className="text-[10px] text-amber-500/80">
            Government treasury deposit required
          </span>
        </div>
      </div>

      {/* Mushak 9.1 Formal Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-950 border-b border-slate-800">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Mushak 9.1 Statutory Tax Calculation Breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 w-16">Part / Note</th>
                <th className="py-2.5 px-3">Transaction Description (Goods / Services)</th>
                <th className="py-2.5 px-3 text-right">Value (৳)</th>
                <th className="py-2.5 px-3 text-right">VAT Amount (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {/* Part 3: Output Tax */}
              <tr className="bg-slate-950/30 font-semibold text-slate-200">
                <td colSpan={4} className="py-2 px-3 text-indigo-400">
                  PART 3: GOODS & SERVICES SUBJECT TO OUTPUT TAX (SALES)
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">Note 10</td>
                <td className="py-2 px-3">Standard Rated (15%) Supplies / Sales of UPS Equipment</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">
                  {fmtCurrency(data?.outputVat?.taxableSales)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-indigo-400 font-semibold">
                  {fmtCurrency(data?.outputVat?.vatAmount)}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">Note 11</td>
                <td className="py-2 px-3">Zero Rated Supplies (Exports / Direct Govt)</td>
                <td className="py-2 px-3 text-right font-mono text-slate-400">
                  {fmtCurrency(data?.outputVat?.zeroRatedSales)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-400">৳0.00</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">Note 12</td>
                <td className="py-2 px-3">Exempted Goods & Services</td>
                <td className="py-2 px-3 text-right font-mono text-slate-400">
                  {fmtCurrency(data?.outputVat?.exemptSales)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-400">৳0.00</td>
              </tr>
              <tr className="bg-slate-950/50 font-semibold text-slate-200">
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 uppercase text-slate-400">Subtotal Output Tax:</td>
                <td className="py-2 px-3 text-right font-mono">{fmtCurrency(data?.outputVat?.taxableSales)}</td>
                <td className="py-2 px-3 text-right font-mono text-indigo-400 font-bold">
                  {fmtCurrency(data?.outputVat?.vatAmount)}
                </td>
              </tr>

              {/* Part 4: Input Tax Credit */}
              <tr className="bg-slate-950/30 font-semibold text-slate-200">
                <td colSpan={4} className="py-2 px-3 text-emerald-400 pt-4">
                  PART 4: GOODS & SERVICES SUBJECT TO INPUT TAX CREDIT (PURCHASES REBATE)
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">Note 21</td>
                <td className="py-2 px-3">Standard Rated (15%) Raw Materials & Stock Purchases</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">
                  {fmtCurrency(data?.inputVat?.taxablePurchases)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-emerald-400 font-semibold">
                  {fmtCurrency(data?.inputVat?.rebateClaimed)}
                </td>
              </tr>
              <tr className="bg-slate-950/50 font-semibold text-slate-200">
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 uppercase text-slate-400">Subtotal Input Tax Credit (Rebate):</td>
                <td className="py-2 px-3 text-right font-mono">{fmtCurrency(data?.inputVat?.taxablePurchases)}</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-400 font-bold">
                  {fmtCurrency(data?.inputVat?.rebateClaimed)}
                </td>
              </tr>

              {/* Part 5: Net Payable Calculation */}
              <tr className="bg-slate-950/30 font-semibold text-slate-200">
                <td colSpan={4} className="py-2 px-3 text-amber-400 pt-4">
                  PART 5: NET TAX CALCULATION & TREASURY LIABILITY
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">Note 40</td>
                <td className="py-2 px-3">Net Tax Payable (Output Tax - Input Tax Rebate)</td>
                <td className="py-2 px-3 text-right font-mono">-</td>
                <td className="py-2 px-3 text-right font-mono font-semibold text-slate-200">
                  {fmtCurrency(data?.netVatPayable)}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">Note 41</td>
                <td className="py-2 px-3">Treasury Adjustments / Withholding Tax Deducted at Source (VDS)</td>
                <td className="py-2 px-3 text-right font-mono">-</td>
                <td className="py-2 px-3 text-right font-mono text-slate-400">
                  {fmtCurrency(data?.adjustments)}
                </td>
              </tr>
              <tr className="bg-slate-950 font-bold text-slate-100 text-sm border-t-2 border-slate-700">
                <td className="py-3 px-3">Note 50</td>
                <td className="py-3 px-3 uppercase text-indigo-300">
                  Final Payable to Government Treasury:
                </td>
                <td className="py-3 px-3 text-right font-mono">-</td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400 text-base">
                  {fmtCurrency(data?.finalPayable)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
