import type { DeptCode } from "./constants";

export type PageDef =
  | { type: "dashboard" }
  | { type: "resource"; resource: string; preset?: string; title?: string; subtitle?: string; addHref?: string }
  | { type: "form"; resource: string; back: string; title?: string }
  | { type: "reports" }
  | { type: "report"; report: string; title?: string; subtitle?: string }
  | { type: "calendar" }
  | { type: "schedule" }
  | { type: "dept-settings" }
  | { type: "custom"; name: string };

export interface NavItem { label: string; slug: string; icon: string; page: PageDef }
export interface NavGroup { label?: string; icon?: string; items: NavItem[] }
export interface DeptNav { title: string; groups: NavGroup[] }

const item = (label: string, slug: string, icon: string, page: PageDef): NavItem => ({ label, slug, icon, page });

export const NAV: Record<DeptCode, DeptNav> = {
  admin: {
    title: "Central Control",
    groups: [
      { items: [item("Executive Dashboard", "", "LayoutDashboard", { type: "dashboard" })] },
      {
        label: "Management",
        items: [
          item("User Management", "users", "Users", { type: "custom", name: "users" }),
          item("Departments", "departments", "Building2", { type: "resource", resource: "departments", title: "Department Management", subtitle: "Configure departments available across the platform" }),
          item("Roles & Permissions", "roles", "ShieldCheck", { type: "custom", name: "roles" }),
        ],
      },
      {
        label: "System",
        items: [
          item("System Settings", "settings", "Settings", { type: "custom", name: "system-settings" }),
          item("Database Management", "database", "Database", { type: "custom", name: "database" }),
          item("Backup & Restore", "backup", "HardDriveDownload", { type: "custom", name: "backup" }),
          item("Audit Logs", "audit", "ScrollText", { type: "resource", resource: "audit_logs", title: "Audit Logs", subtitle: "Every security-relevant and data-changing action" }),
        ],
      },
    ],
  },
  sales: {
    title: "Sales Department",
    groups: [
      {
        items: [
          item("Sales Dashboard", "", "LayoutDashboard", { type: "dashboard" }),
          item("Clients Master", "clients", "Briefcase", { type: "resource", resource: "clients", title: "Clients Master", addHref: "/sales/clients/new" }),
          item("Add Client", "clients/new", "UserPlus", { type: "custom", name: "sales-add-client" }),
          item("Today's Work", "today", "CalendarCheck", { type: "custom", name: "sales-today" }),
          item("Add Work", "work/new", "CalendarPlus", { type: "form", resource: "sales_work", back: "/sales/work", title: "Add Work" }),
          item("Work History", "work", "History", { type: "resource", resource: "sales_work", title: "Work History", subtitle: "All sales work records", addHref: "/sales/work/new" }),
          item("Follow-ups", "follow-ups", "PhoneCall", { type: "custom", name: "sales-follow-ups" }),
          item("Daily Summary", "daily-summary", "ClipboardList", { type: "custom", name: "sales-daily-summary" }),
          item("Activity Reports", "reports", "FileText", { type: "reports" }),
          item("Schedule & Calendar", "schedule", "CalendarDays", { type: "calendar" }),
          item("Settings", "settings", "SlidersHorizontal", { type: "dept-settings" }),
        ],
      },
    ],
  },
  service: {
    title: "Service Department",
    groups: [
      {
        items: [
          item("Service Dashboard", "", "LayoutDashboard", { type: "dashboard" }),
          item("Today Work", "today", "CalendarCheck", { type: "resource", resource: "service_all", preset: "today", title: "Today's Scheduled Work", addHref: "/service/new" }),
          item("Upcoming Work", "upcoming", "CalendarClock", { type: "resource", resource: "service_all", preset: "upcoming", title: "Upcoming Work", addHref: "/service/new" }),
          item("Calendar / Dispatch", "calendar", "CalendarDays", { type: "calendar" }),
          item("Sales Clients", "clients", "Briefcase", { type: "resource", resource: "clients", title: "Sales Clients", subtitle: "Client master shared with the Sales department" }),
        ],
      },
      {
        label: "Work Categories",
        items: [
          item("Servicing", "servicing", "Wrench", { type: "resource", resource: "service_servicing", title: "Servicing", addHref: "/service/servicing/new" }),
          item("Maintenance", "maintenance", "Settings2", { type: "resource", resource: "service_maintenance", title: "Maintenance", addHref: "/service/maintenance/new" }),
          item("Installation", "installation", "Zap", { type: "resource", resource: "service_installation", title: "Installation", addHref: "/service/installation/new" }),
          item("General Work", "general", "ClipboardCheck", { type: "resource", resource: "service_general", title: "General Work", addHref: "/service/general/new" }),
        ],
      },
      {
        items: [
          item("Warranty Tracking", "warranty", "ShieldCheck", { type: "resource", resource: "warranties", title: "Warranty Tracking" }),
          item("Add Work Order", "new", "PlusCircle", { type: "form", resource: "service_all", back: "/service/history", title: "Add Work Order" }),
          item("Work History", "history", "History", { type: "resource", resource: "service_all", title: "Work History", subtitle: "All service work orders", addHref: "/service/new" }),
          item("Schedule & Reports", "schedule", "FileText", { type: "schedule" }),
          item("Settings", "settings", "SlidersHorizontal", { type: "dept-settings" }),
        ],
      },
    ],
  },
  erp: {
    title: "Accounts & ERP",
    groups: [
      {
        label: "CORE ACCOUNTING",
        items: [
          item("Financial Dashboard", "", "LayoutDashboard", { type: "custom", name: "erp-dashboard" }),
          item("Chart of Accounts", "accounts", "FolderTree", { type: "custom", name: "erp-accounts" }),
          item("Journal & Vouchers", "vouchers", "FileSpreadsheet", { type: "custom", name: "erp-vouchers" }),
          item("Cash & Bank", "cash-bank", "Landmark", { type: "custom", name: "erp-cash-bank" }),
          item("Accounts Ledger", "ledger", "BookOpen", { type: "custom", name: "erp-ledger" }),
        ],
      },
      {
        label: "SALES & PURCHASES",
        items: [
          item("Customers", "customers", "Users", { type: "custom", name: "erp-customers" }),
          item("Suppliers", "suppliers", "Truck", { type: "custom", name: "erp-suppliers" }),
          item("Sales Invoices", "invoices", "Receipt", { type: "custom", name: "erp-invoices" }),
          item("Purchase Bills", "purchases", "ShoppingCart", { type: "custom", name: "erp-purchases" }),
          item("Receipts & Payments", "payments", "Wallet", { type: "custom", name: "erp-payments" }),
        ],
      },
      {
        label: "REPORTS & COMPLIANCE",
        items: [
          item("Ageing Analysis", "ageing", "Clock", { type: "custom", name: "erp-ageing" }),
          item("Inventory Items", "inventory", "Package", { type: "custom", name: "erp-inventory" }),
          item("VAT Mushak 9.1", "vat", "ShieldCheck", { type: "custom", name: "erp-vat" }),
          item("Payroll & Salaries", "payroll", "CreditCard", { type: "custom", name: "erp-payroll" }),
          item("Fixed Assets", "fixed-assets", "Building", { type: "custom", name: "erp-fixed-assets" }),
          item("Financial Reports & Print", "reports", "FileText", { type: "custom", name: "erp-reports" }),
        ],
      },
      {
        label: "SETTINGS",
        items: [
          item("Accounts Settings", "settings", "SlidersHorizontal", { type: "custom", name: "erp-settings" }),
        ],
      },
    ],
  },
  marketing: {
    title: "Digital Marketing",
    groups: [
      {
        items: [
          item("Marketing Dashboard", "", "LayoutDashboard", { type: "dashboard" }),
          item("Work / Task Management", "tasks", "ListChecks", { type: "resource", resource: "marketing_tasks", title: "Marketing Tasks" }),
          item("Content & Social Posts", "posts", "Share2", { type: "resource", resource: "social_posts", title: "Content & Social Posts", subtitle: "Facebook, LinkedIn and other social content calendar" }),
          item("Campaign Management", "campaigns", "Megaphone", { type: "resource", resource: "campaigns", title: "Campaign Management" }),
          item("Marketing Reports", "reports", "FileText", { type: "reports" }),
          item("Campaign History", "history", "History", { type: "resource", resource: "campaigns", preset: "history", title: "Campaign History", subtitle: "Completed and cancelled campaigns" }),
        ],
      },
    ],
  },
  it: {
    title: "IT Support",
    groups: [
      {
        items: [
          item("IT Support Dashboard", "", "LayoutDashboard", { type: "dashboard" }),
          item("IT Work Management", "work", "Headphones", { type: "resource", resource: "it_tasks", title: "IT Work Management" }),
          item("IT Ticket Management", "tickets", "Ticket", { type: "resource", resource: "it_tickets", title: "IT Ticket Management" }),
          item("Basic Device Management", "devices", "Laptop", { type: "resource", resource: "devices", title: "Device Management" }),
          item("IT Work History", "history", "History", { type: "resource", resource: "it_tickets", preset: "history", title: "IT Work History", subtitle: "Resolved and closed tickets" }),
          item("IT Reports", "reports", "FileText", { type: "reports" }),
        ],
      },
    ],
  },
};

/** Additional hidden "new" form pages. */
export const EXTRA_PAGES: Partial<Record<DeptCode, Record<string, PageDef>>> = {
  sales: {
    "new-client": { type: "custom", name: "sales-add-client" },
  },
  service: {
    "servicing/new": { type: "form", resource: "service_servicing", back: "/service/servicing", title: "Add Servicing Record" },
    "maintenance/new": { type: "form", resource: "service_maintenance", back: "/service/maintenance", title: "Add Maintenance Record" },
    "installation/new": { type: "form", resource: "service_installation", back: "/service/installation", title: "Add Installation Record" },
    "general/new": { type: "form", resource: "service_general", back: "/service/general", title: "Add General Work" },
  },
};

export function findPage(dept: DeptCode, slug: string): { page: PageDef; label: string } | null {
  for (const g of NAV[dept].groups) for (const i of g.items) if (i.slug === slug) return { page: i.page, label: i.label };
  const extra = EXTRA_PAGES[dept]?.[slug];
  if (extra) return { page: extra, label: (extra as { title?: string }).title ?? slug };
  return null;
}
