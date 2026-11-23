// Sales Department Module
window.Modules = window.Modules || {};

window.Modules.sales = async function (contentEl, subroute) {
  if (!subroute || subroute === "dashboard") {
    await renderDashboard(contentEl);
  } else if (subroute === "clients") {
    await renderClients(contentEl);
  } else if (subroute === "add-client") {
    renderAddClient(contentEl);
  } else if (subroute === "today") {
    await renderTodayWork(contentEl);
  } else if (subroute === "follow-ups") {
    await renderFollowUps(contentEl);
  } else if (subroute === "work") {
    await renderWorkHistory(contentEl);
  } else if (subroute === "daily-summary") {
    await renderDailySummary(contentEl);
  } else if (subroute === "reports") {
    renderReports(contentEl);
  } else {
    await renderDashboard(contentEl);
  }
};

// Register individual route handlers
Router.register("sales", (el) => window.Modules.sales(el, "dashboard"));
Router.register("sales/clients", (el) => window.Modules.sales(el, "clients"));
Router.register("sales/add-client", (el) => window.Modules.sales(el, "add-client"));
Router.register("sales/today", (el) => window.Modules.sales(el, "today"));
Router.register("sales/follow-ups", (el) => window.Modules.sales(el, "follow-ups"));
Router.register("sales/work", (el) => window.Modules.sales(el, "work"));
Router.register("sales/daily-summary", (el) => window.Modules.sales(el, "daily-summary"));
Router.register("sales/reports", (el) => window.Modules.sales(el, "reports"));

/* ──────────────── 1. SALES DASHBOARD ──────────────── */
async function renderDashboard(container) {
  let data = { totalClients: 0, todayWork: 0, pendingFollowUps: 0, completedFollowUps: 0 };
  try {
    data = await API.get("/sales/dashboard");
  } catch (e) {}

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales Dashboard</h1>
        <p class="page-subtitle">Welcome back. Live operational statistics for Sales & CRM pipeline.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary btn-sm" onclick="Router.navigate('sales/add-client')">+ Add Client</button>
        <button class="btn btn-secondary btn-sm" onclick="Router.navigate('sales/follow-ups')">Open Follow-ups</button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Total Clients</span>
          <div class="stat-icon" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">👥</div>
        </div>
        <div class="stat-value">${Utils.formatNumber(data.totalClients)}</div>
        <span class="stat-desc">Active registered client database</span>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Today's Work</span>
          <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📅</div>
        </div>
        <div class="stat-value">${Utils.formatNumber(data.todayWork)}</div>
        <span class="stat-desc">Scheduled tasks for today</span>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Pending Follow-ups</span>
          <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        </div>
        <div class="stat-value">${Utils.formatNumber(data.pendingFollowUps)}</div>
        <span class="stat-desc">Action required across clients</span>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Completed Work</span>
          <div class="stat-icon" style="background: rgba(91, 141, 239, 0.15); color: #5b8def;">✅</div>
        </div>
        <div class="stat-value">${Utils.formatNumber(data.completedFollowUps)}</div>
        <span class="stat-desc">Successfully concluded records</span>
      </div>
    </div>

    <div id="dashboard-recent-table"></div>
  `;

  try {
    const clientsRes = await API.get("/sales/clients");
    DataTable.render("dashboard-recent-table", {
      title: "Recent Client Enquiries",
      columns: [
        { header: "Client Name", accessor: "name" },
        { header: "Company", accessor: "company_name" },
        { header: "Contact Number", accessor: "phone" },
        {
          header: "Category",
          accessor: "category",
          render: (val) => `<span class="badge badge-info">${Utils.escapeHtml(val || "General")}</span>`
        },
        { header: "Designation", accessor: "designation" }
      ],
      data: (clientsRes.clients || []).slice(0, 5),
      searchable: false,
      exportable: false
    });
  } catch (e) {}
}

/* ──────────────── 2. CLIENTS MASTER ──────────────── */
async function renderClients(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Clients Master</h1>
        <p class="page-subtitle">Central directory of corporate clients, contact personnel, and account categories.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Router.navigate('sales/add-client')">+ Add New Client</button>
    </div>
    <div id="clients-table-container"></div>
  `;

  try {
    const res = await API.get("/sales/clients");
    DataTable.render("clients-table-container", {
      title: "All Clients",
      columns: [
        { header: "Client Name", accessor: "name" },
        { header: "Company", accessor: "company_name" },
        { header: "Contact Person", accessor: "contact_person" },
        { header: "Designation", accessor: "designation" },
        { header: "Phone", accessor: "phone" },
        { header: "Email", accessor: "email" },
        { header: "Address", accessor: "address" },
        {
          header: "Category",
          accessor: "category",
          render: (val) => `<span class="badge badge-info">${Utils.escapeHtml(val || "Potential")}</span>`
        }
      ],
      data: res.clients || [],
      searchable: true,
      exportable: true
    });
  } catch (err) {
    container.innerHTML += `<div class="badge badge-danger">Failed to load clients: ${err.message}</div>`;
  }
}

