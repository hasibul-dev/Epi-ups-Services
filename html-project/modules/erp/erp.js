// ERP & Accounts Department Module
window.Modules = window.Modules || {};

window.Modules.erp = async function (contentEl, subroute) {
  if (!subroute || subroute === "dashboard") {
    await renderErpDashboard(contentEl);
  } else if (subroute === "accounts") {
    await renderChartOfAccounts(contentEl);
  } else if (subroute === "invoices") {
    await renderInvoices(contentEl);
  } else if (subroute === "vouchers") {
    await renderVouchers(contentEl);
  } else if (subroute === "cash-bank") {
    await renderCashBank(contentEl);
  } else if (subroute === "ledger") {
    await renderLedger(contentEl);
  } else if (subroute === "customers") {
    await renderCustomers(contentEl);
  } else if (subroute === "suppliers") {
    await renderSuppliers(contentEl);
  } else if (subroute === "inventory") {
    await renderInventory(contentEl);
  } else if (subroute === "reports") {
    renderFinancialReports(contentEl);
  } else {
    await renderErpDashboard(contentEl);
  }
};

// Register individual route handlers
Router.register("erp", (el) => window.Modules.erp(el, "dashboard"));
Router.register("erp/accounts", (el) => window.Modules.erp(el, "accounts"));
Router.register("erp/invoices", (el) => window.Modules.erp(el, "invoices"));
Router.register("erp/vouchers", (el) => window.Modules.erp(el, "vouchers"));
Router.register("erp/cash-bank", (el) => window.Modules.erp(el, "cash-bank"));
Router.register("erp/ledger", (el) => window.Modules.erp(el, "ledger"));
Router.register("erp/customers", (el) => window.Modules.erp(el, "customers"));
Router.register("erp/suppliers", (el) => window.Modules.erp(el, "suppliers"));
Router.register("erp/inventory", (el) => window.Modules.erp(el, "inventory"));
Router.register("erp/reports", (el) => window.Modules.erp(el, "reports"));

