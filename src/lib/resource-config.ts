import { z } from "zod";

/* Client-safe resource definitions shared by UI forms, tables and server-side validation. */

export type FieldType =
  | "text" | "textarea" | "email" | "phone" | "number" | "money" | "date" | "time" | "datetime"
  | "select" | "ref" | "boolean" | "files";

export interface Option { value: string; label: string; tone?: Tone }
export type Tone = "slate" | "blue" | "cyan" | "emerald" | "amber" | "red" | "purple" | "indigo";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  optionsKey?: string;
  ref?: string;
  list?: boolean;
  listFor?: string[];
  showFor?: string[];
  labels?: Record<string, string>;
  hideInForm?: boolean;
  readOnly?: boolean;
  virtual?: boolean;
  full?: boolean;
  default?: string | number | boolean;
  min?: number;
  sum?: boolean;
  placeholder?: string;
}

export type WhereOp = "eq" | "ne" | "in" | "nin" | "lt" | "lte" | "gt" | "gte" | "notnull" | "isnull";
export interface Where { field: string; op: WhereOp; value?: string | string[] }

export interface ResourceDef {
  key: string;
  table: string;
  label: string;
  singular: string;
  modules: string[];
  fields: FieldDef[];
  searchFields: string[];
  titleField: string;
  dateField?: string;
  statusField?: string;
  categoryField?: string;
  clientField?: string;
  assigneeField?: string;
  departmentField?: string;
  sort: { field: string; dir: "asc" | "desc" };
  fixed?: Record<string, string>;
  overdue?: { field: string; done: string[] };
  presets?: Record<string, Where[]>;
  readOnly?: boolean;
  noCreate?: boolean;
  noDelete?: boolean;
  completeAction?: { status: string; dateField?: string };
}

