# EPI UPS Enterprise Management System — HTML Project Edition

A complete, professional, traditional HTML/CSS/JS enterprise management system for **EPI UPS (Bangladesh) Limited**.

---

## 1. Project Directory Structure

```
html-project/
├── index.html              # Main application entry point
├── assets/                 # Company logo and brand assets
│   └── logo.svg
├── css/                    # Modular stylesheets
│   ├── main.css            # Dark/light theme tokens, typography, glassmorphism
│   ├── layout.css          # Top navigation, sidebar, responsive layout
│   ├── components.css      # Buttons, forms, modals, data tables, badges, toasts
│   └── print.css           # A4 printable invoices, vouchers and reports
├── js/                     # Application logic & engine
│   ├── app.js              # Bootstrapper
│   ├── router.js           # Client-side hash routing engine
│   ├── store.js            # State store & persistence
│   ├── api.js              # API client
│   └── utils.js            # Currency, date formatting, CSV/Excel export
├── components/             # Reusable UI components
│   ├── header.js           # Topbar with department switcher
│   ├── sidebar.js          # Department navigation sidebar
│   ├── datatable.js        # Interactive sorting, searching & paginated table
│   ├── modal.js            # Universal popup modal system
│   └── toast.js            # Alert notification system
├── pages/                  # Top-level standalone views
│   └── login.js            # Sign-in page with validation
├── modules/                # All ERP departments
│   ├── sales/sales.js      # Clients, 2-column Add Client, Follow-ups (+3d,+10d,+7d,+30d)
│   ├── service/service.js  # Servicing, Maintenance, Installation, Warranties
│   ├── erp/erp.js          # Financial Dashboard, Chart of Accounts, Invoices, Vouchers
│   ├── marketing/marketing.js # Campaigns, Leads, Social Posts
│   ├── it/it.js            # Helpdesk, Hardware Register, Tickets
│   └── admin/admin.js      # RBAC, System Settings, Audit Logs
├── database/               # Database integration
│   ├── db.js               # PostgreSQL connection pool with cloud SSL auto-detect
│   └── schema.sql          # 33-table PostgreSQL schema
├── api/                    # Backend API integration
│   └── server.js           # Lightweight Node.js server (zero external dependencies)
├── config/                 # Application configuration
│   └── app.config.js       # Department registry, currency, rules
└── package.json            # Run scripts
```

---

## 2. Preserved Features Across Departments

- **Authentication:** Sign-in screen with username/password, default credentials `admin` / `Admin@12345`.
- **Department Navigation:** Unified top header tabs allowing instantaneous switching between **Sales**, **Service**, **ERP & Accounts**, **Marketing**, **IT Support**, and **Administration**.
- **Sales Module:**
  - **Clients Master:** Searchable client table with CSV export.
  - **Add Client:** 2-column layout matching reference. Automatically calculates First Follow-up Date based on category:
    - Potential → +3 days
    - No Potential → +10 days
    - Quotation → +7 days
    - Sale → +30 days
  - **Follow-ups:** With **Next Result** and **Method** dropdowns. Clicking Complete marks record done and automatically schedules next follow-up.
  - **Today's Work:** Actionable items for the current date.
  - **Daily Summary:** Visual metrics and print-friendly daily log.
- **ERP & Accounting:**
  - **Financial Dashboard:** Revenue, Expenses, Net Profit/Loss, Receivables, Payables, Cash & Bank balances.
  - **Chart of Accounts:** Assets, Liabilities, Equity, Income, Expenses with Add Account modal.
  - **Sales Invoices:** Commercial invoice issue modal and A4 print layout.
  - **Journal & Vouchers:** Double-entry journal vouchers.
  - **Financial Statements:** Formal Profit & Loss Statement with print layout.
- **Service & Support:**
  - Work order tracking for Servicing, Preventive Maintenance, and Installation.
  - Warranty management.
- **Digital Marketing & IT Support:**
  - Campaigns, leads, reach, tickets, and internal equipment registry.
- **Administration:**
  - System users, roles, audit trails, and database backups.

---

## 3. How to Run Locally

### Option A: Complete Full-Stack (Frontend + Backend API + PostgreSQL)
```bash
# From html-project directory
node api/server.js
```
Open **`http://localhost:4000`** in any web browser.

### Option B: Any Static Web Server
Since `index.html` is a traditional HTML entry point, you can also serve it with:
```bash
npx serve html-project
# or
python -m http.server 4000
```

---

## 4. Hosting & Deployment

- **Vercel / Netlify:** Can be deployed as a static site or Node.js server.
- **Traditional Shared Hosting / cPanel:** Upload the `html-project` files directly into `public_html`.
- **VPS / Docker / Cloud:** Run `node api/server.js` using PM2 or Docker container.