/* ──────────────── 1. FINANCIAL DASHBOARD ──────────────── */
async function renderErpDashboard(container) {
  let data = { totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalReceivables: 0, totalPayables: 0, cashBalance: 0, bankBalance: 0 };
  try {
    data = await API.get("/erp/dashboard");
  } catch (e) {}

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Financial Dashboard</h1>
        <p class="page-subtitle">Real-time accounting summary, revenue, expenditures and cash positions.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary btn-sm" onclick="openCreateInvoiceModal()">+ New Invoice</button>
        <button class="btn btn-secondary btn-sm" onclick="Router.navigate('erp/reports')">View Balance Sheet</button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Total Revenue</span>
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">💰</div>
        </div>
        <div class="stat-value" style="color: #10b981;">${Utils.formatCurrency(data.totalRevenue)}</div>
        <span class="stat-desc">Year-to-date billed & collected</span>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Total Expenses</span>
          <div class="stat-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">📉</div>
        </div>
        <div class="stat-value" style="color: #ef4444;">${Utils.formatCurrency(data.totalExpenses)}</div>
        <span class="stat-desc">Operational & direct costs</span>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Net Profit / Loss</span>
          <div class="stat-icon" style="background: rgba(91, 141, 239, 0.15); color: #5b8def;">📊</div>
        </div>
        <div class="stat-value" style="color: ${data.netProfit >= 0 ? '#10b981' : '#ef4444'};">
          ${Utils.formatCurrency(data.netProfit)}
        </div>
        <span class="stat-desc">Operating margin indicator</span>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Cash & Bank Total</span>
          <div class="stat-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">🏦</div>
        </div>
        <div class="stat-value">${Utils.formatCurrency(data.cashBalance + data.bankBalance)}</div>
        <span class="stat-desc">Cash: ${Utils.formatCurrency(data.cashBalance)} | Bank: ${Utils.formatCurrency(data.bankBalance)}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4" style="margin-bottom: 2rem;">
      <div class="stat-card" style="border-left: 4px solid var(--accent);">
        <div class="stat-header">
          <span class="stat-label">Accounts Receivable</span>
          <span class="badge badge-warning">Customer Outstandings</span>
        </div>
        <div class="stat-value">${Utils.formatCurrency(data.totalReceivables)}</div>
        <span class="stat-desc">Expected incoming collections from issued invoices</span>
      </div>

      <div class="stat-card" style="border-left: 4px solid var(--danger);">
        <div class="stat-header">
          <span class="stat-label">Accounts Payable</span>
          <span class="badge badge-danger">Supplier Outstandings</span>
        </div>
        <div class="stat-value">${Utils.formatCurrency(data.totalPayables)}</div>
        <span class="stat-desc">Pending payables to component and battery vendors</span>
      </div>
    </div>

    <div id="erp-recent-invoices-table"></div>
  `;

  try {
    const invRes = await API.get("/erp/invoices");
    DataTable.render("erp-recent-invoices-table", {
      title: "Recent Sales Invoices",
      columns: [
        { header: "Invoice No", accessor: "invoice_no" },
        { header: "Client / Customer", accessor: "company_name" },
        { header: "Date", accessor: "issue_date", render: (v) => Utils.formatDate(v) },
        { header: "Total Amount", accessor: "total", render: (v) => Utils.formatCurrency(v) },
        {
          header: "Status",
          accessor: "status",
          render: (v) => v === "paid" ? `<span class="badge badge-success">Paid</span>` : `<span class="badge badge-warning">Issued</span>`
        }
      ],
      data: (invRes.invoices || []).slice(0, 5),
      searchable: false,
      exportable: false
    });
  } catch (e) {}
}

/* ──────────────── 2. CHART OF ACCOUNTS ──────────────── */
async function renderChartOfAccounts(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Chart of Accounts</h1>
        <p class="page-subtitle">Standard general ledger master covering Assets, Liabilities, Equity, Income, and Expenses.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openCreateAccountModal()">+ New Account</button>
    </div>
    <div id="accounts-table-container"></div>
  `;

  try {
    const res = await API.get("/erp/accounts");
    DataTable.render("accounts-table-container", {
      title: "Accounts Register",
      columns: [
        { header: "Code", accessor: "code" },
        { header: "Account Title", accessor: "name" },
        {
          header: "Type",
          accessor: "type",
          render: (v) => `<span class="badge badge-info">${Utils.escapeHtml(v)}</span>`
        },
        { header: "Category", accessor: "category" },
        { header: "Current Balance", accessor: "balance", render: (v) => Utils.formatCurrency(v) },
        { header: "Notes", accessor: "notes" }
      ],
      data: res.accounts || [],
      searchable: true,
      exportable: true
    });
  } catch (err) {
    container.innerHTML += `<div class="badge badge-danger">Failed to load accounts: ${err.message}</div>`;
  }
}

window.openCreateAccountModal = function() {
  const content = `
    <form id="create-acc-form">
      <div class="form-group">
        <label class="form-label">Account Code *</label>
        <input type="text" id="acc-code" class="form-control" placeholder="e.g. 1005" required />
      </div>
      <div class="form-group">
        <label class="form-label">Account Name *</label>
        <input type="text" id="acc-name" class="form-control" placeholder="e.g. Petty Cash Dhaka Office" required />
      </div>
      <div class="form-group">
        <label class="form-label">Account Type *</label>
        <select id="acc-type" class="form-select" required>
          <option value="Asset" selected>Asset</option>
          <option value="Liability">Liability</option>
          <option value="Equity">Equity</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <input type="text" id="acc-category" class="form-control" placeholder="e.g. Current Assets" />
      </div>
      <div class="form-group">
        <label class="form-label">Opening Balance</label>
        <input type="number" id="acc-balance" class="form-control" placeholder="0.00" value="0" />
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
    <button class="btn btn-primary" id="save-acc-btn">Create Account</button>
  `;

  Modal.open("Create New Ledger Account", content, footer);

  document.getElementById("save-acc-btn").onclick = async () => {
    const payload = {
      code: document.getElementById("acc-code").value.trim(),
      name: document.getElementById("acc-name").value.trim(),
      type: document.getElementById("acc-type").value,
      category: document.getElementById("acc-category").value.trim(),
      openingBalance: document.getElementById("acc-balance").value
    };

    if (!payload.code || !payload.name) {
      Toast.error("Code and Name are required.");
      return;
    }

    try {
      await API.post("/erp/accounts", payload);
      Toast.success("Account created successfully!");
      Modal.close();
      Router.navigate("erp/accounts");
    } catch (e) {
      Toast.error("Error: " + e.message);
    }
  };
};

