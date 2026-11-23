// Digital Marketing Module
window.Modules = window.Modules || {};

window.Modules.marketing = async function (contentEl) {
  contentEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Digital Marketing</h1>
        <p class="page-subtitle">Social campaigns, lead generation, reach analytics and brand awareness.</p>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Active Campaigns</span><div class="stat-icon" style="background: rgba(168, 85, 247, 0.15); color: #a855f7;">📢</div></div>
        <div class="stat-value">3</div>
        <span class="stat-desc">Live marketing drives</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Total Leads</span><div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🎯</div></div>
        <div class="stat-value">246</div>
        <span class="stat-desc">Acquired through campaigns</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Total Reach</span><div class="stat-icon" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">🌐</div></div>
        <div class="stat-value">113,000</div>
        <span class="stat-desc">Facebook & LinkedIn</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Engagement</span><div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">👍</div></div>
        <div class="stat-value">4,880</div>
        <span class="stat-desc">Clicks, shares & messages</span>
      </div>
    </div>

    <div id="marketing-campaigns-table"></div>
  `;

  DataTable.render("marketing-campaigns-table", {
    title: "Marketing Campaigns",
    columns: [
      { header: "Campaign Name", accessor: "name" },
      { header: "Channel", accessor: "channel" },
      { header: "Budget", accessor: "budget", render: (v) => Utils.formatCurrency(v) },
      { header: "Spent", accessor: "spent", render: (v) => Utils.formatCurrency(v) },
      { header: "Leads", accessor: "leads" },
      { header: "Status", accessor: "status", render: (v) => `<span class="badge badge-success">${v}</span>` }
    ],
    data: [
      { name: "EPI Industrial Online UPS Summer Shield 2026", channel: "Facebook & LinkedIn", budget: 65000, spent: 38400, leads: 112, status: "Active" },
      { name: "Garments & Spinning Mill Servo AVR Protection", channel: "LinkedIn", budget: 45000, spent: 42000, leads: 74, status: "Active" },
      { name: "Hospital & Diagnostic Centre Power Continuity", channel: "Direct Email & Meta", budget: 30000, spent: 12500, leads: 19, status: "Active" }
    ],
    searchable: true,
    exportable: true
  });
};

Router.register("marketing", (el) => window.Modules.marketing(el));
Router.register("marketing/campaigns", (el) => window.Modules.marketing(el));
Router.register("marketing/posts", (el) => window.Modules.marketing(el));
Router.register("marketing/tasks", (el) => window.Modules.marketing(el));
Router.register("marketing/reports", (el) => window.Modules.marketing(el));
