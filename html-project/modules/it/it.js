// IT Support Module
window.Modules = window.Modules || {};

window.Modules.it = async function (contentEl) {
  contentEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">IT Support & Infrastructure</h1>
        <p class="page-subtitle">Internal company IT helpdesk, office hardware registry, and system maintenance.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Toast.info('Ticket creation modal');">+ Raise IT Ticket</button>
    </div>

    <div class="grid grid-cols-4 gap-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Open Tickets</span><div class="stat-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">🎫</div></div>
        <div class="stat-value">2</div>
        <span class="stat-desc">Awaiting resolution</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Registered Devices</span><div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">💻</div></div>
        <div class="stat-value">28</div>
        <span class="stat-desc">Laptops, PCs & printers</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Network Status</span><div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🌐</div></div>
        <div class="stat-value" style="color: #10b981;">100%</div>
        <span class="stat-desc">Core switch & router online</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Resolved Tickets</span><div class="stat-icon" style="background: rgba(91, 141, 239, 0.15); color: #5b8def;">✅</div></div>
        <div class="stat-value">64</div>
        <span class="stat-desc">Closed this quarter</span>
      </div>
    </div>

    <div id="it-tickets-table"></div>
  `;

  DataTable.render("it-tickets-table", {
    title: "Support Tickets",
    columns: [
      { header: "Subject", accessor: "subject" },
      { header: "User / Employee", accessor: "user_name" },
      { header: "Department", accessor: "department" },
      { header: "Priority", accessor: "priority", render: (v) => `<span class="badge badge-warning">${v}</span>` },
      { header: "Status", accessor: "status", render: (v) => `<span class="badge badge-info">${v}</span>` }
    ],
    data: [
      { subject: "Laptop display flickering & battery not charging", user_name: "MD. Mahmudul Hasan", department: "Sales", priority: "High", status: "In Progress" },
      { subject: "Network printer offline on 2nd floor", user_name: "Chief Accountant", department: "Accounts", priority: "High", status: "Open" },
      { subject: "Email access password reset", user_name: "Nusrat Jahan", department: "Sales", priority: "Normal", status: "Pending" }
    ],
    searchable: true,
    exportable: true
  });
};

Router.register("it", (el) => window.Modules.it(el));
Router.register("it/tickets", (el) => window.Modules.it(el));
Router.register("it/devices", (el) => window.Modules.it(el));
Router.register("it/tasks", (el) => window.Modules.it(el));
Router.register("it/reports", (el) => window.Modules.it(el));