/* ──────────────── 3. SALES INVOICES ──────────────── */
async function renderInvoices(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales Invoices</h1>
        <p class="page-subtitle">Commercial invoices, bills of supply, tax invoices and payment status.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openCreateInvoiceModal()">+ Issue Invoice</button>
    </div>
    <div id="invoices-table-container"></div>
  `;

  try {
    const res = await API.get("/erp/invoices");
    DataTable.render("invoices-table-container", {
      title: "Commercial Invoices",
      columns: [
        { header: "Invoice #", accessor: "invoice_no" },
        { header: "Customer / Client", accessor: "company_name" },
        { header: "Date", accessor: "issue_date", render: (v) => Utils.formatDate(v) },
        { header: "Subtotal", accessor: "subtotal", render: (v) => Utils.formatCurrency(v) },
        { header: "Tax (VAT)", accessor: "tax", render: (v) => Utils.formatCurrency(v) },
        { header: "Total Amount", accessor: "total", render: (v) => Utils.formatCurrency(v) },
        {
          header: "Status",
          accessor: "status",
          render: (v) => v === "paid" ? `<span class="badge badge-success">Paid</span>` : `<span class="badge badge-warning">Issued</span>`
        },
        {
          header: "Print",
          accessor: "id",
          render: (id, row) => `<button class="btn btn-secondary btn-sm" onclick="printInvoice(${id})">Print A4</button>`
        }
      ],
      data: res.invoices || [],
      searchable: true,
      exportable: true
    });
  } catch (err) {
    container.innerHTML += `<div class="badge badge-danger">Failed to load invoices: ${err.message}</div>`;
  }
}

window.openCreateInvoiceModal = async function() {
  let clients = [];
  try {
    const cRes = await API.get("/sales/clients");
    clients = cRes.clients || [];
  } catch (e) {}

  const content = `
    <form id="create-inv-form">
      <div class="form-group">
        <label class="form-label">Client / Customer *</label>
        <select id="inv-client" class="form-select" required>
          ${clients.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.company_name || c.name)}</option>`).join("")}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Subtotal Amount (৳) *</label>
          <input type="number" id="inv-subtotal" class="form-control" placeholder="150000" required />
        </div>
        <div class="form-group">
          <label class="form-label">VAT / Tax Amount (৳)</label>
          <input type="number" id="inv-tax" class="form-control" placeholder="0" value="0" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes & Payment Terms</label>
        <textarea id="inv-notes" class="form-textarea" placeholder="Payment within 30 days via Account Payee Cheque..."></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
    <button class="btn btn-primary" id="save-inv-btn">Generate & Issue Invoice</button>
  `;

  Modal.open("Issue Commercial Sales Invoice", content, footer);

  document.getElementById("save-inv-btn").onclick = async () => {
    const subtotal = Number(document.getElementById("inv-subtotal").value || 0);
    const tax = Number(document.getElementById("inv-tax").value || 0);
    const total = subtotal + tax;

    if (!subtotal) {
      Toast.error("Subtotal amount is required.");
      return;
    }

    const payload = {
      clientId: document.getElementById("inv-client").value,
      subtotal,
      tax,
      total,
      notes: document.getElementById("inv-notes").value.trim()
    };

    try {
      await API.post("/erp/invoices", payload);
      Toast.success("Invoice generated successfully!");
      Modal.close();
      Router.navigate("erp/invoices");
    } catch (e) {
      Toast.error("Failed to generate invoice: " + e.message);
    }
  };
};

