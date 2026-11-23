// Service Department Module
window.Modules = window.Modules || {};

window.Modules.service = async function (contentEl, subroute) {
  contentEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Service Department</h1>
        <p class="page-subtitle">Equipment servicing, UPS preventive maintenance, installations, and warranty claims.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openCreateOrderModal()">+ New Service Order</button>
    </div>

    <div class="grid grid-cols-4 gap-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Active Orders</span><div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">⚡</div></div>
        <div class="stat-value">8</div>
        <span class="stat-desc">Work orders in progress</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Preventive Maintenance</span><div class="stat-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">⚙️</div></div>
        <div class="stat-value">5</div>
        <span class="stat-desc">Scheduled AMC visits</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Installations</span><div class="stat-icon" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">🔌</div></div>
        <div class="stat-value">3</div>
        <span class="stat-desc">Commissioning & setup</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Warranties Active</span><div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">🛡️</div></div>
        <div class="stat-value">142</div>
        <span class="stat-desc">Registered serial numbers</span>
      </div>
    </div>

    <div id="service-orders-table"></div>
  `;

  try {
    const res = await API.get("/service/orders");
    DataTable.render("service-orders-table", {
      title: "Service & Work Orders",
      columns: [
        { header: "Order Title", accessor: "title" },
        { header: "Customer / Client", accessor: "company_name" },
        { header: "Category", accessor: "category", render: (v) => `<span class="badge badge-info">${Utils.escapeHtml(v || 'servicing')}</span>` },
        { header: "Equipment / Model", accessor: "equipment" },
        { header: "Scheduled Date", accessor: "scheduled_date", render: (v) => Utils.formatDate(v) },
        { header: "Status", accessor: "status", render: (v) => `<span class="badge badge-success">${v || 'scheduled'}</span>` }
      ],
      data: res.orders || [
        { title: "Install 10kVA online UPS with battery cabinet", company_name: "Trust Machineries", category: "installation", equipment: "EPI Online 10kVA", scheduled_date: "2026-11-25", status: "scheduled" },
        { title: "Battery bank voltage inspection", company_name: "Horizon Commercial Tower", category: "maintenance", equipment: "16 x 12V 100Ah", scheduled_date: "2026-11-26", status: "scheduled" }
      ],
      searchable: true,
      exportable: true
    });
  } catch (e) {}
};

// Route registrations
Router.register("service", (el) => window.Modules.service(el, "dashboard"));
Router.register("service/today", (el) => window.Modules.service(el, "today"));
Router.register("service/upcoming", (el) => window.Modules.service(el, "upcoming"));
Router.register("service/servicing", (el) => window.Modules.service(el, "servicing"));
Router.register("service/maintenance", (el) => window.Modules.service(el, "maintenance"));
Router.register("service/installation", (el) => window.Modules.service(el, "installation"));
Router.register("service/general", (el) => window.Modules.service(el, "general"));
Router.register("service/warranty", (el) => window.Modules.service(el, "warranty"));
Router.register("service/history", (el) => window.Modules.service(el, "history"));
Router.register("service/reports", (el) => window.Modules.service(el, "reports"));

window.openCreateOrderModal = function() {
  const content = `
    <form id="order-form">
      <div class="form-group">
        <label class="form-label">Order Title *</label>
        <input type="text" id="order-title" class="form-control" placeholder="e.g. Quarterly UPS Inspection" required />
      </div>
      <div class="form-group">
        <label class="form-label">Category *</label>
        <select id="order-category" class="form-select">
          <option value="servicing">Servicing</option>
          <option value="maintenance" selected>Maintenance</option>
          <option value="installation">Installation</option>
          <option value="general">General Work</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Scheduled Date *</label>
        <input type="date" id="order-date" class="form-control" value="${Utils.today()}" required />
      </div>
    </form>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="Toast.success('Service order created successfully!'); Modal.close();">Create Order</button>
  `;
  Modal.open("New Service Work Order", content, footer);
};
