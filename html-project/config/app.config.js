// Application Configuration
window.APP_CONFIG = {
  appName: "EPI UPS Enterprise System",
  company: {
    name: "EPI UPS (Bangladesh) Limited",
    sub: "Enterprise Management Platform",
    address: "Dhaka, Bangladesh",
    currency: "৳",
    logo: "assets/logo.svg"
  },
  apiBase: "/api",
  departments: [
    { code: "sales", name: "Sales Department", short: "Sales", icon: "briefcase", color: "#06b6d4" },
    { code: "service", name: "Service Department", short: "Service", icon: "tool", color: "#10b981" },
    { code: "erp", name: "ERP / Accounts", short: "ERP & Accounts", icon: "book", color: "#6366f1" },
    { code: "marketing", name: "Digital Marketing", short: "Marketing", icon: "target", color: "#a855f7" },
    { code: "it", name: "IT Support", short: "IT Support", icon: "server", color: "#3b82f6" },
    { code: "admin", name: "Administration", short: "Admin", icon: "shield", color: "#5b8def" }
  ],
  followUpDaysMap: {
    "Potential": 3,
    "Potential (+3d)": 3,
    "No Potential": 10,
    "No Potential (+10d)": 10,
    "Quotation": 7,
    "Quotation (+7d)": 7,
    "Sale": 30,
    "Sale (+30d)": 30
  }
};