window.printInvoice = function(id) {
  const printSheet = document.createElement("div");
  printSheet.className = "print-sheet";
  printSheet.innerHTML = `
    <div class="print-header">
      <div>
        <h1 style="font-size: 20pt; font-weight: bold; margin: 0;">EPI UPS (Bangladesh) Limited</h1>
        <p style="margin: 3px 0; font-size: 10pt;">Head Office: Dhaka, Bangladesh | Phone: +880 2-XXXXXXX</p>
        <p style="margin: 0; font-size: 9pt;">BIN / Tax Registration: 002918274-0101</p>
      </div>
      <div style="text-align: right;">
        <h2 style="font-size: 16pt; margin: 0; color: #333;">COMMERCIAL INVOICE</h2>
        <p style="margin: 3px 0;"><strong>Date:</strong> ${Utils.formatDate(Utils.today())}</p>
      </div>
    </div>

    <table class="print-table">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Description of Equipment / Service</th>
          <th>Qty</th>
          <th>Unit Price (৳)</th>
          <th>Total (৳)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>EPI Online 10kVA 3:1 UPS System with External Battery Bank</td>
          <td>1</td>
          <td>150,000.00</td>
          <td>150,000.00</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align: right; font-weight: bold;">Subtotal:</td>
          <td style="font-weight: bold;">৳ 150,000.00</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align: right; font-weight: bold;">Grand Total:</td>
          <td style="font-weight: bold;">৳ 150,000.00</td>
        </tr>
      </tfoot>
    </table>

    <div class="print-signatures">
      <div class="print-sign-box">Prepared By</div>
      <div class="print-sign-box">Verified By Accountant</div>
      <div class="print-sign-box">Approved Authority</div>
    </div>
  `;

  document.body.appendChild(printSheet);
  window.print();
  printSheet.remove();
};

/* ──────────────── 4. VOUCHERS & CASH BANK ──────────────── */
async function renderVouchers(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Journal & Vouchers</h1>
        <p class="page-subtitle">Double-entry accounting vouchers (Receipt, Payment, Journal, Contra).</p>
      </div>
    </div>
    <div id="vouchers-table-container"></div>
  `;

  try {
    const res = await API.get("/erp/vouchers");
    DataTable.render("vouchers-table-container", {
      title: "Vouchers List",
      columns: [
        { header: "Voucher #", accessor: "voucher_no" },
        { header: "Type", accessor: "voucher_type" },
        { header: "Date", accessor: "date", render: (v) => Utils.formatDate(v) },
        { header: "Amount", accessor: "total_amount", render: (v) => Utils.formatCurrency(v) },
        { header: "Description", accessor: "description" },
        { header: "Status", accessor: "status", render: (v) => `<span class="badge badge-success">${v || 'posted'}</span>` }
      ],
      data: res.vouchers || [],
      searchable: true,
      exportable: true
    });
  } catch (err) {
    container.innerHTML += `<div class="badge badge-danger">Failed to load vouchers: ${err.message}</div>`;
  }
}

async function renderCashBank(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Cash & Bank Accounts</h1>
        <p class="page-subtitle">Liquid funds, petty cash balances and corporate bank statements.</p>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="glass-card" style="padding: 1.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700;">Cash on Hand (Dhaka Office)</h3>
        <div style="font-size: 2rem; font-weight: 800; color: #10b981; margin: 1rem 0;">৳ 45,000.00</div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Vault & petty cash reserves.</p>
      </div>
      <div class="glass-card" style="padding: 1.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700;">Bank Account (Main Current A/C)</h3>
        <div style="font-size: 2rem; font-weight: 800; color: #5b8def; margin: 1rem 0;">৳ 385,000.00</div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Sonali Bank PLC / Dutch-Bangla Bank Ltd.</p>
      </div>
    </div>
  `;
}

/* ──────────────── 5. CUSTOMERS & SUPPLIERS ──────────────── */
async function renderCustomers(container) {
  container.innerHTML = `<div class="page-header"><div><h1 class="page-title">Customers Master</h1><p class="page-subtitle">Corporate debtors directory.</p></div></div><div id="erp-cust-table"></div>`;
  const res = await API.get("/erp/customers");
  DataTable.render("erp-cust-table", {
    title: "Customer Directory",
    columns: [
      { header: "Name", accessor: "name" },
      { header: "Company", accessor: "company_name" },
      { header: "Phone", accessor: "phone" },
      { header: "Category", accessor: "category" }
    ],
    data: res.customers || []
  });
}

