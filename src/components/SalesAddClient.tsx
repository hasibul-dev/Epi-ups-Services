"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, PhoneCall, Plus, Sparkles, UserPlus } from "lucide-react";
import { Button, ButtonLink, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/AppContext";
import { addDays, todayStr } from "@/lib/utils";

const CATEGORY_RULES: Record<string, number> = {
  Potential: 3,
  "No Potential": 10,
  Quotation: 7,
  Sale: 30,
};

const CATEGORIES = [
  { value: "Potential", label: "Potential (3 days)", days: 3 },
  { value: "No Potential", label: "No Potential (10 days)", days: 10 },
  { value: "Quotation", label: "Quotation (7 days)", days: 7 },
  { value: "Sale", label: "Sale (30 days)", days: 30 },
];

export function SalesAddClient() {
  const router = useRouter();
  const toast = useToast();

  const getInitialState = () => {
    const today = todayStr();
    return {
      name: "",
      companyName: "",
      designation: "",
      phone: "",
      email: "",
      address: "",
      category: "Potential",
      nextDate: addDays(today, 3),
      notes: "",
    };
  };

  const [form, setForm] = useState(getInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ clientName: string; companyName: string; nextDate: string } | null>(null);

  const handleCategoryChange = (cat: string) => {
    const days = CATEGORY_RULES[cat] ?? 3;
    const newDate = addDays(todayStr(), days);
    setForm((prev) => ({
      ...prev,
      category: cat,
      nextDate: newDate,
    }));
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedInfo(null);

    const validationErrors: Record<string, string> = {};
    if (!form.name.trim()) validationErrors.name = "Client contact person is required";
    if (!form.companyName.trim()) validationErrors.companyName = "Company name is required";
    if (!form.nextDate) validationErrors.nextDate = "First follow-up date is required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sales/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          companyName: form.companyName.trim(),
          designation: form.designation.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          category: form.category,
          nextDate: form.nextDate,
          notes: form.notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save client");
      }

      toast.success(`Client "${form.name}" saved & first follow-up scheduled!`);
      setCreatedInfo({
        clientName: form.name.trim(),
        companyName: form.companyName.trim(),
        nextDate: form.nextDate,
      });

      // Reset form fields
      setForm(getInitialState());
      setErrors({});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save client";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Add Client"
        subtitle="Enter client details. The first follow-up task will be scheduled automatically."
        actions={
          <div className="flex items-center gap-2">
            <ButtonLink href="/sales/clients" variant="secondary" size="sm">
              <Briefcase className="h-4 w-4" />
              Clients Master
            </ButtonLink>
            <ButtonLink href="/sales/follow-ups" variant="secondary" size="sm">
              <PhoneCall className="h-4 w-4" />
              Follow-ups
            </ButtonLink>
          </div>
        }
      />

      {createdInfo && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-300">Client successfully saved!</p>
              <p className="text-xs text-emerald-400/80">
                &ldquo;{createdInfo.clientName}&rdquo; ({createdInfo.companyName}) has been added to Clients Master with first follow-up scheduled on {createdInfo.nextDate}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/sales/follow-ups" variant="success" size="sm">
              Open Follow-ups
            </ButtonLink>
            <ButtonLink href="/sales/clients" variant="ghost" size="sm">
              View Clients
            </ButtonLink>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreatedInfo(null)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another
            </Button>
          </div>
        </div>
      )}

      <Card className="p-6 md:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <Field label="Name" required error={errors.name} hint="Client contact person">
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Client contact person"
                  autoFocus
                />
              </Field>

              <Field label="Company" required error={errors.companyName} hint="Company / Organization name">
                <Input
                  value={form.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  placeholder="Company / Organization name"
                />
              </Field>

              <Field label="Contact Number" hint="Phone / Mobile">
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Phone / Mobile"
                />
              </Field>

              <Field label="Email" hint="Work or personal email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@company.com"
                />
              </Field>

              <Field label="Initial Category" hint="Determines automatic follow-up schedule">
                <Select
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <Field label="Designation" hint="e.g. DGM / Manager / Director">
                <Input
                  value={form.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  placeholder="e.g. DGM / Manager"
                />
              </Field>

              <Field label="Address" hint="Office address / location">
                <Input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Office address / location"
                />
              </Field>

              <Field
                label="First Follow-up Date"
                required
                error={errors.nextDate}
                hint={`Auto-set to +${CATEGORY_RULES[form.category] ?? 3} days for ${form.category}. You can adjust manually.`}
              >
                <div className="relative">
                  <Input
                    type="date"
                    value={form.nextDate}
                    onChange={(e) => handleChange("nextDate", e.target.value)}
                  />
                </div>
              </Field>

              <div className="rounded-xl border border-line bg-fg/[0.02] p-4 text-xs text-muted space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-fg/90">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Auto-Scheduling Rule
                </div>
                <p>
                  Selecting <span className="font-semibold text-fg">{form.category}</span> sets the follow-up to{" "}
                  <span className="font-semibold text-accent">{CATEGORY_RULES[form.category]} days</span> from today.
                </p>
                <p className="text-[11px] text-muted/80">
                  Potential: 3d &bull; Quotation: 7d &bull; No Potential: 10d &bull; Sale: 30d
                </p>
              </div>
            </div>
          </div>

          {/* Full-width Remarks / Notes */}
          <Field label="Remarks / Notes" hint="Special client requirements, preferred UPS models, remarks...">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Special client requirements, preferred UPS models, remarks..."
            />
          </Field>

          {/* Submit Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-line">
            <div className="text-xs text-muted">
              Fields marked with <span className="text-red-500 font-bold">*</span> are required.
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setForm(getInitialState());
                  setErrors({});
                  setCreatedInfo(null);
                }}
                disabled={loading}
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="gap-2 px-6 shadow-lg shadow-accent/25"
              >
                <UserPlus className="h-4 w-4" />
                Save Client &amp; Schedule Follow-up
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
