// Modal Dialog Component
window.Modal = {
  open(title, contentHtml, footerHtml = "") {
    let overlay = document.getElementById("app-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "app-modal";
      overlay.className = "modal-overlay";
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${Utils.escapeHtml(title)}</h3>
          <button class="btn btn-icon" onclick="Modal.close()">&times;</button>
        </div>
        <div class="modal-body">${contentHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
      </div>
    `;

    overlay.classList.add("open");
    overlay.onclick = (e) => {
      if (e.target === overlay) Modal.close();
    };
  },

  close() {
    const overlay = document.getElementById("app-modal");
    if (overlay) {
      overlay.classList.remove("open");
    }
  }
};
