# EPI UPS Enterprise Management System

A full-stack, database-backed management platform for **EPI UPS (Bangladesh) Limited** covering
**Admin · Sales · Service · ERP / Accounts · Digital Marketing · IT Support** in one secure application.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router), TypeScript, Tailwind CSS v4 |
| Database / ORM | PostgreSQL via **Drizzle ORM** (`drizzle-kit` migrations in `./drizzle`) |
| Auth | Custom secure sessions: scrypt password hashes, httpOnly cookie, server-side session table (revocable), login throttling |
| Authorization | Role-based (RBAC) permission matrix stored in the DB and enforced **on the server** for every API call and page |
| Forms / validation | React Hook Form + Zod (the same Zod schema runs in the browser and on the server) |
| Charts | Recharts |
| Export | jsPDF + jspdf-autotable (PDF), SheetJS (Excel), browser A4 print layout |

> The brief suggested Prisma; this project runs on the platform's Drizzle + PostgreSQL toolchain instead. The relational design, migrations and layering are equivalent.

## Architecture

```
src/
  db/                 schema.ts (all tables) · index.ts (pool)
  lib/                client-safe shared code
    resource-config.ts  every entity: fields, validation, filters, presets (single source of truth)
    report-config.ts    all 32 reports
    nav.ts              sidebar + page registry per department
    export.ts           PDF / Excel builders
  server/             server-only services
    resources.ts        generic CRUD engine, computed columns, numbering, ledger auto-posting
    reports.ts · dashboards.ts · insights.ts (search, notifications, calendar)
    auth.ts · permissions.ts · audit.ts · backup.ts · bootstrap.ts · demo-seed.ts
  app/
    api/…               REST handlers (auth, r/[resource], reports, admin/*, search, notifications…)
    (app)/[dept]/[[...slug]]   one routed shell that renders every department page
  components/         DataTable, ResourceManager/Form, ReportCenter, PrintSheet, DashboardView, CalendarView, admin panels…
```

Key ideas: a **definition-driven resource engine** (one config per entity drives the form, table, filters, server
validation, permissions, audit log and reports) keeps all departments consistent; dashboards and reports are always
computed from real records.

## Local development

```bash
cp .env.example .env              # edit DATABASE_URL if needed
npm install
npx drizzle-kit push              # create/update tables directly (dev)
#   or apply the versioned migration:  npx drizzle-kit migrate
npm run dev                       # http://localhost:3000
```

On first start the app creates reference data (departments, role permissions, default settings) and **one Super
Administrator** (`ADMIN_USERNAME` / `ADMIN_PASSWORD`, default `admin` / `Admin@12345`). **Change this password immediately.**

### Database & migrations

* Schema: `src/db/schema.ts`. After changing it: `npx drizzle-kit generate --name <change>` then `npx drizzle-kit migrate`
  (or `npx drizzle-kit push` for quick local sync). The initial migration is `drizzle/0000_init.sql`.

### Optional demo data

Demo data is **never** loaded automatically. Two optional ways (both refuse to run when clients already exist):

```bash
npx tsx scripts/seed-demo.ts
```

or Admin → *Database Management* → **Load Demo Data**. Demo users (password `Demo@12345`): `sales.manager`, `sales.exec`,
`sabbir`, `tanvir`, `service.manager`, `accountant`, `marketing`, `it.support`, `auditor` (read-only). Remove them before go-live.

## Roles & access model

| Role | Scope |
| --- | --- |
| Super Administrator | Everything, including backup/restore, permission editing and demo seeding |
| Administrator | All departments, limited by the permission matrix (no Super-Admin-only tools) |
| Department Manager / Staff / Read-Only | **Own department only**, limited by the matrix (view / create / edit / delete / export) |

Edit the matrix at Admin → *Roles & Permissions*. Deactivating a user revokes their sessions immediately.
Password reset: users can request a link on the login page; because no mail transport is configured, the link is
written to the server log and administrators can issue a link (or set a password) from *User Management*.
Plug your mail provider into `src/app/api/auth/forgot/route.ts` to send it by email.

## Reports, print & export

Each department has a **Reports** page: pick a report → choose Monthly / Yearly / custom range / all time, client, status,
category, department → the table is searchable and sortable → **Print Preview**, **Print**, **PDF**, **Excel**.
A4 layout includes logo, company, department, title, generation date, period, serial numbers, totals, optional signature
block, repeating table headers, page numbers (*Page X of Y*) and footer; portrait or landscape. Every report prints on its own.
Note: PDF export uses a Latin font, so Bangla text in data is shown as `?` in PDFs (Excel and browser print are Unicode-safe); `৳` prints as `Tk`.

## ERP & Accounts

Invoices, purchases, payments (received / paid), expenses and other income **auto-post balanced double-entry ledger lines**
(edit/delete the source transaction to change them). Validation: positive amounts, payments cannot exceed the outstanding
invoice balance, invoices with payments cannot be cancelled or reduced below what was received, manual ledger entries need
exactly one of debit/credit. **No tax rules are hard-coded** — the tax/VAT amount is entered manually per invoice; a
reference rate is configurable in ERP Settings.

## Backup & restore

Admin → *Backup & Restore* (Super Administrator): create full JSON snapshots (SHA-256 checksum, table counts, history,
retention), download/export, **import** a file, **validate**, and restore. Restore requires typing `RESTORE`, validates
structure first, takes a *pre-restore* safety backup, runs in one transaction, and signs everyone out.
Scheduled backups: call `GET /api/cron/backup` with `Authorization: Bearer $CRON_SECRET`
(on Vercel add a cron in `vercel.json`: `{"crons":[{"path":"/api/cron/backup","schedule":"0 20 * * *"}]}` — Vercel sends the secret automatically when `CRON_SECRET` is set).

## Deploy on Vercel

1. Provision a PostgreSQL database (Neon / Supabase / Vercel Postgres) and copy its connection string.
2. Import the repo in Vercel; set env vars `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `APP_URL`, `CRON_SECRET`.
3. Run the migration once against the production database: `DATABASE_URL=… npx drizzle-kit migrate`.
4. Deploy. Open `/api/health` — it also bootstraps reference data and the first Super Administrator. Log in and change the password.

## Verification performed

Automated API-level checks (production build, real PostgreSQL) covered: login/logout/throttle, deactivated-account block, password
reset (single use), role/department permission enforcement (403s), user management rules, CRUD with validation, FK protection,
computed invoice balances, payment over-limit rejection, ledger balance (debits = credits), numbering, presets/overdue, all 32 reports,
global search, notifications, calendar, settings, backup create/validate/export/tamper-detection/restore (with and without
confirmation), and every navigation page returning HTTP 200. Print/PDF/Excel generation runs in the browser — please
spot-check them in your target browser (Chrome/Edge recommended for page-number margin boxes).
