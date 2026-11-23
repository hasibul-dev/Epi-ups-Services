// Login Page Component
window.Pages = window.Pages || {};

window.Pages.login = {
  render() {
    return `
      <div style="display: flex; min-height: 100vh; background-color: var(--bg-app);">
        <div style="flex: 1; display: none; flex-direction: column; justify-content: space-between; padding: 3rem; background: radial-gradient(circle at top left, rgba(91, 141, 239, 0.15), transparent 70%); border-right: 1px solid var(--border);" class="login-brand-panel">
          <div class="flex items-center gap-3">
            <img src="assets/logo.svg" alt="EPI UPS" style="height: 52px; background: #fff; padding: 4px; border-radius: var(--radius-sm);" />
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; line-height: 1.1;">EPI UPS</h2>
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent); letter-spacing: 0.15em; text-transform: uppercase;">Bangladesh Limited</span>
            </div>
          </div>
          <div style="max-width: 480px;">
            <h1 style="font-size: 2.5rem; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">Enterprise Management System</h1>
            <p style="color: var(--text-muted); margin-top: 1rem; font-size: 1.05rem;">Unified platform for Sales, Service, ERP Accounts, Marketing and IT Support with real-time analytics.</p>
            <div class="grid grid-cols-2 gap-3" style="margin-top: 2rem;">
              <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 0.85rem; font-weight: 500;">✓ Role-based permissions</div>
              <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 0.85rem; font-weight: 500;">✓ Live financial KPIs</div>
              <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 0.85rem; font-weight: 500;">✓ Auto follow-up engine</div>
              <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 0.85rem; font-weight: 500;">✓ A4 print & PDF export</div>
            </div>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-dim);">© ${new Date().getFullYear()} EPI UPS (Bangladesh) Limited. All rights reserved.</p>
        </div>

        <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem;">
          <form id="login-form" class="glass-card" style="width: 100%; max-width: 420px; padding: 2.5rem;">
            <div style="margin-bottom: 2rem; text-align: center;">
              <img src="assets/logo.svg" alt="EPI UPS" style="height: 48px; background: #fff; padding: 4px; border-radius: var(--radius-sm); margin-bottom: 1rem;" />
              <h2 style="font-size: 1.6rem; font-weight: 800;">Sign in to your account</h2>
              <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.35rem;">Enter your company credentials to continue.</p>
            </div>

            <div id="login-error" class="hidden" style="background: var(--danger-bg); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.84rem; margin-bottom: 1.25rem;"></div>

            <div class="form-group">
              <label class="form-label" for="login-username">Username or Email</label>
              <input type="text" id="login-username" class="form-control" placeholder="admin" required autofocus value="admin" />
            </div>

            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••" required value="Admin@12345" />
            </div>

            <button type="submit" id="login-submit-btn" class="btn btn-primary w-full" style="padding: 0.75rem; margin-top: 1rem;">
              Sign In
            </button>

            <div style="text-align: center; margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-dim);">
              Default credentials: <strong>admin</strong> / <strong>Admin@12345</strong>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // Media query toggle for brand panel
    const panel = document.querySelector(".login-brand-panel");
    if (panel && window.innerWidth >= 1024) {
      panel.style.display = "flex";
    }

    const form = document.getElementById("login-form");
    if (!form) return;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const identifier = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value;
      const errorDiv = document.getElementById("login-error");
      const submitBtn = document.getElementById("login-submit-btn");

      errorDiv.classList.add("hidden");
      submitBtn.disabled = true;
      submitBtn.innerText = "Signing in...";

      try {
        const res = await window.API.post("/auth/login", { identifier, password });
        if (res.user) {
          window.Store.setUser(res.user, res.token || "token");
          window.Toast.success(`Welcome back, ${res.user.name}!`);
          window.Router.navigate(res.user.department || "sales");
        } else {
          // Fallback if session cookie based
          window.Store.setUser({ name: "Administrator", username: identifier, role: "super_admin", department: "sales" }, "active");
          window.Router.navigate("sales");
        }
      } catch (err) {
        errorDiv.innerText = err.message || "Invalid credentials. Please try again.";
        errorDiv.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.innerText = "Sign In";
      }
    };
  }
};
