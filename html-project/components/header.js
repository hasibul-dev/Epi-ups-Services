// Top Header Bar Component
window.Header = {
  render() {
    const user = window.Store.state.user || { name: "Guest User", role: "guest" };
    const depts = window.APP_CONFIG.departments;
    const activeDept = window.Store.state.activeDept;

    return `
      <header class="app-header">
        <div class="dept-tabs">
          ${depts
            .map(
              (d) => `
            <a href="#${d.code}" class="dept-tab ${d.code === activeDept ? "active" : ""}" data-dept="${d.code}">
              <span>${d.short}</span>
            </a>
          `
            )
            .join("")}
        </div>
        <div class="header-actions">
          <button class="btn btn-icon" id="theme-toggle" title="Toggle Theme">🌓</button>
          <div class="flex items-center gap-2" style="background: var(--bg-surface-elevated); padding: 0.35rem 0.75rem; border-radius: var(--radius-full); border: 1px solid var(--border);">
            <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
              ${Utils.escapeHtml(user.name.charAt(0).toUpperCase())}
            </div>
            <div style="display: flex; flex-direction: column; line-height: 1.1;">
              <span style="font-size: 0.8rem; font-weight: 700;">${Utils.escapeHtml(user.name)}</span>
              <span style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">${Utils.escapeHtml(user.role)}</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="logout-btn">Sign out</button>
        </div>
      </header>
    `;
  },

  bindEvents() {
    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.onclick = () => window.Store.toggleTheme();
    }
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        try {
          await window.API.post("/auth/logout", {});
        } catch (e) {}
        window.Store.setUser(null, null);
        window.Router.navigate("login");
      };
    }
  }
};
