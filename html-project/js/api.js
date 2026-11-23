// API Client
window.API = {
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${window.APP_CONFIG.apiBase}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (window.Store.state.token) {
      headers["Authorization"] = `Bearer ${window.Store.state.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include"
      });

      if (response.status === 401) {
        window.Store.setUser(null, null);
        window.Router.navigate("login");
        throw new Error("Session expired. Please sign in again.");
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error("[API Error]", err);
      if (window.Toast) {
        window.Toast.error(err.message || "An unexpected network error occurred.");
      }
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: "POST", body: JSON.stringify(body) });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: "PUT", body: JSON.stringify(body) });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
};