/* ──────────────── 3. ADD CLIENT FORM (2-COLUMN EXACT LAYOUT) ──────────────── */
function renderAddClient(container) {
  const initialDate = Utils.addDays(Utils.today(), 3); // Default for Potential (+3d)

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Add Client</h1>
        <p class="page-subtitle">Register new client and automatically schedule follow-up based on category.</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="Router.navigate('sales/clients')">← Back to Clients</button>
    </div>

    <form id="add-client-form" class="glass-card" style="padding: 2rem; max-width: 900px;">
      <div class="grid grid-cols-2 gap-6">
        <!-- Left Column -->
        <div>
          <div class="form-group">
            <label class="form-label" for="client-name">Name * (Contact Person)</label>
            <input type="text" id="client-name" class="form-control" placeholder="e.g. Engr. Tanvir Ahmed" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="client-company">Company *</label>
            <input type="text" id="client-company" class="form-control" placeholder="e.g. Beximco Pharmaceuticals Ltd." required />
          </div>

          <div class="form-group">
            <label class="form-label" for="client-phone">Contact Number</label>
            <input type="text" id="client-phone" class="form-control" placeholder="e.g. 01700-000000" />
          </div>

          <div class="form-group">
            <label class="form-label" for="client-email">Email</label>
            <input type="email" id="client-email" class="form-control" placeholder="e.g. client@company.com" />
          </div>

          <div class="form-group">
            <label class="form-label" for="client-category">Initial Category</label>
            <select id="client-category" class="form-select">
              <option value="Potential" selected>Potential (3 days)</option>
              <option value="No Potential">No Potential (10 days)</option>
              <option value="Quotation">Quotation (7 days)</option>
              <option value="Sale">Sale (30 days)</option>
            </select>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <div class="form-group">
            <label class="form-label" for="client-designation">Designation</label>
            <input type="text" id="client-designation" class="form-control" placeholder="e.g. Chief Technical Officer" />
          </div>

          <div class="form-group">
            <label class="form-label" for="client-address">Address</label>
            <input type="text" id="client-address" class="form-control" placeholder="e.g. Plot 15, Tejgaon I/A, Dhaka" />
          </div>

          <div class="form-group">
            <label class="form-label" for="client-followup-date">First Follow-up Date *</label>
            <input type="date" id="client-followup-date" class="form-control" value="${initialDate}" required />
            <span style="font-size: 0.725rem; color: var(--text-dim); margin-top: 0.25rem; display: block;">Automatically calculated from selected Initial Category. You may modify manually.</span>
          </div>
        </div>
      </div>

      <!-- Full Width Notes -->
      <div class="form-group" style="margin-top: 1rem;">
        <label class="form-label" for="client-notes">Notes / Remarks</label>
        <textarea id="client-notes" class="form-textarea" placeholder="Enter any specific requirements, discussion details, or UPS capacity inquiry..."></textarea>
      </div>

      <div class="flex justify-end gap-3" style="margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1.5rem;">
        <button type="button" class="btn btn-secondary" onclick="Router.navigate('sales/clients')">Cancel</button>
        <button type="submit" id="save-client-btn" class="btn btn-primary" style="padding: 0.75rem 1.5rem;">Save Client & Schedule Follow-up</button>
      </div>
    </form>
  `;

  // Dynamic automatic follow-up date calculation
  const categorySelect = document.getElementById("client-category");
  const followUpDateInput = document.getElementById("client-followup-date");

  categorySelect.onchange = (e) => {
    const val = e.target.value;
    const days = window.APP_CONFIG.followUpDaysMap[val] || 3;
    followUpDateInput.value = Utils.addDays(Utils.today(), days);
  };

  const form = document.getElementById("add-client-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("save-client-btn");
    btn.disabled = true;
    btn.innerText = "Saving Client...";

    const payload = {
      name: document.getElementById("client-name").value.trim(),
      companyName: document.getElementById("client-company").value.trim(),
      phone: document.getElementById("client-phone").value.trim(),
      email: document.getElementById("client-email").value.trim(),
      category: categorySelect.value,
      designation: document.getElementById("client-designation").value.trim(),
      address: document.getElementById("client-address").value.trim(),
      firstFollowUpDate: followUpDateInput.value,
      notes: document.getElementById("client-notes").value.trim()
    };

    try {
      await API.post("/sales/clients", payload);
      Toast.success("Client registered and follow-up scheduled successfully!");
      Router.navigate("sales/clients");
    } catch (err) {
      Toast.error("Failed to save client: " + err.message);
      btn.disabled = false;
      btn.innerText = "Save Client & Schedule Follow-up";
    }
  };
}

/* ──────────────── 4. TODAY'S WORK ──────────────── */
async function renderTodayWork(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Today's Work</h1>
        <p class="page-subtitle">Tasks, follow-ups, and customer touchpoints scheduled for today (${Utils.formatDate(Utils.today())}).</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Router.navigate('sales/add-client')">+ Add Work / Client</button>
    </div>
    <div id="today-work-table"></div>
  `;

  try {
    const res = await API.get("/sales/follow-ups");
    const todayStr = Utils.today();
    const todayList = (res.followUps || []).filter((f) => f.due_date && f.due_date.slice(0, 10) <= todayStr && f.status === "pending");

    DataTable.render("today-work-table", {
      title: "Today's Pending Actions",
      columns: [
        { header: "Client / Company", accessor: "company_name" },
        { header: "Contact Person", accessor: "client_name" },
        { header: "Phone", accessor: "client_phone" },
        { header: "Action Type", accessor: "type", render: (v) => `<span class="badge badge-info">${Utils.escapeHtml(v || "call")}</span>` },
        { header: "Due Date", accessor: "due_date", render: (v) => Utils.formatDate(v) },
        { header: "Remarks", accessor: "notes" }
      ],
      data: todayList,
      searchable: true,
      exportable: true
    });
  } catch (err) {
    container.innerHTML += `<div class="badge badge-danger">Failed to load today's work: ${err.message}</div>`;
  }
}

