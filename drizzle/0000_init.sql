CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"username" text,
	"action" text NOT NULL,
	"module" text,
	"entity" text,
	"entity_id" text,
	"details" text,
	"ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'manual' NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"checksum" text NOT NULL,
	"table_counts" jsonb NOT NULL,
	"payload" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"objective" text,
	"channel" text,
	"start_date" date,
	"end_date" date,
	"budget" numeric(14, 2) DEFAULT 0 NOT NULL,
	"spent" numeric(14, 2) DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"assigned_to" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"contact_person" text,
	"phone" text,
	"email" text,
	"address" text,
	"category" text,
	"salesperson_id" integer,
	"notes" text,
	"registration_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"head" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"brand" text,
	"model" text,
	"serial_number" text,
	"assigned_employee" text,
	"department" text,
	"purchase_date" date,
	"warranty_expiry" date,
	"warranty_info" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_date" date NOT NULL,
	"category" text NOT NULL,
	"payee" text,
	"amount" numeric(14, 2) NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"work_id" integer,
	"type" text DEFAULT 'call' NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"income_date" date NOT NULL,
	"category" text NOT NULL,
	"source" text,
	"amount" numeric(14, 2) NOT NULL,
	"method" text DEFAULT 'bank' NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_no" text NOT NULL,
	"client_id" integer NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"subtotal" numeric(14, 2) DEFAULT 0 NOT NULL,
	"tax" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total" numeric(14, 2) DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE "it_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" integer,
	"due_date" date,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "it_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_no" text NOT NULL,
	"subject" text NOT NULL,
	"user_name" text NOT NULL,
	"department" text,
	"device_id" integer,
	"device_info" text,
	"issue" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"technician_id" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"completion_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "it_tickets_ticket_no_unique" UNIQUE("ticket_no")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_date" date NOT NULL,
	"account" text NOT NULL,
	"description" text,
	"debit" numeric(14, 2) DEFAULT 0 NOT NULL,
	"credit" numeric(14, 2) DEFAULT 0 NOT NULL,
	"ref_type" text,
	"ref_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"campaign_id" integer,
	"assigned_to" integer,
	"due_date" date,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_no" text NOT NULL,
	"direction" text DEFAULT 'received' NOT NULL,
	"client_id" integer,
	"invoice_id" integer,
	"party" text,
	"payment_date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"method" text DEFAULT 'bank' NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_no_unique" UNIQUE("payment_no")
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_no" text NOT NULL,
	"supplier" text NOT NULL,
	"purchase_date" date NOT NULL,
	"due_date" date,
	"amount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_purchase_no_unique" UNIQUE("purchase_no")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"module" text NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_export" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_work" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"client_id" integer NOT NULL,
	"description" text,
	"category" text,
	"assigned_to" integer,
	"start_date" date,
	"due_date" date,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"follow_up_date" date,
	"notes" text,
	"attachments" jsonb,
	"completed_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_no" text,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"client_id" integer NOT NULL,
	"description" text,
	"ups_model" text,
	"serial_number" text,
	"equipment" text,
	"maintenance_type" text,
	"project_details" text,
	"capacity" text,
	"product_model" text,
	"location" text,
	"checklist" text,
	"testing_details" text,
	"commissioning_status" text,
	"technician_id" integer,
	"scheduled_date" date,
	"scheduled_time" text,
	"completed_date" date,
	"next_maintenance_date" date,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_agent" text,
	"ip" text,
	"expires_at" timestamp NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"platform" text DEFAULT 'facebook' NOT NULL,
	"content" text,
	"campaign_id" integer,
	"scheduled_date" date,
	"published_date" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"assigned_to" integer,
	"post_url" text,
	"reach" integer DEFAULT 0 NOT NULL,
	"engagement" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"department" text DEFAULT 'sales' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"product" text NOT NULL,
	"serial_number" text,
	"purchase_date" date,
	"warranty_start" date,
	"warranty_expiry" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_salesperson_id_users_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_work_id_sales_work_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."sales_work"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "it_tasks" ADD CONSTRAINT "it_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "it_tickets" ADD CONSTRAINT "it_tickets_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "it_tickets" ADD CONSTRAINT "it_tickets_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_tasks" ADD CONSTRAINT "marketing_tasks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_tasks" ADD CONSTRAINT "marketing_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_work" ADD CONSTRAINT "sales_work_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_work" ADD CONSTRAINT "sales_work_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ledger_ref_idx" ON "ledger_entries" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_module_uq" ON "role_permissions" USING btree ("role","module");--> statement-breakpoint
CREATE INDEX "service_cat_idx" ON "service_orders" USING btree ("category");--> statement-breakpoint
CREATE INDEX "service_date_idx" ON "service_orders" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");