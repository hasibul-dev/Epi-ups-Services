import type { DeptCode } from "./constants";
import type { FieldType, Where } from "./resource-config";

export interface ReportColumn { key: string; label: string; type: FieldType | "text"; sum?: boolean }

export interface ReportDef {
  key: string;
  dept: DeptCode;
  title: string;
  description: string;
  resource?: string;
  where?: Where[];
  columns?: string[];
  customColumns?: ReportColumn[];
  dateField?: string;
  sort?: { field: string; dir: "asc" | "desc" };
  orientation: "portrait" | "landscape";
  signatures?: boolean;
  filters?: { date?: boolean; client?: boolean; status?: boolean; category?: boolean; department?: boolean };
}

const R = (r: ReportDef): ReportDef => r;
const DONE = ["completed", "cancelled"];
const PENDING_TICKET = ["open", "in_progress", "pending"];

export const REPORTS: ReportDef[] = [
  /* Sales */
  R({ key: "sales_daily_work", dept: "sales", title: "Daily Work Report", description: "Sales work items by scheduled date", resource: "sales_work", dateField: "dueDate", columns: ["title", "clientId", "dueDate", "status", "notes"], orientation: "landscape", signatures: true }),
  R({ key: "sales_followups", dept: "sales", title: "Client Follow-ups Report", description: "Scheduled, pending and completed client follow-ups", resource: "follow_ups", dateField: "dueDate", columns: ["clientId", "dueDate", "method", "result", "status", "notes"], orientation: "landscape" }),
  R({ key: "sales_completed", dept: "sales", title: "Completed Work Report", description: "Successfully completed sales work orders", resource: "sales_work", where: [{ field: "status", op: "eq", value: "completed" }], dateField: "dueDate", columns: ["title", "clientId", "dueDate", "status", "notes"], orientation: "landscape", signatures: true }),
  R({ key: "sales_overdue", dept: "sales", title: "Pending & Overdue Work Report", description: "Open and overdue work items needing attention", resource: "sales_work", where: [{ field: "status", op: "nin", value: DONE }], dateField: "dueDate", columns: ["title", "clientId", "dueDate", "status", "notes"], orientation: "landscape" }),
  R({ key: "sales_clients", dept: "sales", title: "Clients Master Report", description: "Client directory with contact person, company, designation and category", resource: "clients", columns: ["name", "companyName", "designation", "phone", "email", "category", "registrationDate"], orientation: "landscape" }),

  /* Service */
  R({ key: "svc_servicing", dept: "service", title: "Servicing Report", description: "UPS servicing jobs", resource: "service_servicing", columns: ["title", "clientId", "upsModel", "serialNumber", "technicianId", "scheduledDate", "status"], orientation: "landscape" }),
  R({ key: "svc_maintenance", dept: "service", title: "Maintenance Report", description: "Preventive and corrective maintenance", resource: "service_maintenance", columns: ["title", "clientId", "equipment", "maintenanceType", "technicianId", "scheduledDate", "nextMaintenanceDate", "status"], orientation: "landscape" }),
  R({ key: "svc_installation", dept: "service", title: "Installation Report", description: "Installation and commissioning progress", resource: "service_installation", columns: ["title", "clientId", "capacity", "productModel", "location", "technicianId", "scheduledDate", "commissioningStatus", "status"], orientation: "landscape", signatures: true }),
  R({ key: "svc_general", dept: "service", title: "General Work Report", description: "General service work", resource: "service_general", columns: ["title", "clientId", "technicianId", "scheduledDate", "priority", "status"], orientation: "landscape" }),
  R({ key: "svc_warranty", dept: "service", title: "Warranty Report", description: "Warranty coverage and expiry", resource: "warranties", columns: ["clientId", "product", "serialNumber", "purchaseDate", "warrantyStart", "warrantyExpiry", "status"], orientation: "landscape" }),
  R({ key: "svc_technician", dept: "service", title: "Technician Work Report", description: "Work orders by technician", resource: "service_all", sort: { field: "technicianId", dir: "asc" }, columns: ["technicianId", "category", "title", "clientId", "scheduledDate", "status"], orientation: "landscape", signatures: true }),
  R({ key: "svc_completed", dept: "service", title: "Completed Work Report", description: "Completed service work", resource: "service_all", where: [{ field: "status", op: "eq", value: "completed" }], columns: ["category", "title", "clientId", "technicianId", "scheduledDate", "completedDate"], orientation: "landscape", signatures: true }),
  R({ key: "svc_overdue", dept: "service", title: "Overdue Work Report", description: "Open service work past its scheduled date", resource: "service_all", where: [{ field: "scheduledDate", op: "lt", value: "$today" }, { field: "status", op: "nin", value: DONE }], columns: ["category", "title", "clientId", "technicianId", "scheduledDate", "priority", "status"], orientation: "landscape" }),

  /* Marketing */
  R({ key: "mkt_campaign_performance", dept: "marketing", title: "Campaign Performance Report", description: "Budget, spend, reach and leads per campaign", resource: "campaigns", columns: ["name", "channel", "status", "budget", "spent", "budgetUsed", "impressions", "clicks", "leads", "costPerLead"], orientation: "landscape", signatures: true }),
  R({ key: "mkt_social_content", dept: "marketing", title: "Social Media Content Report", description: "All social content and its state", resource: "social_posts", columns: ["title", "platform", "campaignId", "scheduledDate", "publishedDate", "status", "assignedTo"], orientation: "landscape" }),
  R({ key: "mkt_published", dept: "marketing", title: "Published Posts Report", description: "Published posts with reach and engagement", resource: "social_posts", where: [{ field: "status", op: "eq", value: "published" }], dateField: "publishedDate", columns: ["title", "platform", "publishedDate", "reach", "engagement", "leads", "assignedTo"], orientation: "landscape" }),
  R({ key: "mkt_leads", dept: "marketing", title: "Lead Generation Report", description: "Leads and cost per lead by campaign", resource: "campaigns", sort: { field: "leads", dir: "desc" }, columns: ["name", "channel", "startDate", "leads", "spent", "costPerLead", "status"], orientation: "portrait" }),
  R({ key: "mkt_activity", dept: "marketing", title: "Marketing Activity Report", description: "Marketing tasks and progress", resource: "marketing_tasks", columns: ["title", "campaignId", "assignedTo", "dueDate", "priority", "status"], orientation: "landscape" }),

  /* IT */
  R({ key: "it_tickets", dept: "it", title: "IT Ticket Report", description: "All IT tickets", resource: "it_tickets", dateField: "createdAt", columns: ["ticketNo", "subject", "userName", "department", "priority", "technicianId", "status", "completionDate"], orientation: "landscape" }),
  R({ key: "it_devices", dept: "it", title: "Device Management Report", description: "Device inventory and warranty", resource: "devices", columns: ["name", "type", "brand", "model", "serialNumber", "assignedEmployee", "department", "warrantyExpiry", "status"], orientation: "landscape" }),
  R({ key: "it_technician", dept: "it", title: "Technician Activity Report", description: "Tickets handled by each technician", resource: "it_tickets", dateField: "createdAt", sort: { field: "technicianId", dir: "asc" }, columns: ["technicianId", "ticketNo", "subject", "priority", "status", "completionDate"], orientation: "landscape", signatures: true }),
  R({ key: "it_resolved", dept: "it", title: "Resolved Ticket Report", description: "Resolved and closed tickets with resolution", resource: "it_tickets", where: [{ field: "status", op: "in", value: ["resolved", "closed"] }], dateField: "completionDate", columns: ["ticketNo", "subject", "userName", "technicianId", "completionDate", "resolution"], orientation: "landscape" }),
  R({ key: "it_pending", dept: "it", title: "Pending Ticket Report", description: "Open, in-progress and pending tickets", resource: "it_tickets", where: [{ field: "status", op: "in", value: PENDING_TICKET }], dateField: "createdAt", columns: ["ticketNo", "subject", "userName", "department", "priority", "technicianId", "status"], orientation: "landscape" }),

  /* ERP */
  R({ key: "erp_invoices", dept: "erp", title: "Sales Invoice Report", description: "Invoices with paid and outstanding amounts", resource: "invoices", columns: ["invoiceNo", "clientId", "issueDate", "dueDate", "subtotal", "tax", "total", "paidAmount", "balance", "paymentStatus"], orientation: "landscape", signatures: true }),
  R({ key: "erp_purchases", dept: "erp", title: "Purchase Report", description: "Purchase records", resource: "purchases", columns: ["purchaseNo", "supplier", "purchaseDate", "dueDate", "amount", "status"], orientation: "portrait", signatures: true }),
  R({ key: "erp_income", dept: "erp", title: "Income Report", description: "Other income received", resource: "incomes", columns: ["incomeDate", "category", "source", "method", "reference", "amount"], orientation: "portrait", signatures: true }),
  R({ key: "erp_expense", dept: "erp", title: "Expense Report", description: "Expenses by category", resource: "expenses", columns: ["expenseDate", "category", "payee", "method", "reference", "amount"], orientation: "portrait", signatures: true }),
  R({ key: "erp_payment", dept: "erp", title: "Payment Report", description: "Payments received and paid", resource: "payments", columns: ["paymentNo", "direction", "clientId", "party", "paymentDate", "method", "reference", "amount"], orientation: "landscape", signatures: true }),
  R({ key: "erp_ledger", dept: "erp", title: "Accounts Ledger Report", description: "Debit / credit postings", resource: "ledger_entries", sort: { field: "entryDate", dir: "asc" }, columns: ["entryDate", "account", "description", "refType", "debit", "credit"], orientation: "landscape", signatures: true }),
  R({
    key: "erp_customer_accounts", dept: "erp", title: "Customer Accounts Report", description: "Invoiced, received and outstanding per customer",
    customColumns: [
      { key: "name", label: "Customer", type: "text" },
      { key: "invoices", label: "Invoices", type: "number" },
      { key: "invoiced", label: "Invoiced", type: "money", sum: true },
      { key: "received", label: "Received", type: "money", sum: true },
      { key: "balance", label: "Outstanding", type: "money", sum: true },
    ],
    orientation: "portrait", signatures: true, filters: { date: true, client: true },
  }),
  R({
    key: "erp_pnl", dept: "erp", title: "Income & Expense Summary", description: "Totals by type and category (invoiced income, other income, purchases, expenses)",
    customColumns: [
      { key: "type", label: "Type", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "entries", label: "Entries", type: "number" },
      { key: "amount", label: "Amount", type: "money" },
    ],
    orientation: "portrait", signatures: true, filters: { date: true },
  }),
];

export function reportsForDept(depts: DeptCode[]): ReportDef[] {
  return REPORTS.filter((r) => depts.includes(r.dept));
}
export const getReport = (key: string) => REPORTS.find((r) => r.key === key);
