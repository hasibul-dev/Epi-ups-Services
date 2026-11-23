import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" });
const ts = (name: string) => timestamp(name, { mode: "date" });
const d = (name: string) => date(name, { mode: "string" });
const createdAt = () => ts("created_at").defaultNow().notNull();
const updatedAt = () => ts("updated_at").defaultNow().notNull();

/* ───────────── Core / Admin ───────────── */

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  head: text("head"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"),
  department: text("department").notNull().default("sales"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: ts("last_login_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    ip: text("ip"),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").defaultNow().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    role: text("role").notNull(),
    module: text("module").notNull(),
    canView: boolean("can_view").notNull().default(false),
    canCreate: boolean("can_create").notNull().default(false),
    canEdit: boolean("can_edit").notNull().default(false),
    canDelete: boolean("can_delete").notNull().default(false),
    canExport: boolean("can_export").notNull().default(false),
  },
  (t) => [uniqueIndex("role_module_uq").on(t.role, t.module)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    username: text("username"),
    action: text("action").notNull(),
    module: text("module"),
    entity: text("entity"),
    entityId: text("entity_id"),
    details: text("details"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("manual"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  checksum: text("checksum").notNull(),
  tableCounts: jsonb("table_counts").$type<Record<string, number>>().notNull(),
  payload: text("payload").notNull(),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

/* ───────────── Sales ───────────── */

export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    companyName: text("company_name"),
    contactPerson: text("contact_person"),
    designation: text("designation"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    category: text("category"),
    salespersonId: integer("salesperson_id").references(() => users.id, { onDelete: "set null" }),
    creditLimit: money("credit_limit").default(0),
    paymentTerms: text("payment_terms").default("Net 30"),
    openingBalance: money("opening_balance").default(0),
    notes: text("notes"),
    registrationDate: d("registration_date"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("clients_name_idx").on(t.name)],
);

export const salesWork = pgTable("sales_work", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  description: text("description"),
  category: text("category"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  startDate: d("start_date"),
  dueDate: d("due_date"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("new"),
  followUpDate: d("follow_up_date"),
  notes: text("notes"),
  attachments: jsonb("attachments").$type<{ name: string; size: number; type: string; dataUrl: string }[]>(),
  completedAt: d("completed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  workId: integer("work_id").references(() => salesWork.id, { onDelete: "set null" }),
  type: text("type").notNull().default("call"),
  dueDate: d("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  result: text("result"),
  method: text("method"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────────── Service ───────────── */

export const serviceOrders = pgTable(
  "service_orders",
  {
    id: serial("id").primaryKey(),
    orderNo: text("order_no"),
    category: text("category").notNull(), // servicing | maintenance | installation | general
    title: text("title").notNull(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    description: text("description"),
    upsModel: text("ups_model"),
    serialNumber: text("serial_number"),
    equipment: text("equipment"),
    maintenanceType: text("maintenance_type"),
    projectDetails: text("project_details"),
    capacity: text("capacity"),
    productModel: text("product_model"),
    location: text("location"),
    checklist: text("checklist"),
    testingDetails: text("testing_details"),
    commissioningStatus: text("commissioning_status"),
    technicianId: integer("technician_id").references(() => users.id, { onDelete: "set null" }),
    scheduledDate: d("scheduled_date"),
    scheduledTime: text("scheduled_time"),
    completedDate: d("completed_date"),
    nextMaintenanceDate: d("next_maintenance_date"),
    priority: text("priority").notNull().default("normal"),
    status: text("status").notNull().default("scheduled"),
    remarks: text("remarks"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("service_cat_idx").on(t.category), index("service_date_idx").on(t.scheduledDate)],
);

export const warranties = pgTable("warranties", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  product: text("product").notNull(),
  serialNumber: text("serial_number"),
  purchaseDate: d("purchase_date"),
  warrantyStart: d("warranty_start"),
  warrantyExpiry: d("warranty_expiry").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────────── Marketing ───────────── */

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  objective: text("objective"),
  channel: text("channel"),
  startDate: d("start_date"),
  endDate: d("end_date"),
  budget: money("budget").notNull().default(0),
  spent: money("spent").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  leads: integer("leads").notNull().default(0),
  status: text("status").notNull().default("planned"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  result: text("result"),
  method: text("method"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const marketingTasks = pgTable("marketing_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: d("due_date"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("todo"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  platform: text("platform").notNull().default("facebook"),
  content: text("content"),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  scheduledDate: d("scheduled_date"),
  publishedDate: d("published_date"),
  status: text("status").notNull().default("draft"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  postUrl: text("post_url"),
  reach: integer("reach").notNull().default(0),
  engagement: integer("engagement").notNull().default(0),
  leads: integer("leads").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────────── IT Support ───────────── */

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  assignedEmployee: text("assigned_employee"),
  department: text("department"),
  purchaseDate: d("purchase_date"),
  warrantyExpiry: d("warranty_expiry"),
  warrantyInfo: text("warranty_info"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const itTickets = pgTable("it_tickets", {
  id: serial("id").primaryKey(),
  ticketNo: text("ticket_no").notNull().unique(),
  subject: text("subject").notNull(),
  userName: text("user_name").notNull(),
  department: text("department"),
  deviceId: integer("device_id").references(() => devices.id, { onDelete: "set null" }),
  deviceInfo: text("device_info"),
  issue: text("issue"),
  priority: text("priority").notNull().default("normal"),
  technicianId: integer("technician_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  completionDate: d("completion_date"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const itTasks = pgTable("it_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: d("due_date"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("todo"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────────── ERP / Accounts ───────────── */

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // asset | liability | equity | income | expense
  category: text("category").notNull(),
  parentId: integer("parent_id"),
  openingBalance: money("opening_balance").default(0),
  balance: money("balance").default(0),
  bankAccountNumber: text("bank_account_number"),
  bankBranch: text("bank_branch"),
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  voucherNo: text("voucher_no").notNull().unique(),
  voucherType: text("voucher_type").notNull(), // journal | payment | receipt | contra | adjustment
  date: d("date").notNull(),
  reference: text("reference"),
  description: text("description"),
  totalAmount: money("total_amount").notNull().default(0),
  status: text("status").notNull().default("posted"), // draft | posted | cancelled
  lines: jsonb("lines").$type<{
    accountId?: number;
    accountCode: string;
    accountName: string;
    description?: string;
    debit: number;
    credit: number;
  }[]>(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  postedAt: d("posted_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  binNumber: text("bin_number"),
  openingBalance: money("opening_balance").default(0),
  paymentTerms: text("payment_terms").default("Net 30"),
  payableBalance: money("payable_balance").default(0),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // SKU
  name: text("name").notNull(),
  category: text("category").notNull().default("General"),
  unit: text("unit").notNull().default("Pcs"),
  purchasePrice: money("purchase_price").default(0),
  salesPrice: money("sales_price").default(0),
  openingStock: integer("opening_stock").default(0),
  currentStock: integer("current_stock").default(0),
  minStockAlert: integer("min_stock_alert").default(5),
  vatRate: money("vat_rate").default(15),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // stock_in | stock_out | adjustment | opening
  date: d("date").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: money("unit_cost").default(0),
  refType: text("ref_type"),
  refId: integer("ref_id"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code"),
  name: text("name").notNull(),
  designation: text("designation"),
  department: text("department").default("General"),
  basicSalary: money("basic_salary").default(0),
  houseRent: money("house_rent").default(0),
  medicalAllowance: money("medical_allowance").default(0),
  conveyance: money("conveyance").default(0),
  otherAllowances: money("other_allowances").default(0),
  deductions: money("deductions").default(0),
  netSalary: money("net_salary").default(0),
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  status: text("status").default("active"),
  joinedDate: d("joined_date"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  basicSalary: money("basic_salary").notNull(),
  allowances: money("allowances").notNull().default(0),
  deductions: money("deductions").notNull().default(0),
  netSalary: money("net_salary").notNull(),
  paymentDate: d("payment_date"),
  paymentMethod: text("payment_method").default("bank"),
  voucherId: integer("voucher_id"),
  status: text("status").default("paid"),
  createdAt: createdAt(),
});

export const fixedAssets = pgTable("fixed_assets", {
  id: serial("id").primaryKey(),
  assetCode: text("asset_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  purchaseDate: d("purchase_date").notNull(),
  purchaseCost: money("purchase_cost").notNull(),
  usefulLifeYears: integer("useful_life_years").notNull().default(5),
  depreciationMethod: text("depreciation_method").notNull().default("straight_line"),
  salvageValue: money("salvage_value").default(0),
  accumulatedDepreciation: money("accumulated_depreciation").default(0),
  currentBookValue: money("current_book_value").notNull(),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  issueDate: d("issue_date").notNull(),
  dueDate: d("due_date"),
  subtotal: money("subtotal").notNull().default(0),
  tax: money("tax").notNull().default(0),
  discount: money("discount").default(0),
  vatRate: money("vat_rate").default(15),
  total: money("total").notNull().default(0),
  paidAmount: money("paid_amount").default(0),
  items: jsonb("items").$type<{
    code?: string;
    name: string;
    qty: number;
    unitPrice: number;
    discount?: number;
    vatRate?: number;
    total: number;
  }[]>(),
  mushakNo: text("mushak_no"),
  status: text("status").notNull().default("issued"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseNo: text("purchase_no").notNull().unique(),
  supplier: text("supplier").notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  purchaseDate: d("purchase_date").notNull(),
  dueDate: d("due_date"),
  subtotal: money("subtotal").notNull().default(0),
  tax: money("tax").notNull().default(0),
  discount: money("discount").default(0),
  amount: money("amount").notNull().default(0),
  paidAmount: money("paid_amount").default(0),
  items: jsonb("items").$type<{
    code?: string;
    name: string;
    qty: number;
    unitCost: number;
    discount?: number;
    vatRate?: number;
    total: number;
  }[]>(),
  billNo: text("bill_no"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentNo: text("payment_no").notNull().unique(),
  direction: text("direction").notNull().default("received"), // received | paid
  clientId: integer("client_id").references(() => clients.id, { onDelete: "restrict" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "restrict" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  purchaseId: integer("purchase_id").references(() => purchases.id, { onDelete: "set null" }),
  category: text("category"),
  party: text("party"),
  paymentDate: d("payment_date").notNull(),
  amount: money("amount").notNull(),
  method: text("method").notNull().default("bank"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseDate: d("expense_date").notNull(),
  category: text("category").notNull(),
  payee: text("payee"),
  amount: money("amount").notNull(),
  method: text("method").notNull().default("cash"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  incomeDate: d("income_date").notNull(),
  category: text("category").notNull(),
  source: text("source"),
  amount: money("amount").notNull(),
  method: text("method").notNull().default("bank"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: serial("id").primaryKey(),
    entryDate: d("entry_date").notNull(),
    account: text("account").notNull(),
    description: text("description"),
    debit: money("debit").notNull().default(0),
    credit: money("credit").notNull().default(0),
    voucherNo: text("voucher_no"),
    voucherType: text("voucher_type"),
    partyType: text("party_type"),
    partyId: integer("party_id"),
    isPosted: boolean("is_posted").default(true),
    refType: text("ref_type"),
    refId: integer("ref_id"),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_ref_idx").on(t.refType, t.refId)],
);
