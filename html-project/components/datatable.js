// Reusable Interactive Data Table Component
window.DataTable = {
  render(containerId, options = {}) {
    const {
      title = "",
      columns = [],
      data = [],
      searchable = true,
      exportable = true,
      actions = [],
      pageSize = 10
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    let currentPage = 1;
    let searchQuery = "";
    let sortColumn = null;
    let sortAsc = true;

    function getFilteredData() {
      let filtered = [...data];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((row) =>
          columns.some((col) => {
            const val = col.accessor ? row[col.accessor] : "";
            return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
          })
        );
      }
      if (sortColumn) {
        filtered.sort((a, b) => {
          const valA = a[sortColumn] ?? "";
          const valB = b[sortColumn] ?? "";
          if (valA < valB) return sortAsc ? -1 : 1;
          if (valA > valB) return sortAsc ? 1 : -1;
          return 0;
        });
      }
      return filtered;
    }

    function renderView() {
      const filtered = getFilteredData();
      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;

      const startIndex = (currentPage - 1) * pageSize;
      const pageRows = filtered.slice(startIndex, startIndex + pageSize);

      let html = `
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div style="font-weight: 700; font-size: 1.05rem;">${Utils.escapeHtml(title)} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">(${filtered.length} total)</span></div>
            <div class="flex items-center gap-2">
              ${
                searchable
                  ? `
                <div class="table-search">
                  <input type="text" id="${containerId}-search" placeholder="Search records..." value="${Utils.escapeHtml(searchQuery)}" />
                </div>`
                  : ""
              }
              ${
                exportable
                  ? `
                <button class="btn btn-secondary btn-sm" id="${containerId}-export">Export CSV</button>`
                  : ""
              }
              ${actions
                .map(
                  (act) => `
                <button class="btn ${act.btnClass || "btn-primary"} btn-sm" id="${act.id}">${act.label}</button>
              `
                )
                .join("")}
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  ${columns
                    .map(
                      (col) => `
                    <th style="cursor: pointer;" data-col="${col.accessor || ""}">
                      ${Utils.escapeHtml(col.header)}
                    </th>`
                    )
                    .join("")}
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${
                  pageRows.length === 0
                    ? `<tr><td colspan="${columns.length + 1}" style="text-align: center; padding: 2rem; color: var(--text-dim);">No matching records found.</td></tr>`
                    : pageRows
                        .map(
                          (row, idx) => `
                    <tr>
                      ${columns
                        .map((col) => {
                          const val = row[col.accessor];
                          const cellContent = col.render ? col.render(val, row) : Utils.escapeHtml(val ?? "-");
                          return `<td>${cellContent}</td>`;
                        })
                        .join("")}
                      <td style="text-align: right;">
                        <button class="btn btn-secondary btn-sm" data-action="view" data-index="${startIndex + idx}">View</button>
                      </td>
                    </tr>
                  `
                        )
                        .join("")
                }
              </tbody>
            </table>
          </div>
          <div class="table-pagination">
            <div>Showing ${filtered.length ? startIndex + 1 : 0} to ${Math.min(startIndex + pageSize, filtered.length)} of ${filtered.length}</div>
            <div class="flex gap-2">
              <button class="btn btn-secondary btn-sm" id="${containerId}-prev" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
              <button class="btn btn-secondary btn-sm" id="${containerId}-next" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Bind events
      const searchInput = document.getElementById(`${containerId}-search`);
      if (searchInput) {
        searchInput.oninput = (e) => {
          searchQuery = e.target.value;
          currentPage = 1;
          renderView();
          const nextInput = document.getElementById(`${containerId}-search`);
          if (nextInput) {
            nextInput.focus();
            nextInput.setSelectionRange(searchQuery.length, searchQuery.length);
          }
        };
      }

      const exportBtn = document.getElementById(`${containerId}-export`);
      if (exportBtn) {
        exportBtn.onclick = () => {
          Utils.exportToCSV(title.replace(/\s+/g, "_").toLowerCase() || "export", filtered);
        };
      }

      actions.forEach((act) => {
        const el = document.getElementById(act.id);
        if (el && act.onClick) el.onclick = act.onClick;
      });

      const prevBtn = document.getElementById(`${containerId}-prev`);
      if (prevBtn) prevBtn.onclick = () => { currentPage--; renderView(); };

      const nextBtn = document.getElementById(`${containerId}-next`);
      if (nextBtn) nextBtn.onclick = () => { currentPage++; renderView(); };
    }

    renderView();
  }
};
