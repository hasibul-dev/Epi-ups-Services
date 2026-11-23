// Main Application Entry Point
document.addEventListener("DOMContentLoaded", () => {
  window.Store.init();

  // If user has no active session, route to login
  if (!window.Store.isAuthenticated() && window.location.hash !== "#login") {
    window.location.hash = "#login";
  }

  window.Router.init();
});
