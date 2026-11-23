// Client Router
window.Router = {
  routes: {},

  register(route, handler) {
    this.routes[route] = handler;
  },

  navigate(route) {
    window.location.hash = `#${route}`;
  },

  getRoute() {
    const hash = window.location.hash.slice(1);
    return hash || "sales";
  },

  async handleRouting() {
    const rawRoute = this.getRoute();
    const [dept, subroute] = rawRoute.split("/");

    if (rawRoute === "login") {
      if (window.Pages && window.Pages.login) {
        document.getElementById("app-root").innerHTML = window.Pages.login.render();
        window.Pages.login.bindEvents();
      }
      return;
    }

    // Auth check
    if (!window.Store.isAuthenticated()) {
      this.navigate("login");
      return;
    }

    if (dept && window.APP_CONFIG.departments.some((d) => d.code === dept)) {
      window.Store.setDept(dept);
    }
    window.Store.state.activeRoute = rawRoute;

    // Render Shell Layout
    const root = document.getElementById("app-root");
    root.innerHTML = `
      <div class="app-layout">
        ${window.Sidebar.render(window.Store.state.activeDept, rawRoute)}
        <div class="app-main">
          ${window.Header.render()}
          <main class="app-body" id="app-content">
            <div style="display: flex; align-items: center; justify-content: center; height: 50vh;">
              <span style="color: var(--text-muted); font-size: 0.9rem;">Loading view...</span>
            </div>
          </main>
        </div>
      </div>
    `;

    window.Header.bindEvents();

    // Dispatch Route to Module Handler
    const content = document.getElementById("app-content");
    const fullRoute = rawRoute;

    if (this.routes[fullRoute]) {
      await this.routes[fullRoute](content);
    } else if (this.routes[dept]) {
      await this.routes[dept](content, subroute);
    } else {
      content.innerHTML = `
        <div class="glass-card" style="padding: 3rem; text-align: center; max-width: 500px; margin: 4rem auto;">
          <h2 style="font-size: 1.5rem; font-weight: 800;">Module Not Found</h2>
          <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.875rem;">The path <code>#${Utils.escapeHtml(rawRoute)}</code> does not exist.</p>
          <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="Router.navigate('sales')">Return to Sales Dashboard</button>
        </div>
      `;
    }
  },

  init() {
    window.addEventListener("hashchange", () => this.handleRouting());
    this.handleRouting();
  }
};
