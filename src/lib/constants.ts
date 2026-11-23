export type DeptCode = "admin" | "sales" | "service" | "erp" | "marketing" | "it";
export type RoleCode = "super_admin" | "administrator" | "manager" | "staff" | "readonly";
export type Action = "view" | "create" | "edit" | "delete" | "export";

export const ACTIONS: Action[] = ["view", "create", "edit", "delete", "export"];

export const DEPTS: Record<DeptCode, { code: DeptCode; name: string; short: string; color: string; description: string }> = {
  admin: { code: "admin", name: "Administration", short: "Admin", color: "#5b8def", description: "Central control, users, security and system settings" },
  sales: { code: "sales", name: "Sales Department", short: "Sales", color: "#06b6d4", description: "Clients, work pipeline and follow-ups" },
  service: { code: "service", name: "Service Department", short: "Service", color: "#10b981", description: "Servicing, maintenance, installation and warranty" },
  erp: { code: "erp", name: "ERP / Accounts", short: "ERP / Accounts", color: "#6366f1", description: "Invoices, payments, expenses and ledger" },
  marketing: { code: "marketing", name: "Digital Marketing", short: "Marketing", color: "#a855f7", description: "Campaigns, content and lead generation" },
  it: { code: "it", name: "IT Support", short: "IT Support", color: "#3b82f6", description: "Tickets, devices and IT work" },
};

export const DEPT_ORDER: DeptCode[] = ["admin", "sales", "service", "erp", "marketing", "it"];

export const ROLES: Record<RoleCode, { code: RoleCode; name: string; description: string }> = {
  super_admin: { code: "super_admin", name: "Super Administrator", description: "Full control of every department and the system" },
  administrator: { code: "administrator", name: "Administrator", description: "Manages all departments within granted permissions" },
  manager: { code: "manager", name: "Department Manager", description: "Full operational access inside own department" },
  staff: { code: "staff", name: "Department Staff", description: "Day-to-day work inside own department" },
  readonly: { code: "readonly", name: "Read-Only User", description: "View-only access inside own department" },
};

export const ROLE_ORDER: RoleCode[] = ["super_admin", "administrator", "manager", "staff", "readonly"];

export const DEFAULT_PERMISSIONS: Record<Exclude<RoleCode, "super_admin">, Record<Action, boolean>> = {
  administrator: { view: true, create: true, edit: true, delete: true, export: true },
  manager: { view: true, create: true, edit: true, delete: true, export: true },
  staff: { view: true, create: true, edit: true, delete: false, export: true },
  readonly: { view: true, create: false, edit: false, delete: false, export: true },
};

export const SETTINGS_DEFAULTS: Record<string, string> = {
  "company.name": "EPI UPS (Bangladesh) Limited",
  "company.address": "Dhaka, Bangladesh",
  "company.phone": "",
  "company.email": "",
  "company.website": "",
  "company.logo": "",
  "theme.default": "dark",
  "format.date": "DD MMM YYYY",
  "format.timezone": "Asia/Dhaka",
  "format.currency": "৳",
  "print.orientation": "portrait",
  "print.footer": "EPI UPS (Bangladesh) Limited — Confidential",
  "print.signatures": "Prepared By,Checked By,Approved By",
  "notify.enabled": "true",
  "notify.upcomingDays": "3",
  "notify.warrantyDays": "30",
  "backup.retention": "20",
  "sales.clientCategories": "Corporate,Industrial,Government,Healthcare,Banking & Finance,Education,Retail,Individual",
  "sales.workCategories": "Product Demo,Quotation,Negotiation,Order Follow-up,Site Visit,Payment Collection,Other",
  "erp.expenseCategories": "Office Rent,Salaries,Utilities,Transport,Marketing,Repairs & Maintenance,Office Supplies,Other",
  "erp.incomeCategories": "Interest,Commission,Scrap Sale,Miscellaneous",
  "erp.defaultTaxRate": "0",
};

export interface DeptSettingField { key: string; label: string; help?: string; type: "list" | "number" | "text" }
export const DEPT_SETTINGS: Partial<Record<DeptCode, DeptSettingField[]>> = {
  sales: [
    { key: "sales.clientCategories", label: "Client categories", help: "Comma-separated list shown in client forms and filters", type: "list" },
    { key: "sales.workCategories", label: "Work categories", help: "Comma-separated list shown in work forms and filters", type: "list" },
  ],
  service: [
    { key: "notify.upcomingDays", label: "Upcoming work window (days)", help: "How far ahead upcoming work and dispatch alerts look", type: "number" },
    { key: "notify.warrantyDays", label: "Warranty alert window (days)", help: "Warranties expiring within this many days raise alerts", type: "number" },
  ],
  erp: [
    { key: "format.currency", label: "Currency symbol", type: "text" },
    { key: "erp.defaultTaxRate", label: "Reference tax / VAT rate (%)", help: "Informational only — tax amounts are always entered manually. No tax rules are hard-coded.", type: "number" },
    { key: "erp.expenseCategories", label: "Expense categories", type: "list" },
    { key: "erp.incomeCategories", label: "Other-income categories", type: "list" },
  ],
};

export const MODULE_CODES: DeptCode[] = DEPT_ORDER;