async function renderSuppliers(container) {
  container.innerHTML = `<div class="page-header"><div><h1 class="page-title">Suppliers Master</h1><p class="page-subtitle">Component, raw material and battery vendors.</p></div></div><div id="erp-supp-table"></div>`;
  const res = await API.get("/erp/suppliers");
  DataTable.render("erp-supp-table", {
    title: "Supplier Directory",
    columns: [
      { header: "Name", accessor: "name" },
      { header: "Company", accessor: "company_name" },
      { header: "Phone", accessor: "phone" },
      { header: "BIN Number", accessor: "bin_number" }
    ],
    data: res.suppliers || []
  });
}

/* ──────────────── 6. INVENTORY ──────────────── */
async function renderInventory(container) {
  container.innerHTML = `<div class="page-header"><div><h1 class="page-title">Inventory Items</h1><p class="page-subtitle">Stock levels, spare parts, and UPS merchandise.</p></div></div><div id="erp-inv-table"></div>`;
  const res = await API.get("/erp/inventory");
  DataTable.render("erp-inv-table", {
    title: "Warehouse Inventory",
    columns: [
      { header: "Item Code", accessor: "code" },
      { header: "Item Name", accessor: "name" },
      { header: "Category", accessor: "category" },
      { header: "Unit Price", accessor: "sales_price", render: (v) => Utils.formatCurrency(v) },
      { header: "Current Stock", accessor: "current_stock", render: (v) => `${v || 0} Pcs` }
    ],
    data: res.items || []
  });
}

/* ──────────────── 7. FINANCIAL REPORTS ──────────────── */
function renderFinancialReports(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Financial Reports & Print</h1>
        <p class="page-subtitle">Formal financial statements complying with IFRS & Bangladesh Tax regulation.</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="Utils.printElement('statement-print')">Print A4 Report</button>
    </div>

    <div id="statement-print" class="glass-card" style="padding: 2.5rem; max-width: 850px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.75rem; font-weight: 800;">EPI UPS (BANGLADESH) LIMITED</h2>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--accent); margin-top: 0.25rem;">STATEMENT OF PROFIT OR LOSS</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">For the period ended ${Utils.formatDate(Utils.today())}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
        <tbody>
          <tr style="border-bottom: 1px solid var(--border); font-weight: 700;"><td style="padding: 0.75rem 0;">Sales Revenue (UPS & Power Equipment)</td><td style="text-align: right;">৳ 450,000.00</td></tr>
          <tr style="border-bottom: 1px solid var(--border); color: var(--danger);"><td style="padding: 0.75rem 0;">Less: Cost of Goods Sold (COGS)</td><td style="text-align: right;">(৳ 175,000.00)</td></tr>
          <tr style="border-bottom: 2px solid var(--border); font-weight: 800; background: var(--bg-surface-elevated);"><td style="padding: 0.75rem 0.5rem;">GROSS PROFIT</td><td style="text-align: right; padding-right: 0.5rem; color: var(--success);">৳ 275,000.00</td></tr>
          <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted);"><td style="padding: 0.75rem 0;">Administrative & Office Rent Expenses</td><td style="text-align: right;">(৳ 45,000.00)</td></tr>
          <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted);"><td style="padding: 0.75rem 0;">Employee Salaries & Allowances</td><td style="text-align: right;">(৳ 120,000.00)</td></tr>
          <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted);"><td style="padding: 0.75rem 0;">Utility & Maintenance Expenses</td><td style="text-align: right;">(৳ 10,000.00)</td></tr>
          <tr style="border-bottom: 2px solid var(--accent); font-weight: 800; font-size: 1.1rem; background: var(--accent-light);"><td style="padding: 1rem 0.5rem;">NET OPERATING PROFIT</td><td style="text-align: right; padding-right: 0.5rem; color: var(--accent);">৳ 100,000.00</td></tr>
        </tbody>
      </table>

      <div style="margin-top: 4rem; display: flex; justify-content: space-between; text-align: center; font-size: 0.85rem; color: var(--text-dim);">
        <div style="border-top: 1px solid var(--border); width: 150px; padding-top: 0.5rem;">Accountant</div>
        <div style="border-top: 1px solid var(--border); width: 150px; padding-top: 0.5rem;">Head of Accounts</div>
        <div style="border-top: 1px solid var(--border); width: 150px; padding-top: 0.5rem;">Managing Director</div>
      </div>
    </div>
  `;
}
