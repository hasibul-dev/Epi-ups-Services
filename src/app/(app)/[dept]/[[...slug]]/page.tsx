import { notFound } from "next/navigation";
import { CalendarView } from "@/components/CalendarView";
import { DashboardView } from "@/components/DashboardView";
import { ReportCenter } from "@/components/ReportCenter";
import { ResourceFormPage, ResourceManager } from "@/components/ResourceManager";
import { BackupManager, DatabaseManager, RolePermissions, UserManagement } from "@/components/AdminPanels";
import { DeptSettings, SystemSettings } from "@/components/SettingsPanels";
import { PageHeader } from "@/components/ui";
import { SalesDailySummary } from "@/components/SalesDailySummary";
import { SalesAddClient } from "@/components/SalesAddClient";
import { SalesFollowUps } from "@/components/SalesFollowUps";
import { SalesTodayWork } from "@/components/SalesTodayWork";
import {
  ErpDashboard,
  ErpAccounts,
  ErpVouchers,
  ErpCashBank,
  ErpLedger,
  ErpCustomers,
  ErpSuppliers,
  ErpInvoices,
  ErpPurchases,
  ErpPayments,
  ErpAgeing,
  ErpInventory,
  ErpVat,
  ErpPayroll,
  ErpFixedAssets,
  ErpReports,
  ErpSettings,
} from "@/components/erp";
import { DEPTS, DEPT_ORDER, type DeptCode } from "@/lib/constants";
import { findPage } from "@/lib/nav";
import { requireUserPage } from "@/server/auth";
import { getDashboard } from "@/server/dashboards";
import { can } from "@/server/permissions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ dept: string; slug?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: Props) {
  const { dept } = await params;
  return { title: `${DEPTS[dept as DeptCode]?.name ?? "EPI UPS"} — EPI UPS` };
}

export default async function DeptPage({ params, searchParams }: Props) {
  const { dept: rawDept, slug = [] } = await params;
  const sp = await searchParams;
  if (!DEPT_ORDER.includes(rawDept as DeptCode)) notFound();
  const dept = rawDept as DeptCode;
  const user = await requireUserPage();

  if (!(await can(user, dept, "view"))) {
    return (
      <div className="glass mx-auto mt-16 max-w-lg rounded-3xl p-10 text-center">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm text-muted">You do not have permission to open the {DEPTS[dept].name} module. Contact your administrator if you need access.</p>
      </div>
    );
  }

  const found = findPage(dept, slug.join("/"));
  if (!found) notFound();
  const { page, label } = found;

  switch (page.type) {
    case "dashboard": {
      const data = await getDashboard(dept, user.id);
      return (
        <>
          <PageHeader title={label} subtitle={`Welcome, ${user.name}. Live figures calculated from ${DEPTS[dept].name} records.`} />
          <DashboardView data={data} accent={DEPTS[dept].color} />
        </>
      );
    }
    case "resource":
      return <ResourceManager key={`${page.resource}-${page.preset ?? ""}`} resource={page.resource} preset={page.preset} title={page.title ?? label} subtitle={page.subtitle} initialQ={one(sp.q)} />;
    case "form":
      return <ResourceFormPage resource={page.resource} back={page.back} title={page.title} />;
    case "reports":
      return <ReportCenter dept={dept} initialKey={one(sp.report)} title={label} />;
    case "report":
      return <ReportCenter dept={dept} single={page.report} title={page.title} subtitle={page.subtitle} />;
    case "calendar":
      return (<><PageHeader title={label} subtitle="Month view of scheduled work. Click a day to see and open its items." /><CalendarView dept={dept} title={label} /></>);
    case "schedule":
      return (
        <>
          <PageHeader title="Schedule & Reports" subtitle="See what happened and what is scheduled on any date, then run department reports." />
          <CalendarView dept={dept} title="Schedule" />
          <div className="mt-10"><ReportCenter dept={dept} initialKey={one(sp.report)} title="Reports" /></div>
        </>
      );
    case "dept-settings":
      return <DeptSettings dept={dept} />;
    case "custom":
      switch (page.name) {
        case "users": return <UserManagement />;
        case "roles": return <RolePermissions />;
        case "system-settings": return <SystemSettings />;
        case "database": return <DatabaseManager />;
        case "backup": return <BackupManager />;
        case "sales-daily-summary": return <SalesDailySummary date={one(sp.date)} />;
        case "sales-add-client": return <SalesAddClient />;
        case "sales-follow-ups": return <SalesFollowUps />;
        case "sales-today": return <SalesTodayWork />;
        case "erp-dashboard": return <ErpDashboard />;
        case "erp-accounts": return <ErpAccounts />;
        case "erp-vouchers": return <ErpVouchers />;
        case "erp-cash-bank": return <ErpCashBank />;
        case "erp-ledger": return <ErpLedger />;
        case "erp-customers": return <ErpCustomers />;
        case "erp-suppliers": return <ErpSuppliers />;
        case "erp-invoices": return <ErpInvoices />;
        case "erp-purchases": return <ErpPurchases />;
        case "erp-payments": return <ErpPayments />;
        case "erp-ageing": return <ErpAgeing />;
        case "erp-inventory": return <ErpInventory />;
        case "erp-vat": return <ErpVat />;
        case "erp-payroll": return <ErpPayroll />;
        case "erp-fixed-assets": return <ErpFixedAssets />;
        case "erp-reports": return <ErpReports />;
        case "erp-settings": return <ErpSettings />;
      }
  }
  notFound();
}
