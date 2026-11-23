// State Store
window.Store = {
  state: {
    user: null,
    token: localStorage.getItem("epi_token") || null,
    activeDept: "sales",
    activeRoute: "sales",
    theme: localStorage.getItem("epi-theme") || "dark",
    perms: {}
  },

  init() {
    document.documentElement.setAttribute("data-theme", this.state.theme);
    const savedUser = localStorage.getItem("epi_user");
    if (savedUser) {
      try {
        this.state.user = JSON.parse(savedUser);
      } catch (e) {}
    }
  },

  setUser(user, token) {
    this.state.user = user;
    this.state.token = token;
    if (user) {
      localStorage.setItem("epi_user", JSON.stringify(user));
      if (token) localStorage.setItem("epi_token", token);
    } else {
      localStorage.removeItem("epi_user");
      localStorage.removeItem("epi_token");
    }
  },

  setDept(dept) {
    this.state.activeDept = dept;
  },

  toggleTheme() {
    const next = this.state.theme === "dark" ? "light" : "dark";
    this.state.theme = next;
    localStorage.setItem("epi-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  },

  isAuthenticated() {
    return !!this.state.user;
  }
};