const o = (value: string, label: string, tone?: Tone): Option => ({ value, label, tone });
const f = (name: string, label: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef => ({ name, label, type, ...extra });

export const PRIORITY: Option[] = [o("low", "Low", "slate"), o("normal", "Normal", "blue"), o("high", "High", "amber"), o("urgent", "Urgent", "red")];
const PAY_METHODS: Option[] = [o("cash", "Cash"), o("bank", "Bank Transfer"), o("bkash", "bKash / Mobile"), o("cheque", "Cheque"), o("card", "Card"), o("other", "Other")];
const NOT_DONE_SALES = ["completed", "cancelled"];
export const SERVICE_CATEGORIES = ["servicing", "maintenance", "installation", "general"] as const;
const SERVICE_DONE = ["completed", "cancelled"];

const salesWorkStatus: Option[] = [o("new", "New", "blue"), o("in_progress", "In Progress", "cyan"), o("on_hold", "On Hold", "amber"), o("completed", "Completed", "emerald"), o("cancelled", "Cancelled", "slate")];
const serviceStatus: Option[] = [o("scheduled", "Scheduled", "blue"), o("in_progress", "In Progress", "cyan"), o("on_hold", "On Hold", "amber"), o("completed", "Completed", "emerald"), o("cancelled", "Cancelled", "slate")];
const taskStatus: Option[] = [o("todo", "To Do", "blue"), o("in_progress", "In Progress", "cyan"), o("review", "In Review", "amber"), o("done", "Done", "emerald"), o("cancelled", "Cancelled", "slate")];

/* ───────── Service field set (category-aware) ───────── */
const serviceFieldsAll: FieldDef[] = [
  f("category", "Category", "select", {
    required: true,
    options: [o("servicing", "Servicing", "amber"), o("maintenance", "Maintenance", "emerald"), o("installation", "Installation", "blue"), o("general", "General Work", "slate")],
    listFor: ["all"],
  }),
  f("title", "Work Title", "text", { required: true, list: true, full: true }),
  f("clientId", "Client", "ref", { ref: "clients", required: true, list: true }),
  f("upsModel", "UPS Model", "text", { showFor: ["servicing"], listFor: ["servicing"] }),
  f("serialNumber", "Serial Number", "text", { showFor: ["servicing"], listFor: ["servicing"] }),
  f("equipment", "Equipment Information", "text", { showFor: ["maintenance"], listFor: ["maintenance"] }),
  f("maintenanceType", "Maintenance Type", "select", {
    showFor: ["maintenance"], listFor: ["maintenance"],
    options: [o("preventive", "Preventive"), o("corrective", "Corrective"), o("amc", "AMC Visit"), o("emergency", "Emergency")],
  }),
  f("projectDetails", "Project Details", "textarea", { showFor: ["installation"], full: true }),
  f("capacity", "UPS Capacity", "text", { showFor: ["installation"], listFor: ["installation"], placeholder: "e.g. 10 kVA" }),
  f("productModel", "Product Model", "text", { showFor: ["installation"], listFor: ["installation"] }),
  f("location", "Installation Location", "text", { showFor: ["installation"], listFor: ["installation"] }),
  f("description", "Details / Description", "textarea", { full: true, labels: { servicing: "Service Details", maintenance: "Maintenance Details", general: "Description" } }),
  f("checklist", "Installation Checklist", "textarea", { showFor: ["installation"], full: true }),
  f("testingDetails", "Testing Details", "textarea", { showFor: ["installation"], full: true }),
  f("commissioningStatus", "Commissioning Status", "select", {
    showFor: ["installation"], listFor: ["installation"],
    options: [o("pending", "Pending", "amber"), o("testing", "In Testing", "cyan"), o("commissioned", "Commissioned", "emerald"), o("handed_over", "Handed Over", "blue")],
  }),
  f("technicianId", "Assigned Technician", "ref", { ref: "users", listFor: ["all", "servicing", "maintenance", "installation", "general"] }),
  f("scheduledDate", "Scheduled Date", "date", { required: true, listFor: ["all", "servicing", "maintenance", "installation", "general"], labels: { servicing: "Service Date", installation: "Installation Date" } }),
  f("scheduledTime", "Time", "time"),
  f("nextMaintenanceDate", "Next Maintenance Date", "date", { showFor: ["maintenance"], listFor: ["maintenance"] }),
  f("priority", "Priority", "select", { options: PRIORITY, default: "normal", listFor: ["all", "general"] }),
  f("status", "Status", "select", { options: serviceStatus, default: "scheduled", listFor: ["all", "servicing", "maintenance", "installation", "general"] }),
  f("completedDate", "Completed Date", "date"),
  f("remarks", "Remarks", "textarea", { full: true }),
];

function serviceResource(cat: (typeof SERVICE_CATEGORIES)[number] | "all"): ResourceDef {
  const labelMap = { servicing: "Servicing", maintenance: "Maintenance", installation: "Installation", general: "General Work", all: "Work Orders" };
  const fields: FieldDef[] =
    cat === "all"
      ? serviceFieldsAll.map((x) => ({ ...x, list: x.listFor?.includes("all") ?? x.list }))
      : serviceFieldsAll
          .filter((x) => x.name !== "category" && (!x.showFor || x.showFor.includes(cat)))
          .map((x) => ({
            ...x,
            label: x.labels?.[cat] ?? x.label,
            showFor: undefined,
            list: x.list || x.listFor?.includes(cat) || false,
          }));
  return {
    key: cat === "all" ? "service_all" : `service_${cat}`,
    table: "service_orders",
    label: labelMap[cat],
    singular: cat === "all" ? "Work Order" : `${labelMap[cat]} Record`,
    modules: ["service"],
    fields,
    searchFields: ["title", "orderNo", "serialNumber", "upsModel", "location", "description", "remarks"],
    titleField: "title",
    dateField: "scheduledDate",
    statusField: "status",
    categoryField: cat === "all" ? "category" : undefined,
    clientField: "clientId",
    assigneeField: "technicianId",
    sort: { field: "scheduledDate", dir: "desc" },
    fixed: cat === "all" ? undefined : { category: cat },
    overdue: { field: "scheduledDate", done: SERVICE_DONE },
    completeAction: { status: "completed", dateField: "completedDate" },
    presets: {
      today: [{ field: "scheduledDate", op: "eq", value: "$today" }],
      upcoming: [{ field: "scheduledDate", op: "gt", value: "$today" }, { field: "status", op: "nin", value: SERVICE_DONE }],
      overdue: [{ field: "scheduledDate", op: "lt", value: "$today" }, { field: "status", op: "nin", value: SERVICE_DONE }],
      history: [{ field: "status", op: "in", value: SERVICE_DONE }],
      completed: [{ field: "status", op: "eq", value: "completed" }],
    },
  };
}

const ledgerHidden = { hideInForm: true };

export const RESOURCES: Record<string, ResourceDef> = {
  /* ───── Sales ───── */
  clients: {
    key: "clients", table: "clients", label: "Clients", singular: "Client", modules: ["sales", "service", "erp"],
    fields: [
      f("name", "Client Name", "text", { required: true, list: true }),
      f("companyName", "Company Name", "text", { list: true }),
      f("contactPerson", "Contact Person", "text", { list: true }),
      f("designation", "Designation", "text", { list: true }),
      f("phone", "Phone Number", "phone", { list: true }),
      f("email", "Email", "email"),
      f("category", "Client Category", "select", {
        options: [
          o("Potential", "Potential"),
          o("No Potential", "No Potential"),
          o("Quotation", "Quotation"),
          o("Sale", "Sale"),
        ],
        list: true,
      }),
      f("registrationDate", "Registration Date", "date", { default: "$today", list: true }),
      f("address", "Address", "textarea", { full: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["name", "companyName", "contactPerson", "phone", "email", "address"],
    titleField: "name", dateField: "registrationDate", categoryField: "category",
    sort: { field: "createdAt", dir: "desc" },
  },
  sales_work: {
    key: "sales_work", table: "sales_work", label: "Sales Work", singular: "Work Order", modules: ["sales"],
    fields: [
      f("clientId", "Client Name", "ref", { ref: "clients", required: true, list: true, placeholder: "Type client name..." }),
      f("title", "Work Title / Subject", "text", { required: true, list: true, full: true }),
      f("description", "Work Description", "textarea", { full: true }),
      f("dueDate", "Work Date", "date", { required: true, default: "$today", list: true }),
      f("status", "Status", "select", { options: salesWorkStatus, default: "new", list: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["title", "description", "notes"],
    titleField: "title", dateField: "dueDate", statusField: "status", clientField: "clientId",
    sort: { field: "dueDate", dir: "desc" },
    overdue: { field: "dueDate", done: NOT_DONE_SALES },
    completeAction: { status: "completed", dateField: "completedAt" },
    presets: {
      today: [{ field: "dueDate", op: "eq", value: "$today" }],
      upcoming: [{ field: "dueDate", op: "gt", value: "$today" }, { field: "status", op: "nin", value: NOT_DONE_SALES }],
      overdue: [{ field: "dueDate", op: "lt", value: "$today" }, { field: "status", op: "nin", value: NOT_DONE_SALES }],
      active: [{ field: "status", op: "eq", value: "in_progress" }],
      new: [{ field: "status", op: "eq", value: "new" }],
      completed: [{ field: "status", op: "eq", value: "completed" }],
    },
  },
  follow_ups: {
    key: "follow_ups", table: "follow_ups", label: "Follow-ups", singular: "Follow-up", modules: ["sales"],
    fields: [
      f("clientId", "Client Name", "ref", { ref: "clients", required: true, list: true, placeholder: "Type client name..." }),
      f("workId", "Related Work", "ref", { ref: "sales_work", list: true }),
      f("dueDate", "Follow-up Date", "date", { required: true, list: true, default: "$today" }),
      f("method", "Follow-up Method", "select", {
        options: [
          o("Phone Call", "Phone Call"),
          o("Email", "Email"),
          o("WhatsApp", "WhatsApp"),
          o("Site Visit", "Site Visit"),
          o("Meeting", "Meeting"),
          o("Other", "Other"),
        ],
        default: "Phone Call",
        list: true,
      }),
      f("result", "Next Result", "select", {
        options: [
          o("Potential (+3d)", "Potential (+3d)"),
          o("No Potential (+10d)", "No Potential (+10d)"),
          o("Quotation (+7d)", "Quotation (+7d)"),
          o("Sale (+30d)", "Sale (+30d)"),
          o("General", "General"),
        ],
        list: true,
      }),
      f("status", "Status", "select", { options: [o("pending", "Pending", "amber"), o("done", "Done", "emerald"), o("cancelled", "Cancelled", "slate")], default: "pending", list: true }),
      f("notes", "Notes", "textarea", { list: true, full: true }),
    ],
    searchFields: ["notes", "result", "method"], titleField: "notes", dateField: "dueDate", statusField: "status", clientField: "clientId",
    sort: { field: "dueDate", dir: "asc" },
    overdue: { field: "dueDate", done: ["done", "cancelled"] },
    completeAction: { status: "done" },
    presets: {
      due: [{ field: "dueDate", op: "lte", value: "$today" }, { field: "status", op: "eq", value: "pending" }],
      pending: [{ field: "status", op: "eq", value: "pending" }],
    },
  },

  /* ───── Service ───── */
  service_all: serviceResource("all"),
  service_servicing: serviceResource("servicing"),
  service_maintenance: serviceResource("maintenance"),
  service_installation: serviceResource("installation"),
  service_general: serviceResource("general"),
  warranties: {
    key: "warranties", table: "warranties", label: "Warranty Tracking", singular: "Warranty", modules: ["service"],
    fields: [
      f("clientId", "Client", "ref", { ref: "clients", required: true, list: true }),
      f("product", "Product", "text", { required: true, list: true }),
      f("serialNumber", "Serial Number", "text", { list: true }),
      f("purchaseDate", "Purchase Date", "date", { list: true }),
      f("warrantyStart", "Warranty Start", "date", { list: true }),
      f("warrantyExpiry", "Warranty Expiry", "date", { required: true, list: true }),
      f("status", "Warranty Status", "select", { options: [o("active", "Active", "emerald"), o("expired", "Expired", "red"), o("claimed", "Claimed", "amber"), o("void", "Void", "slate")], default: "active", list: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["product", "serialNumber", "notes"], titleField: "product", dateField: "warrantyExpiry", statusField: "status", clientField: "clientId",
    sort: { field: "warrantyExpiry", dir: "asc" },
    presets: { expiring: [{ field: "warrantyExpiry", op: "gte", value: "$today" }, { field: "warrantyExpiry", op: "lte", value: "$today+30" }, { field: "status", op: "eq", value: "active" }] },
  },

  /* ───── Marketing ───── */
  campaigns: {
    key: "campaigns", table: "campaigns", label: "Campaigns", singular: "Campaign", modules: ["marketing"],
    fields: [
      f("name", "Campaign Name", "text", { required: true, list: true, full: true }),
      f("channel", "Channel", "select", { options: [o("facebook", "Facebook"), o("linkedin", "LinkedIn"), o("facebook_linkedin", "Facebook & LinkedIn"), o("email", "Email"), o("google_ads", "Google Ads"), o("offline", "Offline / Events")], list: true }),
      f("objective", "Objective", "text"),
      f("startDate", "Start Date", "date", { list: true }),
      f("endDate", "End Date", "date", { list: true }),
      f("budget", "Budget", "money", { required: true, default: 0, list: true }),
      f("spent", "Amount Spent", "money", { required: true, default: 0, list: true }),
      f("impressions", "Impressions", "number", { required: true, default: 0, sum: true }),
      f("clicks", "Clicks", "number", { required: true, default: 0, sum: true }),
      f("leads", "Leads Generated", "number", { required: true, default: 0, list: true, sum: true }),
      f("status", "Status", "select", { options: [o("planned", "Planned", "blue"), o("active", "Active", "emerald"), o("paused", "Paused", "amber"), o("completed", "Completed", "slate"), o("cancelled", "Cancelled", "red")], default: "planned", list: true }),
      f("assignedTo", "Assigned Team Member", "ref", { ref: "users" }),
      f("costPerLead", "Cost / Lead", "money", { virtual: true }),
      f("budgetUsed", "Budget Used %", "number", { virtual: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["name", "objective", "notes"], titleField: "name", dateField: "startDate", statusField: "status", categoryField: "channel", assigneeField: "assignedTo",
    sort: { field: "startDate", dir: "desc" },
    presets: { history: [{ field: "status", op: "in", value: ["completed", "cancelled"] }], active: [{ field: "status", op: "eq", value: "active" }] },
  },
  marketing_tasks: {
    key: "marketing_tasks", table: "marketing_tasks", label: "Marketing Tasks", singular: "Task", modules: ["marketing"],
    fields: [
      f("title", "Task Title", "text", { required: true, list: true, full: true }),
      f("campaignId", "Campaign", "ref", { ref: "campaigns", list: true }),
      f("assignedTo", "Assigned Team Member", "ref", { ref: "users", list: true }),
      f("dueDate", "Due Date", "date", { list: true }),
      f("priority", "Priority", "select", { options: PRIORITY, default: "normal", list: true }),
      f("status", "Status", "select", { options: taskStatus, default: "todo", list: true }),
      f("description", "Description", "textarea", { full: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["title", "description", "notes"], titleField: "title", dateField: "dueDate", statusField: "status", assigneeField: "assignedTo",
    sort: { field: "dueDate", dir: "asc" },
    overdue: { field: "dueDate", done: ["done", "cancelled"] },
    completeAction: { status: "done" },
  },
  social_posts: {
    key: "social_posts", table: "social_posts", label: "Content & Social Posts", singular: "Post", modules: ["marketing"],
    fields: [
      f("title", "Post Title", "text", { required: true, list: true, full: true }),
      f("platform", "Platform", "select", { options: [o("facebook", "Facebook", "blue"), o("linkedin", "LinkedIn", "cyan"), o("instagram", "Instagram", "purple"), o("youtube", "YouTube", "red"), o("x", "X / Twitter", "slate"), o("other", "Other", "slate")], default: "facebook", list: true }),
      f("campaignId", "Campaign", "ref", { ref: "campaigns", list: true }),
      f("scheduledDate", "Scheduled Date", "date", { list: true }),
      f("publishedDate", "Published Date", "date", { list: true }),
      f("status", "Post Status", "select", { options: [o("draft", "Draft", "slate"), o("scheduled", "Scheduled", "amber"), o("published", "Published", "emerald"), o("cancelled", "Cancelled", "red")], default: "draft", list: true }),
      f("assignedTo", "Assigned Team Member", "ref", { ref: "users", list: true }),
      f("postUrl", "Post URL", "text"),
      f("reach", "Reach", "number", { required: true, default: 0, sum: true }),
      f("engagement", "Engagement", "number", { required: true, default: 0, sum: true }),
      f("leads", "Leads", "number", { required: true, default: 0, sum: true }),
      f("content", "Content / Caption", "textarea", { full: true }),
    ],
    searchFields: ["title", "content", "postUrl"], titleField: "title", dateField: "scheduledDate", statusField: "status", categoryField: "platform", assigneeField: "assignedTo",
    sort: { field: "scheduledDate", dir: "desc" },
    presets: { published: [{ field: "status", op: "eq", value: "published" }], scheduled: [{ field: "status", op: "eq", value: "scheduled" }] },
  },

  /* ───── IT ───── */
  devices: {
    key: "devices", table: "devices", label: "Devices", singular: "Device", modules: ["it"],
    fields: [
      f("name", "Device Name", "text", { required: true, list: true }),
      f("type", "Device Type", "select", { options: ["Laptop", "Desktop", "Printer", "Server", "Network", "Phone", "UPS", "Other"].map((x) => o(x, x)), list: true }),
      f("brand", "Brand", "text", { list: true }),
      f("model", "Model", "text", { list: true }),
      f("serialNumber", "Serial Number", "text", { list: true }),
      f("assignedEmployee", "Assigned Employee", "text", { list: true }),
      f("department", "Department", "select", { options: ["Admin", "Sales", "Service", "Accounts & ERP", "Marketing", "IT", "Management", "Other"].map((x) => o(x, x)), list: true }),
      f("purchaseDate", "Purchase Date", "date"),
      f("warrantyExpiry", "Warranty Expiry", "date"),
      f("warrantyInfo", "Warranty Information", "text", { full: true }),
      f("status", "Device Status", "select", { options: [o("active", "Active", "emerald"), o("in_repair", "In Repair", "amber"), o("spare", "Spare", "blue"), o("retired", "Retired", "slate")], default: "active", list: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["name", "brand", "model", "serialNumber", "assignedEmployee"], titleField: "name", dateField: "purchaseDate", statusField: "status", categoryField: "type", departmentField: "department",
    sort: { field: "createdAt", dir: "desc" },
  },
  it_tickets: {
    key: "it_tickets", table: "it_tickets", label: "IT Tickets", singular: "Ticket", modules: ["it"],
    fields: [
      f("ticketNo", "Ticket No", "text", { readOnly: true, list: true, hideInForm: true }),
      f("subject", "Subject", "text", { required: true, list: true, full: true }),
      f("userName", "User Name", "text", { required: true, list: true }),
      f("department", "Department", "select", { options: ["Admin", "Sales", "Service", "Accounts & ERP", "Marketing", "IT", "Management", "Other"].map((x) => o(x, x)), list: true }),
      f("deviceId", "Device", "ref", { ref: "devices" }),
      f("deviceInfo", "Device Information", "text"),
      f("priority", "Priority", "select", { options: PRIORITY, default: "normal", list: true }),
      f("technicianId", "Assigned Technician", "ref", { ref: "users", list: true }),
      f("status", "Status", "select", { options: [o("open", "Open", "blue"), o("in_progress", "In Progress", "cyan"), o("pending", "Pending", "amber"), o("resolved", "Resolved", "emerald"), o("closed", "Closed", "slate")], default: "open", list: true }),
      f("issue", "Issue Description", "textarea", { required: true, full: true }),
      f("resolution", "Resolution Details", "textarea", { full: true }),
      f("completionDate", "Completion Date", "date", { list: true }),
    ],
    searchFields: ["ticketNo", "subject", "userName", "issue", "deviceInfo"], titleField: "subject", dateField: "createdAt", statusField: "status", departmentField: "department", assigneeField: "technicianId",
    sort: { field: "createdAt", dir: "desc" },
    completeAction: { status: "resolved", dateField: "completionDate" },
    presets: {
      pending: [{ field: "status", op: "in", value: ["open", "in_progress", "pending"] }],
      history: [{ field: "status", op: "in", value: ["resolved", "closed"] }],
      resolved: [{ field: "status", op: "in", value: ["resolved", "closed"] }],
    },
  },
  it_tasks: {
    key: "it_tasks", table: "it_tasks", label: "IT Work", singular: "IT Task", modules: ["it"],
    fields: [
      f("title", "Work Title", "text", { required: true, list: true, full: true }),
      f("assignedTo", "Assigned Technician", "ref", { ref: "users", list: true }),
      f("dueDate", "Due Date", "date", { list: true }),
      f("priority", "Priority", "select", { options: PRIORITY, default: "normal", list: true }),
      f("status", "Status", "select", { options: taskStatus, default: "todo", list: true }),
      f("description", "Description", "textarea", { full: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["title", "description", "notes"], titleField: "title", dateField: "dueDate", statusField: "status", assigneeField: "assignedTo",
    sort: { field: "dueDate", dir: "asc" },
    overdue: { field: "dueDate", done: ["done", "cancelled"] },
    completeAction: { status: "done" },
  },

  /* ───── ERP & Accounts ───── */
  invoices: {
    key: "invoices", table: "invoices", label: "Sales Invoices", singular: "Invoice", modules: ["erp"],
    fields: [
      f("invoiceNo", "Invoice No", "text", { list: true, placeholder: "Auto-generated if blank" }),
      f("clientId", "Customer", "ref", { ref: "clients", required: true, list: true }),
      f("issueDate", "Issue Date", "date", { required: true, list: true, default: "$today" }),
      f("dueDate", "Due Date", "date", { list: true }),
      f("subtotal", "Subtotal", "money", { required: true, min: 0.01, list: true }),
      f("tax", "Tax / VAT Amount", "money", { required: true, default: 0, list: true }),
      f("total", "Total", "money", { readOnly: true, hideInForm: true, list: true }),
      f("paidAmount", "Paid", "money", { virtual: true, list: true }),
      f("balance", "Balance", "money", { virtual: true, list: true }),
      f("status", "Status", "select", { options: [o("draft", "Draft", "slate"), o("issued", "Issued", "blue"), o("cancelled", "Cancelled", "red")], default: "issued", list: true }),
      f("paymentStatus", "Payment", "select", { virtual: true, list: true, options: [o("unpaid", "Unpaid", "amber"), o("partial", "Partial", "cyan"), o("paid", "Paid", "emerald"), o("overdue", "Overdue", "red")] }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["invoiceNo", "notes"], titleField: "invoiceNo", dateField: "issueDate", statusField: "status", clientField: "clientId",
    sort: { field: "issueDate", dir: "desc" },
  },
  purchases: {
    key: "purchases", table: "purchases", label: "Purchase Records", singular: "Purchase", modules: ["erp"],
    fields: [
      f("purchaseNo", "Purchase No", "text", { list: true, placeholder: "Auto-generated if blank" }),
      f("supplier", "Supplier", "text", { required: true, list: true }),
      f("purchaseDate", "Purchase Date", "date", { required: true, list: true, default: "$today" }),
      f("dueDate", "Due Date", "date", { list: true }),
      f("amount", "Amount", "money", { required: true, min: 0.01, list: true }),
      f("status", "Status", "select", { options: [o("pending", "Pending", "amber"), o("received", "Received", "blue"), o("paid", "Paid", "emerald"), o("cancelled", "Cancelled", "red")], default: "pending", list: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["purchaseNo", "supplier", "notes"], titleField: "purchaseNo", dateField: "purchaseDate", statusField: "status",
    sort: { field: "purchaseDate", dir: "desc" },
  },
  payments: {
    key: "payments", table: "payments", label: "Payments", singular: "Payment", modules: ["erp"],
    fields: [
      f("paymentNo", "Payment No", "text", { list: true, placeholder: "Auto-generated if blank" }),
      f("direction", "Direction", "select", { required: true, options: [o("received", "Received (from customer)", "emerald"), o("paid", "Paid (to supplier)", "amber")], default: "received", list: true }),
      f("clientId", "Customer", "ref", { ref: "clients", list: true }),
      f("invoiceId", "Invoice", "ref", { ref: "invoices" }),
      f("party", "Supplier / Party", "text", { list: true }),
      f("paymentDate", "Payment Date", "date", { required: true, list: true, default: "$today" }),
      f("amount", "Amount", "money", { required: true, min: 0.01, list: true }),
      f("method", "Method", "select", { options: PAY_METHODS, default: "bank", list: true }),
      f("reference", "Reference", "text"),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["paymentNo", "party", "reference", "notes"], titleField: "paymentNo", dateField: "paymentDate", categoryField: "direction", statusField: "method", clientField: "clientId",
    sort: { field: "paymentDate", dir: "desc" },
  },
  expenses: {
    key: "expenses", table: "expenses", label: "Expenses", singular: "Expense", modules: ["erp"],
    fields: [
      f("expenseDate", "Date", "date", { required: true, list: true, default: "$today" }),
      f("category", "Category", "select", { required: true, optionsKey: "erp.expenseCategories", options: [], list: true }),
      f("payee", "Payee", "text", { list: true }),
      f("amount", "Amount", "money", { required: true, min: 0.01, list: true }),
      f("method", "Method", "select", { options: PAY_METHODS, default: "cash", list: true }),
      f("reference", "Reference", "text", { list: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["payee", "reference", "notes", "category"], titleField: "category", dateField: "expenseDate", categoryField: "category", statusField: "method",
    sort: { field: "expenseDate", dir: "desc" },
  },
  incomes: {
    key: "incomes", table: "incomes", label: "Income", singular: "Income", modules: ["erp"],
    fields: [
      f("incomeDate", "Date", "date", { required: true, list: true, default: "$today" }),
      f("category", "Category", "select", { required: true, optionsKey: "erp.incomeCategories", options: [], list: true }),
      f("source", "Source", "text", { list: true }),
      f("amount", "Amount", "money", { required: true, min: 0.01, list: true }),
      f("method", "Method", "select", { options: PAY_METHODS, default: "bank", list: true }),
      f("reference", "Reference", "text", { list: true }),
      f("notes", "Notes", "textarea", { full: true }),
    ],
    searchFields: ["source", "reference", "notes", "category"], titleField: "category", dateField: "incomeDate", categoryField: "category", statusField: "method",
    sort: { field: "incomeDate", dir: "desc" },
  },
  ledger_entries: {
    key: "ledger_entries", table: "ledger_entries", label: "Accounts Ledger", singular: "Ledger Entry", modules: ["erp"],
    fields: [
      f("entryDate", "Date", "date", { required: true, list: true, default: "$today" }),
      f("account", "Account", "text", { required: true, list: true }),
      f("description", "Description", "text", { list: true, full: true }),
      f("debit", "Debit", "money", { required: true, default: 0, list: true }),
      f("credit", "Credit", "money", { required: true, default: 0, list: true }),
      f("refType", "Source", "text", { ...ledgerHidden, readOnly: true, list: true }),
    ],
    searchFields: ["account", "description", "refType"], titleField: "account", dateField: "entryDate", categoryField: "refType",
    sort: { field: "entryDate", dir: "desc" },
  },

  /* ───── Admin ───── */
  departments: {
    key: "departments", table: "departments", label: "Departments", singular: "Department", modules: ["admin"],
    fields: [
      f("code", "Code", "text", { required: true, list: true, readOnly: true }),
      f("name", "Department Name", "text", { required: true, list: true }),
      f("head", "Department Head", "text", { list: true }),
      f("active", "Active", "boolean", { default: true, list: true }),
      f("description", "Description", "textarea", { full: true }),
    ],
    searchFields: ["code", "name", "head"], titleField: "name", sort: { field: "id", dir: "asc" }, noCreate: true, noDelete: true,
  },
  audit_logs: {
    key: "audit_logs", table: "audit_logs", label: "Audit Logs", singular: "Log", modules: ["admin"],
    fields: [
      f("createdAt", "Time", "datetime", { list: true }),
      f("username", "User", "text", { list: true }),
      f("action", "Action", "text", { list: true }),
      f("module", "Module", "text", { list: true }),
      f("entity", "Entity", "text", { list: true }),
      f("entityId", "Entity ID", "text"),
      f("details", "Details", "text", { list: true, full: true }),
      f("ip", "IP", "text"),
    ],
    searchFields: ["username", "action", "module", "entity", "details"], titleField: "action", dateField: "createdAt", categoryField: "module",
    sort: { field: "createdAt", dir: "desc" }, readOnly: true,
  },
};

/* ───────── helpers ───────── */

export function getListFields(def: ResourceDef): FieldDef[] {
  return def.fields.filter((x) => x.list);
}

export function fieldOptions(field: FieldDef, settings: Record<string, string> = {}): Option[] {
  if (field.optionsKey && settings[field.optionsKey]) {
    return settings[field.optionsKey].split(",").map((s) => s.trim()).filter(Boolean).map((s) => ({ value: s, label: s }));
  }
  return field.options ?? [];
}

export function optionLabel(field: FieldDef, value: unknown, settings: Record<string, string> = {}): string {
  const v = String(value ?? "");
  const opt = fieldOptions(field, settings).find((x) => x.value === v);
  return opt?.label ?? v;
}

/* ───────── validation schema (shared by client + server) ───────── */

function fieldSchema(fd: FieldDef): z.ZodTypeAny {
  const emptyToNull = (v: unknown) => (v === "" || v === undefined || v === null ? null : v);
  const req = !!fd.required;
  switch (fd.type) {
    case "number":
    case "money": {
      const min = fd.min ?? 0;
      const base = z.number({ error: `${fd.label} must be a number` }).min(min, `${fd.label} must be at least ${min}`).max(1_000_000_000_000);
      return req
        ? z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), base)
        : z.preprocess((v) => (v === "" || v == null ? null : Number(v)), base.nullable());
    }
    case "ref": {
      if (fd.ref === "clients") {
        const base = z.string({ error: `${fd.label} is required` }).trim().min(1, `${fd.label} is required`);
        return req
          ? z.preprocess((v) => (v === "" || v == null ? undefined : String(v)), base)
          : z.preprocess((v) => (v === "" || v == null ? null : String(v)), base.nullable());
      }
      const base = z.number({ error: `${fd.label} is required` }).int().positive(`${fd.label} is required`);
      return req
        ? z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), base)
        : z.preprocess((v) => (v === "" || v == null ? null : Number(v)), base.nullable());
    }
    case "boolean":
      return z.boolean();
    case "files":
      return z.array(z.object({ name: z.string(), size: z.number(), type: z.string(), dataUrl: z.string().max(2_000_000) })).nullable().optional();
    case "date": {
      const base = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${fd.label} must be a valid date`);
      return req ? z.preprocess((v) => (v === "" ? undefined : v), base) : z.preprocess(emptyToNull, base.nullable());
    }
    case "email": {
      const base = z.string().trim().email(`${fd.label} must be a valid email`);
      return req ? base : z.preprocess(emptyToNull, base.nullable());
    }
    default: {
      let base: z.ZodTypeAny = z.string().trim().max(5000);
      if (req) return z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string({ error: `${fd.label} is required` }).trim().min(1, `${fd.label} is required`).max(5000));
      return z.preprocess(emptyToNull, (base = base).nullable());
    }
  }
}

export function formFields(def: ResourceDef): FieldDef[] {
  return def.fields.filter((x) => !x.virtual && !x.readOnly && !x.hideInForm);
}

export function buildSchema(def: ResourceDef, partial = false) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const fd of formFields(def)) {
    // fields only relevant to a category are optional when category-specific
    let s = fieldSchema(fd);
    if (fd.showFor && fd.required) s = s.optional();
    shape[fd.name] = s;
  }
  const obj = z.object(shape);
  return partial ? obj.partial() : obj;
}

export function defaultValues(def: ResourceDef, today: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const fd of formFields(def)) {
    if (fd.default === "$today") out[fd.name] = today;
    else if (fd.default !== undefined) out[fd.name] = fd.default;
    else if (fd.type === "boolean") out[fd.name] = false;
    else if (fd.type === "files") out[fd.name] = [];
    else out[fd.name] = "";
  }
  return out;
}
