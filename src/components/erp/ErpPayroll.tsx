"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  Play,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
} from "lucide-react";

interface Employee {
  id: string;
  code: string;
  name: string;
  designation: string;
  department: string;
  basicSalary: number;
  houseRent: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  grossSalary: number;
  bankAccount?: string;
  isActive: boolean;
}

interface PayrollRecord {
  id: string;
  month: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  netPayable: number;
  status: string;
  voucherNo?: string;
  processedAt: string;
}

export default function ErpPayroll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isProcessOpen, setIsProcessOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add Employee Form State
  const [empForm, setEmpForm] = useState({
    code: "",
    name: "",
    designation: "",
    department: "Sales",
    basicSalary: "35000",
    houseRent: "15000",
    medicalAllowance: "5000",
    conveyanceAllowance: "3000",
    bankAccount: "",
  });

  // Process Payroll Form State
  const [processMonth, setProcessMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/erp/payroll");
      if (!res.ok) throw new Error("Failed to load payroll data");
      const json = await res.json();
      setEmployees(json.employees || []);
      setPayrollHistory(json.history || []);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load payroll" });
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

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name.trim() || !empForm.designation.trim()) {
      setNotification({ type: "error", text: "Employee name and designation are required" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_employee",
          code: empForm.code.trim() || undefined,
          name: empForm.name.trim(),
          designation: empForm.designation.trim(),
          department: empForm.department,
          basicSalary: parseFloat(empForm.basicSalary) || 0,
          houseRent: parseFloat(empForm.houseRent) || 0,
          medicalAllowance: parseFloat(empForm.medicalAllowance) || 0,
          conveyanceAllowance: parseFloat(empForm.conveyanceAllowance) || 0,
          bankAccount: empForm.bankAccount.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to add employee");

      setNotification({ type: "success", text: "Employee added successfully!" });
      setIsAddOpen(false);
      setEmpForm({
        code: "",
        name: "",
        designation: "",
        department: "Sales",
        basicSalary: "35000",
        houseRent: "15000",
        medicalAllowance: "5000",
        conveyanceAllowance: "3000",
        bankAccount: "",
      });
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to save employee" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/erp/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_monthly",
          month: processMonth,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to process payroll");

      setNotification({
        type: "success",
        text: `Monthly payroll processed for ${processMonth}! Voucher ${resData.voucherNo || ""} posted.`,
      });
      setIsProcessOpen(false);
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to process payroll" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalMonthlyGross = employees.reduce((sum, e) => sum + (Number(e.grossSalary) || 0), 0);

  const filteredEmployees = employees.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.code?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
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
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Payroll & Salaries
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Employee salary structures, monthly payroll execution, and automated salary voucher posting
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
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Employee
          </button>
          <button
            onClick={() => setIsProcessOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5" />
            Process Monthly Payroll
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Active Employees</span>
          <p className="text-lg font-bold text-slate-100 mt-1">{employees.length} Personnel</p>
          <span className="text-[10px] text-slate-500">Across all enterprise departments</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Payroll Liability</span>
          <p className="text-lg font-bold text-emerald-400 mt-1">{fmtCurrency(totalMonthlyGross)}</p>
          <span className="text-[10px] text-emerald-500/80">Gross monthly commitment</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Processed Payroll Cycles</span>
          <p className="text-lg font-bold text-indigo-400 mt-1">{payrollHistory.length} Batches</p>
          <span className="text-[10px] text-indigo-400/80">Posted to double-entry general ledger</span>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Employee Salary Structure
          </h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search employee..."
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
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Designation / Dept</th>
                <th className="py-2.5 px-3 text-right">Basic (৳)</th>
                <th className="py-2.5 px-3 text-right">Allowances (৳)</th>
                <th className="py-2.5 px-3 text-right">Gross Salary (৳)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No employees registered. Click &quot;Add Employee&quot; to configure salary structures.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const allowances =
                    Number(emp.houseRent || 0) +
                    Number(emp.medicalAllowance || 0) +
                    Number(emp.conveyanceAllowance || 0);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-indigo-400">
                        {emp.code}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {emp.name}
                        {emp.bankAccount && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            A/C: {emp.bankAccount}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200">{emp.designation}</div>
                        <div className="text-[10px] text-slate-400">{emp.department}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {fmtCurrency(emp.basicSalary)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {fmtCurrency(allowances)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {fmtCurrency(emp.grossSalary)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Processed Payroll Records Table */}
      {payrollHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="p-3 bg-slate-950 border-b border-slate-800">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Monthly Payroll History & Vouchers
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Employees</th>
                  <th className="py-2.5 px-3 text-right">Gross Total (৳)</th>
                  <th className="py-2.5 px-3 text-right">Net Payout (৳)</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Processed Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payrollHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{p.month}</td>
                    <td className="py-2.5 px-3">{p.employeeCount} Staff</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {fmtCurrency(p.totalGross)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {fmtCurrency(p.netPayable)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-indigo-400 font-medium">
                      {p.voucherNo || "JV-SALARY"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{p.processedAt?.slice(0, 10)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800 uppercase">
                        {p.status || "POSTED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Add Employee to Payroll
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Employee Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto or e.g. EMP-004"
                    value={empForm.code}
                    onChange={(e) => setEmpForm({ ...empForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Sales">Sales Department</option>
                    <option value="Service & Engineering">Service & Engineering</option>
                    <option value="Accounts & Finance">Accounts & Finance</option>
                    <option value="Management">Management</option>
                    <option value="IT & Marketing">IT & Marketing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shakil Mahmud"
                    value={empForm.name}
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Executive"
                    value={empForm.designation}
                    onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Basic Salary (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={empForm.basicSalary}
                    onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    House Rent (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={empForm.houseRent}
                    onChange={(e) => setEmpForm({ ...empForm, houseRent: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Medical Allowance (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={empForm.medicalAllowance}
                    onChange={(e) => setEmpForm({ ...empForm, medicalAllowance: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Conveyance (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={empForm.conveyanceAllowance}
                    onChange={(e) => setEmpForm({ ...empForm, conveyanceAllowance: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. City Bank A/C 1204810294"
                  value={empForm.bankAccount}
                  onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
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
                  {submitting ? "Saving..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Monthly Payroll Modal */}
      {isProcessOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Process Monthly Salary Payroll
              </h2>
              <button onClick={() => setIsProcessOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessPayroll} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Salary Month *
                </label>
                <input
                  type="month"
                  required
                  value={processMonth}
                  onChange={(e) => setProcessMonth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-md text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Active Staff Count:</span>
                  <span className="font-semibold text-slate-200">{employees.length} Personnel</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gross Payroll:</span>
                  <span className="font-mono text-emerald-400 font-bold">{fmtCurrency(totalMonthlyGross)}</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                  This will generate an automated Journal Voucher debiting <strong>Salaries Expense (502)</strong> and crediting <strong>Salaries Payable (202)</strong>.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProcessOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Execute & Post Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
