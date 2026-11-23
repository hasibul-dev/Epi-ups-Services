// Utility Functions
window.Utils = {
  formatDate(d) {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  },

  today() {
    return new Date().toISOString().split("T")[0];
  },

  addDays(dateStr, days) {
    const d = dateStr ? new Date(dateStr) : new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  },

  formatCurrency(val) {
    const n = Number(val || 0);
    return "৳ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatNumber(val) {
    return Number(val || 0).toLocaleString("en-US");
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  exportToCSV(filename, rows) {
    if (!rows || !rows.length) return;
    const separator = ",";
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      "\n" +
      rows
        .map((row) => {
          return keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? "" : String(row[k]);
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  printElement(elemId) {
    const el = document.getElementById(elemId);
    if (!el) {
      window.print();
      return;
    }
    const printArea = document.getElementById("print-area") || document.body;
    window.print();
  }
};
