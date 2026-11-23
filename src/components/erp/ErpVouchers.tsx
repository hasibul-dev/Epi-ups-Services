"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, Card, Drawer, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useFmt, useToast } from "@/components/AppContext";

interface Voucher {
  id: number;
  voucherNo: string;
  voucherType: string;
  date: string;
  reference: string | null;
  description: string | null;
  totalAmount: number;
  status: string;
  lines: VoucherLine[];
  createdByName?: string | null;
}

interface VoucherLine {
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

interface AccountOption {
  code: string;
  name: string;
}

export function ErpVouchers() {
  const fmt = useFmt();
  const toast = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  const [modal, setModal] = useState<"create" | "view" | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);

  // New voucher form state
  const [formType, setFormType] = useState<"journal" | "payment" | "receipt" | "contra" | "adjustment">("journal");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formRef, setFormRef] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([
    { accountCode: "5030", accountName: "Office Rent & Premises", description: "", debit: 0, credit: 0 },
    { accountCode: "1011", accountName: "Cash in Hand", description: "", debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, aRes] = await Promise.all([
        fetch("/api/erp/vouchers"),
        fetch("/api/erp/accounts"),
      ]);
      if (!vRes.ok) throw new Error("Failed to load vouchers");
      const vJson = await vRes.json();
      const aJson = await aRes.json();
      setVouchers(vJson.vouchers || []);
      setAccounts(aJson.accounts || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  const handleAddLine = () => {
    setLines([...lines, { accountCode: "", accountName: "", description: "", debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      toast.error("A voucher requires at least two lines");
      return;
    }
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleAccountChange = (idx: number, code: string) => {
    const acc = accounts.find((a) => a.code === code);
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        accountCode: code,
        accountName: acc?.name || "",
      };
      return copy;
    });
  };

  const handleLineChange = (idx: number, field: keyof VoucherLine, val: string | number) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Voucher is not balanced! Total Debit must equal Total Credit.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/erp/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherType: formType,
          date: formDate,
          reference: formRef,
          description: formDesc,
          lines,
          status: "posted",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create voucher");

      toast.success(`Voucher ${json.voucher.voucherNo} created and posted to ledger!`);
      setModal(null);
      loadData();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = vouchers.filter((v) => {
    if (typeFilter && v.voucherType !== typeFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return (
        v.voucherNo.toLowerCase().includes(s) ||
        (v.reference && v.reference.toLowerCase().includes(s)) ||
        (v.description && v.description.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal & Vouchers"
        subtitle="Double-entry vouchers (Journal, Payment, Receipt, Contra, Adjustment) with automatic ledger posting."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setFormType("journal");
                setLines([
                  { accountCode: "5030", accountName: "Office Rent & Premises", description: "", debit: 0, credit: 0 },
                  { accountCode: "1011", accountName: "Cash in Hand", description: "", debit: 0, credit: 0 },
                ]);
                setModal("create");
              }}
            >
              <Plus className="h-4 w-4" /> New Voucher
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search voucher no, reference…"
            className="pl-9 text-xs"
          />
        </div>

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 w-40 text-xs"
        >
          <option value="">All Voucher Types</option>
          <option value="journal">Journal Voucher (JV)</option>
          <option value="payment">Payment Voucher (PV)</option>
          <option value="receipt">Receipt Voucher (RV)</option>
          <option value="contra">Contra Voucher (CV)</option>
          <option value="adjustment">Adjustment Voucher (AV)</option>
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 w-32 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="posted">Posted</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Vouchers Table */}
      <Card className="overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-line text-muted uppercase tracking-wider text-[11px] bg-fg/[0.02]">
                <th className="px-4 py-3 font-semibold">Voucher No</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    <Spinner label="Loading vouchers..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No vouchers found. Create your first voucher using the button above.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="border-b border-line/40 hover:bg-fg/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-accent">{v.voucherNo}</td>
                    <td className="px-4 py-3">
                      <Badge tone={v.voucherType === "payment" ? "red" : v.voucherType === "receipt" ? "emerald" : v.voucherType === "contra" ? "purple" : "blue"}>
                        {v.voucherType.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{fmt.date(v.date)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">{v.reference || "—"}</td>
                    <td className="px-4 py-3 truncate max-w-xs">{v.description || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-fg">
                      {fmt.money(v.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={v.status === "posted" ? "emerald" : v.status === "draft" ? "amber" : "slate"}>
                        {v.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setViewingVoucher(v);
                          setModal("view");
                        }}
                        className="h-7 px-2 text-[11px]"
                      >
                        <Printer className="h-3 w-3 mr-1" /> View / Print
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Voucher Drawer */}
      <Drawer
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Create New Accounting Voucher"
        subtitle="Every posted transaction enforces strict double-entry balancing (Total Debit = Total Credit)."
        wide
      >
        <form onSubmit={handleCreateVoucher} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Voucher Type *">
              <Select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                required
              >
                <option value="journal">Journal Voucher (JV)</option>
                <option value="payment">Payment Voucher (PV)</option>
                <option value="receipt">Receipt Voucher (RV)</option>
                <option value="contra">Contra Voucher (CV - Cash/Bank)</option>
                <option value="adjustment">Adjustment Voucher (AV)</option>
              </Select>
            </Field>

            <Field label="Voucher Date *">
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Reference / Cheque No">
              <Input
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                placeholder="e.g. CHQ-9281, Bill #104"
              />
            </Field>
          </div>

          <Field label="Voucher Narration / Description">
            <Input
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="e.g. Office rent payment for current month"
            />
          </Field>

          {/* Line Entries Table */}
          <div className="rounded-xl border border-line overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-fg/[0.02] px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Voucher Entries</span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddLine} className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            </div>

            <div className="scroll-thin overflow-x-auto p-2">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead>
                  <tr className="text-muted uppercase text-[11px]">
                    <th className="p-2 font-semibold w-64">Account *</th>
                    <th className="p-2 font-semibold">Line Description</th>
                    <th className="p-2 font-semibold w-28 text-right">Debit (Dr)</th>
                    <th className="p-2 font-semibold w-28 text-right">Credit (Cr)</th>
                    <th className="p-2 font-semibold w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-t border-line/40">
                      <td className="p-1.5">
                        <Select
                          value={line.accountCode}
                          onChange={(e) => handleAccountChange(idx, e.target.value)}
                          className="h-8 text-xs py-0.5"
                          required
                        >
                          <option value="">Select Account…</option>
                          {accounts.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-1.5">
                        <Input
                          value={line.description || ""}
                          onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                          placeholder="Line note..."
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleLineChange(idx, "debit", val);
                            if (val > 0) handleLineChange(idx, "credit", 0);
                          }}
                          placeholder="0.00"
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleLineChange(idx, "credit", val);
                            if (val > 0) handleLineChange(idx, "debit", 0);
                          }}
                          placeholder="0.00"
                          className="h-8 text-xs text-right font-mono"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-muted hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-fg/[0.02] font-semibold text-xs">
                    <td colSpan={2} className="p-2 text-right">Totals:</td>
                    <td className="p-2 text-right font-mono text-emerald-400">{fmt.money(totalDebit)}</td>
                    <td className="p-2 text-right font-mono text-cyan-400">{fmt.money(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Balancing Checker Alert */}
          <div
            className={`flex items-center justify-between rounded-xl p-3 text-xs font-semibold ${
              isBalanced
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Balanced Voucher: Debit equals Credit (৳{totalDebit.toFixed(2)})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span>
                    Unbalanced Voucher: Difference = ৳{Math.abs(totalDebit - totalCredit).toFixed(2)}. Debit must equal Credit.
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={!isBalanced}>
              <Check className="h-4 w-4" /> Post Voucher to Ledger
            </Button>
          </div>
        </form>
      </Drawer>

      {/* View & Print Voucher Slip Drawer */}
      <Drawer
        open={modal === "view" && Boolean(viewingVoucher)}
        onClose={() => setModal(null)}
        title={viewingVoucher?.voucherNo || "Voucher"}
        subtitle="Official accounting voucher copy for EPI UPS Bangladesh Limited."
        wide
      >
        {viewingVoucher && (
          <div className="space-y-6">
            <div className="p-6 border border-line rounded-2xl bg-solid text-fg space-y-4 print:border-none print:p-0">
              {/* Header */}
              <div className="border-b border-line pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black tracking-wide text-fg">EPI UPS BANGLADESH LIMITED</h2>
                  <p className="text-xs text-muted">House #24, Road #05, Dhanmondi, Dhaka-1205, Bangladesh</p>
                  <p className="text-xs text-muted">BIN: 001894562-0101 | TIN: 482910485912</p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase font-bold text-accent tracking-widest">
                    {viewingVoucher.voucherType.toUpperCase()} VOUCHER
                  </div>
                  <div className="text-sm font-mono font-bold text-fg mt-0.5">{viewingVoucher.voucherNo}</div>
                  <div className="text-xs text-muted mt-0.5">Date: {fmt.date(viewingVoucher.date)}</div>
                </div>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-fg/[0.02] p-3 rounded-xl border border-line/60">
                <div>
                  <span className="text-muted">Narration / Purpose:</span>
                  <p className="font-semibold text-fg mt-0.5">{viewingVoucher.description || "General accounting entry"}</p>
                </div>
                <div>
                  <span className="text-muted">Reference / Cheque:</span>
                  <p className="font-semibold text-fg mt-0.5">{viewingVoucher.reference || "—"}</p>
                </div>
              </div>

              {/* Lines */}
              <table className="w-full text-xs text-left border-collapse border border-line">
                <thead>
                  <tr className="bg-fg/5 text-[11px] uppercase font-semibold text-muted border-b border-line">
                    <th className="p-2.5">Account Code & Title</th>
                    <th className="p-2.5">Line Description</th>
                    <th className="p-2.5 text-right w-32">Debit (৳)</th>
                    <th className="p-2.5 text-right w-32">Credit (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingVoucher.lines || []).map((l, i) => (
                    <tr key={i} className="border-b border-line/60">
                      <td className="p-2.5 font-semibold text-fg">{l.accountCode} — {l.accountName}</td>
                      <td className="p-2.5 text-muted">{l.description || "—"}</td>
                      <td className="p-2.5 text-right font-mono font-medium">
                        {Number(l.debit) > 0 ? fmt.money(l.debit) : "—"}
                      </td>
                      <td className="p-2.5 text-right font-mono font-medium">
                        {Number(l.credit) > 0 ? fmt.money(l.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-fg/[0.03] font-bold text-xs border-t-2 border-line">
                    <td colSpan={2} className="p-2.5 text-right">Total (BDT):</td>
                    <td className="p-2.5 text-right font-mono text-emerald-400">{fmt.money(viewingVoucher.totalAmount)}</td>
                    <td className="p-2.5 text-right font-mono text-cyan-400">{fmt.money(viewingVoucher.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-4 gap-4 pt-12 text-center text-xs text-muted border-t border-line/60">
                <div className="border-t border-dashed border-line pt-1">Prepared By</div>
                <div className="border-t border-dashed border-line pt-1">Verified By</div>
                <div className="border-t border-dashed border-line pt-1">Head of Accounts</div>
                <div className="border-t border-dashed border-line pt-1">Managing Director</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Print Voucher
              </Button>
              <Button variant="ghost" size="md" onClick={() => setModal(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default ErpVouchers;