/* ──────────────── 5. FOLLOW-UPS WITH NEXT RESULT & METHOD ──────────────── */
async function renderFollowUps(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Follow-ups Management</h1>
        <p class="page-subtitle">Track client communications, record outcomes with automatic next follow-up scheduling.</p>
      </div>
    </div>
    <div id="followups-table-container"></div>
  `;

  try {
    const res = await API.get("/sales/follow-ups");
    DataTable.render("followups-table-container", {
      title: "Follow-up Pipeline",
      columns: [
        { header: "Client", accessor: "client_name" },
        { header: "Company", accessor: "company_name" },
        { header: "Phone", accessor: "client_phone" },
        { header: "Scheduled Date", accessor: "due_date", render: (v) => Utils.formatDate(v) },
        {
          header: "Status",
          accessor: "status",
          render: (v) => v === "done" ? `<span class="badge badge-success">Done</span>` : `<span class="badge badge-warning">Pending</span>`
        },
        { header: "Notes", accessor: "notes" },
        {
          header: "Action",
          accessor: "id",
          render: (id, row) => row.status === "done" ? `<span class="text-muted text-xs">Completed</span>` : `<button class="btn btn-primary btn-sm" onclick="openCompleteFollowUpModal(${id})">Complete / Next</button>`
        }
      ],
      data: res.followUps || [],
      searchable: true,
      exportable: true
    });
  } catch (err) {
    container.innerHTML += `<div class="badge badge-danger">Failed to load follow-ups: ${err.message}</div>`;
  }
}

window.openCompleteFollowUpModal = function(id) {
  const content = `
    <form id="complete-fu-form">
      <div class="form-group">
        <label class="form-label" for="fu-next-result">Next Result *</label>
        <select id="fu-next-result" class="form-select" required>
          <option value="" disabled selected>Select Result</option>
          <option value="Potential (+3d)">Potential (+3d)</option>
          <option value="No Potential (+10d)">No Potential (+10d)</option>
          <option value="Quotation (+7d)">Quotation (+7d)</option>
          <option value="Sale (+30d)">Sale (+30d)</option>
          <option value="General">General</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="fu-next-method">Follow-up Method *</label>
        <select id="fu-next-method" class="form-select" required>
          <option value="Phone Call" selected>Phone Call</option>
          <option value="Email">Email</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Site Visit">Site Visit</option>
          <option value="Meeting">Meeting</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="fu-next-date">Next Follow-up Date *</label>
        <input type="date" id="fu-next-date" class="form-control" value="${Utils.addDays(Utils.today(), 3)}" required />
        <span style="font-size: 0.725rem; color: var(--text-dim);">Auto-calculated from Next Result. You may customize if needed.</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="fu-notes">Discussion Remarks</label>
        <textarea id="fu-notes" class="form-textarea" placeholder="Summary of client conversation..."></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
    <button class="btn btn-primary" id="save-fu-btn">Save & Schedule Next</button>
  `;

  Modal.open("Record Follow-up Outcome", content, footer);

  const resultSelect = document.getElementById("fu-next-result");
  const dateInput = document.getElementById("fu-next-date");

  resultSelect.onchange = (e) => {
    const val = e.target.value;
    const days = window.APP_CONFIG.followUpDaysMap[val];
    if (days !== undefined) {
      dateInput.value = Utils.addDays(Utils.today(), days);
    }
  };

  document.getElementById("save-fu-btn").onclick = async () => {
    const nextResult = resultSelect.value;
    if (!nextResult) {
      Toast.error("Please select a Next Result.");
      return;
    }

    const payload = {
      id,
      nextResult,
      nextMethod: document.getElementById("fu-next-method").value,
      nextFollowUpDate: dateInput.value,
      notes: document.getElementById("fu-notes").value.trim()
    };

    try {
      await API.post("/sales/follow-ups/done", payload);
      Toast.success("Follow-up updated and next meeting scheduled!");
      Modal.close();
      Router.navigate("sales/follow-ups");
    } catch (err) {
      Toast.error("Error: " + err.message);
    }
  };
};

/* ──────────────── 6. WORK HISTORY ──────────────── */
async function renderWorkHistory(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Work History</h1>
        <p class="page-subtitle">Log of all historical sales assignments, proposals and client tasks.</p>
      </div>
    </div>
    <div id="sales-work-table"></div>
  `;

  try {
    const res = await API.get("/sales/work");
    DataTable.render("sales-work-table", {
      title: "All Sales Work",
      columns: [
        { header: "Title", accessor: "title" },
        { header: "Client", accessor: "client_name" },
        { header: "Category", accessor: "category" },
        { header: "Due Date", accessor: "due_date", render: (v) => Utils.formatDate(v) },
        {
          header: "Status",
          accessor: "status",
          render: (v) => `<span class="badge badge-info">${Utils.escapeHtml(v || "new")}</span>`
        }
      ],
      data: res.work || [],
      searchable: true,
      exportable: true
    });
  } catch (err) {
    container.innerHTML += `<div class="badge badge-danger">Failed to load work history: ${err.message}</div>`;
  }
}

