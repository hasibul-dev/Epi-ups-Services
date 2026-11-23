// Left Navigation Sidebar Component
window.Sidebar = {
  getNavItems(dept) {
    const navMap = {
      sales: [
        { label: "Dashboard", route: "sales", icon: "📊" },
        { label: "Clients Master", route: "sales/clients", icon: "👥" },
        { label: "Add Client", route: "sales/add-client", icon: "➕" },
        { label: "Today's Work", route: "sales/today", icon: "📅" },
        { label: "Work History", route: "sales/work", icon: "📋" },
        { label: "Follow-ups", route: "sales/follow-ups", icon: "📞" },
        { label: "Daily Summary", route: "sales/daily-summary", icon: "📑" },
        { label: "Activity Reports", route: "sales/reports", icon: "📈" }
      ],
      service: [
        { label: "Service Dashboard", route: "service", icon: "📊" },
        { label: "Today's Work", route: "service/today", icon: "⚡" },
        { label: "Upcoming Work", route: "service/upcoming", icon: "🕒" },
        { label: "Servicing", route: "service/servicing", icon: "🔧" },
        { label: "Maintenance", route: "service/maintenance", icon: "⚙️" },
        { label: "Installation", route: "service/installation", icon: "🔌" },
        { label: "General Work", route: "service/general", icon: "📝" },
        { label: "Warranty Tracking", route: "service/warranty", icon: "🛡️" },
        { label: "Work Orders History", route: "service/history", icon: "📜" },
        { label: "Schedule & Reports", route: "service/reports", icon: "📈" }
      ],
      erp: [
        { label: "Financial Dashboard", route: "erp", icon: "📊" },
        { label: "Chart of Accounts", route: "erp/accounts", icon: "🗂️" },
        { label: "Journal & Vouchers", route: "erp/vouchers", icon: "🧾" },
        { label: "Cash & Bank", route: "erp/cash-bank", icon: "🏦" },
        { label: "Accounts Ledger", route: "erp/ledger", icon: "📖" },
        { label: "Customers", route: "erp/customers", icon: "🤝" },
        { label: "Suppliers", route: "erp/suppliers", icon: "🚚" },
        { label: "Sales Invoices", route: "erp/invoices", icon: "📑" },
        { label: "Purchase Bills", route: "erp/purchases", icon: "🛒" },
        { label: "Receipts & Payments", route: "erp/payments", icon: "💳" },
        { label: "Ageing Analysis", route: "erp/ageing", icon: "⏱️" },
        { label: "Inventory Items", route: "erp/inventory", icon: "📦" },
        { label: "VAT Mushak 9.1", route: "erp/vat", icon: "🏛️" },
        { label: "Payroll & Salaries", route: "erp/payroll", icon: "💵" },
        { label: "Fixed Assets", route: "erp/fixed-assets", icon: "🏢" },
        { label: "Financial Reports & Print", route: "erp/reports", icon: "🖨️" },
        { label: "Accounts Settings", route: "erp/settings", icon: "⚙️" }
      ],
      marketing: [
        { label: "Marketing Dashboard", route: "marketing", icon: "📊" },
        { label: "Campaigns", route: "marketing/campaigns", icon: "📢" },
        { label: "Content & Posts", route: "marketing/posts", icon: "📱" },
        { label: "Tasks", route: "marketing/tasks", icon: "✅" },
        { label: "Marketing Reports", route: "marketing/reports", icon: "📈" }
      ],
      it: [
        { label: "IT Dashboard", route: "it", icon: "📊" },
        { label: "Support Tickets", route: "it/tickets", icon: "🎫" },
        { label: "IT Devices", route: "it/devices", icon: "💻" },
        { label: "IT Tasks", route: "it/tasks", icon: "🛠️" },
        { label: "IT Reports", route: "it/reports", icon: "📈" }
      ],
      admin: [
        { label: "Executive Dashboard", route: "admin", icon: "📊" },
        { label: "User Management", route: "admin/users", icon: "👥" },
        { label: "Departments", route: "admin/departments", icon: "🏢" },
        { label: "Roles & Permissions", route: "admin/roles", icon: "🛡️" },
        { label: "System Settings", route: "admin/settings", icon: "⚙️" },
        { label: "Database Management", route: "admin/database", icon: "🗄️" },
        { label: "Backup & Restore", route: "admin/backup", icon: "💾" },
        { label: "Audit Logs", route: "admin/audit", icon: "📜" }
      ]
    };
    return navMap[dept] || navMap.sales;
  },

  render(activeDept, activeRoute) {
    const items = this.getNavItems(activeDept);
    return `
      <aside class="app-sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <a href="#${activeDept}" class="sidebar-brand">
            <img src="assets/logo.svg" alt="EPI UPS Logo" />
            <div class="sidebar-brand-text">
              <span class="sidebar-brand-title">EPI UPS</span>
              <span class="sidebar-brand-sub">Enterprise</span>
            </div>
          </a>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-group-label">${activeDept.toUpperCase()} MODULES</div>
          ${items
            .map(
              (item) => `
            <a href="#${item.route}" class="nav-item ${item.route === activeRoute ? "active" : ""}">
              <i>${item.icon}</i>
              <span>${item.label}</span>
            </a>
          `
            )
            .join("")}
        </nav>
        <div class="sidebar-footer">
          <span style="font-size: 0.7rem; color: var(--text-dim);">EPI UPS v2.0 HTML</span>
        </div>
      </aside>
    `;
  }
};
