"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FolderTree,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { Badge, Button, ButtonLink, Card, Drawer, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useFmt, useToast } from "@/components/AppContext";

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  category: string;
  parentId: number | null;
  openingBalance: number;
  balance: number;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  isActive: boolean;
  isSystem: boolean;
  notes: string | null;
}

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset (Assets)" },
  { value: "liability", label: "Liability (Liabilities)" },
  { value: "equity", label: "Equity (Capital & Retained)" },
  { value: "income", label: "Income (Revenue)" },
  { value: "expense", label: "Expense (Direct & Operating)" },
];

export function ErpAccounts() {
  const fmt = useFmt();
  const toast = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selectedAcc, setSelectedAcc] = useState<Account | null>(null);
  const [detailDrawer, setDetailDrawer] = useState<Account | null>(null);

  // Form state
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "asset",
    category: "Current Asset",
    parentId: "",
    openingBalance: "0",
    bankAccountNumber: "",
    bankBranch: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/erp/accounts");
      if (!res.ok) throw new Error("Failed to load chart of accounts");
      const json = await res.json();
      setAccounts(json.accounts || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleOpenCreate = () => {
    setForm({
      code: "",
      name: "",
      type: "asset",
      category: "Current Asset",
      parentId: "",
      openingBalance: "0",
      bankAccountNumber: "",
      bankBranch: "",
      notes: "",
    });
    setModal("create");
  };

  const handleOpenEdit = (acc: Account) => {
    setSelectedAcc(acc);
    setForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: acc.category,
      parentId: acc.parentId ? String(acc.parentId) : "",
      openingBalance: String(acc.openingBalance || 0),
      bankAccountNumber: acc.bankAccountNumber || "",
      bankBranch: acc.bankBranch || "",
      notes: acc.notes || "",
    });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Account code and name are required");
      return;
    }
    setSaving(true);
    try {
      const endpoint = "/api/erp/accounts";
      const method = modal === "edit" ? "PUT" : "POST";
      const body = modal === "edit" ? { ...form, id: selectedAcc?.id } : form;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save account");

      toast.success(modal === "edit" ? "Account updated" : "Account created");
      setModal(null);
      loadAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (acc: Account) => {
    try {
      const res = await fetch("/api/erp/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id, isActive: !acc.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Account marked as ${!acc.isActive ? "Active" : "Inactive"}`);
      loadAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtered = accounts.filter((a) => {
    if (tab !== "all" && a.type !== tab) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return (
        a.code.toLowerCase().includes(s) ||
        a.name.toLowerCase().includes(s) ||
        a.category.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage hierarchical accounts structure for EPI UPS Bangladesh Limited (Assets, Liabilities, Equity, Revenue, Expenses)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={loadAccounts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="primary" size="md" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
        }
      />

      {/* Tabs by Account Type */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {[
          { key: "all", label: "All Accounts", count: accounts.length },
          { key: "asset", label: "Assets (1xxx)", count: accounts.filter((a) => a.type === "asset").length },
          { key: "liability", label: "Liabilities (2xxx)", count: accounts.filter((a) => a.type === "liability").length },
          { key: "equity", label: "Equity (3xxx)", count: accounts.filter((a) => a.type === "equity").length },
          { key: "income", label: "Income / Revenue (4xxx)", count: accounts.filter((a) => a.type === "income").length },
          { key: "expense", label: "Expenses (5xxx)", count: accounts.filter((a) => a.type === "expense").length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === t.key
                ? "bg-accent text-white shadow-sm"
                : "border border-line/60 bg-fg/[0.02] text-muted hover:bg-fg/[0.05] hover:text-fg"
            }`}
          >
            <span>{t.label}</span>
            <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${tab === t.key ? "bg-white/20 text-white" : "bg-fg/10 text-muted"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar & Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by code, account name, category…"
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <Card className="overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-line text-muted uppercase tracking-wider text-[11px] bg-fg/[0.02]">
                <th className="px-4 py-3 font-semibold">Account Code</th>
                <th className="px-4 py-3 font-semibold">Account Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    <Spinner label="Loading Chart of Accounts..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No accounts found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => (
                  <tr
                    key={acc.id}
                    className="border-b border-line/40 hover:bg-fg/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-accent">{acc.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-fg">{acc.name}</div>
                      {acc.bankAccountNumber && (
                        <div className="text-[11px] text-muted">A/C: {acc.bankAccountNumber} ({acc.bankBranch})</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          acc.type === "asset"
                            ? "blue"
                            : acc.type === "liability"
                            ? "red"
                            : acc.type === "equity"
                            ? "purple"
                            : acc.type === "income"
                            ? "emerald"
                            : "amber"
                        }
                      >
                        {acc.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{acc.category}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-fg">
                      {fmt.money(acc.balance || acc.openingBalance || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={acc.isActive ? "emerald" : "slate"}>
                        {acc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailDrawer(acc)}
                          className="h-7 px-2 text-[11px]"
                        >
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(acc)}
                          className="h-7 px-2 text-[11px]"
                        >
                          Edit
                        </Button>
                        {!acc.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(acc)}
                            className="h-7 px-2 text-[11px] text-muted hover:text-red-400"
                          >
                            {acc.isActive ? "Disable" : "Enable"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Account Create / Edit Drawer */}
      <Drawer
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Add Chart of Account" : `Edit Account (${form.code})`}
        subtitle="Configure general ledger account details and financial category."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account Code *" hint="Unique 4-digit code (e.g. 1014)">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. 1014"
                disabled={modal === "edit" && selectedAcc?.isSystem}
                required
              />
            </Field>

            <Field label="Account Type *" hint="General financial category">
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                disabled={modal === "edit" && selectedAcc?.isSystem}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Account Name *" hint="Display name in ledger and vouchers">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Dutch-Bangla Bank A/C"
              required
            />
          </Field>

          <Field label="Sub-Category" hint="e.g. Bank Accounts, Current Assets, Direct Cost">
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Bank Accounts"
            />
          </Field>

          {modal === "create" && (
            <Field label="Opening Balance" hint="Initial balance before active financial year">
              <Input
                type="number"
                step="0.01"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                placeholder="0.00"
              />
            </Field>
          )}

          {(form.category.toLowerCase().includes("bank") || form.name.toLowerCase().includes("bank")) && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line/60 bg-fg/[0.02] p-3">
              <Field label="Bank A/C Number">
                <Input
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                  placeholder="e.g. 1102938475"
                />
              </Field>
              <Field label="Branch Name">
                <Input
                  value={form.bankBranch}
                  onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                  placeholder="e.g. Principal Branch"
                />
              </Field>
            </div>
          )}

          <Field label="Notes / Description">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes or account guidelines..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              <Check className="h-4 w-4" /> Save Account
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Account Details Drawer */}
      <Drawer
        open={Boolean(detailDrawer)}
        onClose={() => setDetailDrawer(null)}
        title={detailDrawer ? `${detailDrawer.code} — ${detailDrawer.name}` : "Account Details"}
        subtitle={`Type: ${detailDrawer?.type.toUpperCase()} | Category: ${detailDrawer?.category}`}
      >
        {detailDrawer && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-fg/[0.02] p-4 text-xs">
              <div>
                <span className="text-muted">Account Code:</span>
                <div className="font-bold text-accent text-sm mt-0.5">{detailDrawer.code}</div>
              </div>
              <div>
                <span className="text-muted">Current Balance:</span>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">
                  {fmt.money(detailDrawer.balance || detailDrawer.openingBalance || 0)}
                </div>
              </div>
              <div>
                <span className="text-muted">Opening Balance:</span>
                <div className="font-semibold text-fg mt-0.5">{fmt.money(detailDrawer.openingBalance || 0)}</div>
              </div>
              <div>
                <span className="text-muted">System Reserved:</span>
                <div className="font-semibold text-fg mt-0.5">{detailDrawer.isSystem ? "Yes" : "No"}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <ButtonLink
                href={`/erp/ledger?account=${detailDrawer.code}`}
                variant="primary"
                size="sm"
              >
                View Account Ledger
              </ButtonLink>
              <Button variant="secondary" size="sm" onClick={() => setDetailDrawer(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default ErpAccounts;