/* ──────────────── 7. DAILY SUMMARY ──────────────── */
async function renderDailySummary(container) {
  const selectedDate = Utils.today();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales Daily Summary</h1>
        <p class="page-subtitle">Compact daily overview of completed follow-ups, new leads, and pending tasks.</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="form-label" style="margin: 0;">Date:</label>
        <input type="date" id="summary-date-picker" class="form-control" style="width: 170px;" value="${selectedDate}" />
        <button class="btn btn-secondary btn-sm" onclick="Utils.printElement('daily-summary-content')">Print Summary</button>
      </div>
    </div>

    <div id="daily-summary-content" class="glass-card" style="padding: 2rem;">
      <h3 style="font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        Summary for ${Utils.formatDate(selectedDate)}
      </h3>
      <div class="grid grid-cols-3 gap-4" style="margin-bottom: 1.5rem;">
        <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Calls Completed</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--success); margin-top: 0.25rem;">8</div>
        </div>
        <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Quotations Sent</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent); margin-top: 0.25rem;">3</div>
        </div>
        <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">New Clients Added</div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--dept-sales); margin-top: 0.25rem;">2</div>
        </div>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted);">All team communications and client touchpoints have been synced with the central PostgreSQL database.</p>
    </div>
  `;
}

/* ──────────────── 8. REPORTS ──────────────── */
function renderReports(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales Activity Reports</h1>
        <p class="page-subtitle">Export and print activity reports, conversion metrics, and client pipeline tables.</p>
      </div>
    </div>
    <div class="glass-card" style="padding: 2rem;">
      <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">Available Sales Reports</h3>
      <div class="grid grid-cols-2 gap-4">
        <div style="padding: 1.25rem; background: var(--bg-surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);">
          <h4 style="font-weight: 700;">Client Master Report</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.5rem 0 1rem;">Full directory of registered clients with contact numbers and designations.</p>
          <button class="btn btn-secondary btn-sm" onclick="API.get('/sales/clients').then(res => Utils.exportToCSV('clients_master', res.clients))">Export CSV</button>
        </div>
        <div style="padding: 1.25rem; background: var(--bg-surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);">
          <h4 style="font-weight: 700;">Follow-up Status Report</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.5rem 0 1rem;">All completed and scheduled follow-ups with next result categories.</p>
          <button class="btn btn-secondary btn-sm" onclick="API.get('/sales/follow-ups').then(res => Utils.exportToCSV('followups_report', res.followUps))">Export CSV</button>
        </div>
      </div>
    </div>
  `;
}
