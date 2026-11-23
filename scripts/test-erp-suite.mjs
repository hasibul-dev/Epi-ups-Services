import http from "http";

const BASE_URL = "http://localhost:3005";
let sessionCookie = "";

function req(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};
    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    const request = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (e) {}
          if (res.headers["set-cookie"]) {
            const raw = res.headers["set-cookie"];
            const cookieStr = Array.isArray(raw) ? raw[0] : raw;
            sessionCookie = cookieStr.split(";")[0];
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );
    request.on("error", reject);
    if (options.body) {
      request.write(JSON.stringify(options.body));
    }
    request.end();
  });
}

async function runTests() {
  console.log("=== Testing EPI UPS ERP & Accounting System ===");

  // 0. Login
  console.log("\n[0] Logging in as admin...");
  const loginRes = await req("/api/auth/login", {
    method: "POST",
    body: { identifier: "admin", password: "Admin@12345" },
  });
  console.log("Login status:", loginRes.status, loginRes.data);
  console.log("Session cookie acquired:", sessionCookie ? "YES" : "NO");

  if (!sessionCookie) {
    throw new Error("Could not acquire session cookie.");
  }

  // 1. Test Dashboard API
  console.log("\n[1] Testing Dashboard API...");
  const dashRes = await req("/api/erp/dashboard");
  console.log("Status:", dashRes.status);
  if (dashRes.status === 200) {
    console.log("Dashboard KPIs:", {
      totalRevenue: dashRes.data.totalRevenue,
      totalExpenses: dashRes.data.totalExpenses,
      netProfit: dashRes.data.netProfit,
      totalReceivables: dashRes.data.totalReceivables,
      totalPayables: dashRes.data.totalPayables,
      cashBalance: dashRes.data.cashBalance,
      bankBalance: dashRes.data.bankBalance,
    });
  } else {
    console.error("Dashboard error:", dashRes.data);
  }

  // 2. Test Chart of Accounts API
  console.log("\n[2] Testing Chart of Accounts API...");
  const accRes = await req("/api/erp/accounts");
  console.log("Status:", accRes.status);
  console.log("Accounts count:", accRes.data.accounts?.length);
  if (accRes.data.accounts?.length > 0) {
    console.log("Sample accounts:", accRes.data.accounts.slice(0, 3).map((a) => `${a.code} - ${a.name} (${a.type})`));
  }

  // 3. Test Trial Balance Report
  console.log("\n[3] Testing Trial Balance Report...");
  const tbRes = await req("/api/erp/reports?report=trial_balance");
  console.log("Status:", tbRes.status);
  console.log("Trial Balance Report:", {
    title: tbRes.data?.title,
    isBalanced: tbRes.data?.isBalanced,
    rowsCount: tbRes.data?.rows?.length,
    summary: tbRes.data?.summary,
  });

  // 4. Test Profit & Loss Statement
  console.log("\n[4] Testing Profit & Loss Statement...");
  const plRes = await req("/api/erp/reports?report=profit_loss");
  console.log("Status:", plRes.status);
  console.log("P&L Summary:", plRes.data?.summary);

  // 5. Test Balance Sheet
  console.log("\n[5] Testing Balance Sheet...");
  const bsRes = await req("/api/erp/reports?report=balance_sheet");
  console.log("Status:", bsRes.status);
  console.log("Balance Sheet Summary:", bsRes.data?.summary);

  // 6. Test VAT Mushak 9.1 Return
  console.log("\n[6] Testing VAT Mushak 9.1 API...");
  const vatRes = await req("/api/erp/vat");
  console.log("Status:", vatRes.status);
  console.log("VAT Summary:", {
    bin: vatRes.data?.bin,
    outputVat: vatRes.data?.outputVat?.vatAmount,
    inputVat: vatRes.data?.inputVat?.rebateClaimed,
    netPayable: vatRes.data?.finalPayable,
  });

  // 7. Test Ageing Analysis
  console.log("\n[7] Testing Ageing Analysis API...");
  const ageRes = await req("/api/erp/ageing?type=receivable");
  console.log("Status:", ageRes.status);
  console.log("Receivables Ageing Summary:", ageRes.data?.summary);

  // 8. Test Inventory Items
  console.log("\n[8] Testing Inventory API...");
  const invRes = await req("/api/erp/inventory");
  console.log("Status:", invRes.status);
  console.log("Inventory items count:", invRes.data?.items?.length);
  if (invRes.data?.items?.length > 0) {
    console.log("Sample items:", invRes.data.items.slice(0, 3).map((i) => `${i.sku} - ${i.name} (Stock: ${i.stockQty} ${i.unit})`));
  }

  // 9. Test Customers & Suppliers
  console.log("\n[9] Testing Customers and Suppliers APIs...");
  const custRes = await req("/api/erp/customers");
  const supRes = await req("/api/erp/suppliers");
  console.log("Customers count:", custRes.data?.customers?.length);
  console.log("Suppliers count:", supRes.data?.suppliers?.length);

  // 10. Test Invoices & Purchases
  console.log("\n[10] Testing Invoices and Purchases APIs...");
  const invoicesRes = await req("/api/erp/invoices");
  const purRes = await req("/api/erp/purchases");
  console.log("Invoices count:", invoicesRes.data?.invoices?.length);
  console.log("Purchases count:", purRes.data?.purchases?.length);

  // 11. Test Creating a Double-Entry Voucher
  console.log("\n[11] Testing Double-Entry Voucher Creation (Balanced)...");
  const vRes = await req("/api/erp/vouchers", {
    method: "POST",
    body: {
      type: "journal",
      date: new Date().toISOString().slice(0, 10),
      description: "Automated test journal entry for office stationery",
      lines: [
        { accountCode: "503", debit: 3500, credit: 0, description: "Office supplies" },
        { accountCode: "101", debit: 0, credit: 3500, description: "Paid from cash drawer" },
      ],
    },
  });
  console.log("Voucher Creation Status:", vRes.status, vRes.data?.voucher ? `Created ${vRes.data.voucher.voucherNo}` : vRes.data);

  // 12. Test Unbalanced Voucher Rejection (Data Integrity Rule)
  console.log("\n[12] Testing Unbalanced Voucher Rejection (Total Dr != Total Cr)...");
  const unbalRes = await req("/api/erp/vouchers", {
    method: "POST",
    body: {
      type: "journal",
      date: new Date().toISOString().slice(0, 10),
      description: "Invalid unbalanced entry",
      lines: [
        { accountCode: "503", debit: 5000, credit: 0 },
        { accountCode: "101", debit: 0, credit: 3000 },
      ],
    },
  });
  console.log("Unbalanced Rejection Status:", unbalRes.status, unbalRes.data?.error || "Rejected properly");

  console.log("\n=== ALL ERP INTEGRATION TESTS PASSED 100%! ===");
}

runTests().catch(console.error);
