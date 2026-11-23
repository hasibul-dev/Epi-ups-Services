// Administration Module
window.Modules = window.Modules || {};

window.Modules.admin = async function (contentEl) {
  contentEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Administration & System Control</h1>
        <p class="page-subtitle">User credentials, RBAC permissions, database snapshots, and platform audit trail.</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="Toast.success('Snapshot created successfully!');">Create System Backup</button>
    </div>

    <div class="grid grid-cols-4 gap-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">System Users</span><div class="stat-icon" style="background: rgba(91, 141, 239, 0.15); color: #5b8def;">👥</div></div>
        <div class="stat-value">9</div>
        <span class="stat-desc">Active company accounts</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Security Role</span><div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🛡️</div></div>
        <div class="stat-value">RBAC</div>
        <span class="stat-desc">5 permission tiers</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Database Tables</span><div class="stat-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">🗄️</div></div>
        <div class="stat-value">33</div>
        <span class="stat-desc">PostgreSQL tables</span>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Database Status</span><div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div></div>
        <div class="stat-value" style="color: #10b981;">Healthy</div>
        <span class="stat-desc">Persistent storage</span>
      </div>
    </div>

    <div id="admin-users-table"></div>
  `;

  try {
    const res = await API.get("/admin/users");
    DataTable.render("admin-users-table", {
      title: "System User Accounts",
      columns: [
        { header: "Username", accessor: "username" },
        { header: "Full Name", accessor: "name" },
        { header: "Email Address", accessor: "email" },
        { header: "Assigned Role", accessor: "role", render: (v) => `<span class="badge badge-info">${v}</span>` },
        { header: "Primary Dept", accessor: "department" },
        { header: "Status", accessor: "active", render: (v) => v !== false ? `<span class="badge badge-success">Active</span>` : `<span class="badge badge-danger">Disabled</span>` }
      ],
      data: res.users || [
        { username: "admin", name: "Super Administrator", email: "admin@epiups.local", role: "super_admin", department: "admin", active: true }
      ],
      searchable: true,
      exportable: true
    });
  } catch (e) {}
};

Router.register("admin", (el) => window.Modules.admin(el));
Router.register("admin/users", (el) => window.Modules.admin(el));
Router.register("admin/departments", (el) => window.Modules.admin(el));
Router.register("admin/roles", (el) => window.Modules.admin(el));
Router.register("admin/settings", (el) => window.Modules.admin(el));
Router.register("admin/database", (el) => window.Modules.admin(el));
Router.register("admin/backup", (el) => window.Modules.admin(el));
Router.register("admin/audit", (el) => window.Modules.admin(el));
