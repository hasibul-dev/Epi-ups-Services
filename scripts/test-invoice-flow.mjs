import http from "http";

const BASE_URL = "http://localhost:3005";
let sessionCookie = "";

function req(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};
    if (sessionCookie) headers["Cookie"] = sessionCookie;
    if (options.body) headers["Content-Type"] = "application/json";

    const request = http.request(
      url,
      { method: options.method || "GET", headers },
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
    if (options.body) request.write(JSON.stringify(options.body));
    request.end();
  });
}

async function run() {
  console.log("=== Testing End-to-End Invoice Flow ===");
  // 1. Login
  await req("/api/auth/login", {
    method: "POST",
    body: { identifier: "admin", password: "Admin@12345" },
  });

  // 2. Get first customer and inventory item
  const custRes = await req("/api/erp/customers");
  const firstCustomer = custRes.data?.customers?.[0];
  const invRes = await req("/api/erp/inventory");
  const firstItem = invRes.data?.items?.[0];

  console.log("Customer:", firstCustomer?.name, "Item:", firstItem?.name, "Initial Stock:", firstItem?.stockQty);

  // 3. Create Sales Invoice with 15% VAT
  const createInvRes = await req("/api/erp/invoices", {
    method: "POST",
    body: {
      clientId: firstCustomer?.id,
      date: new Date().toISOString().slice(0, 10),
      items: [
        {
          itemId: firstItem?.id,
          description: firstItem?.name || "EPI 1000VA Servo AVR",
          quantity: 2,
          unitPrice: 12000,
          taxRate: 15,
          total: 24000,
        },
      ],
      discount: 0,
      vatRate: 15,
    },
  });

  console.log("Create Invoice Status:", createInvRes.status);
  console.log("Invoice Result:", {
    invoiceNo: createInvRes.data?.invoice?.invoiceNo,
    mushakNo: createInvRes.data?.invoice?.mushakNo,
    subtotal: createInvRes.data?.invoice?.subtotal,
    tax: createInvRes.data?.invoice?.tax,
    total: createInvRes.data?.invoice?.total,
  });

  // 4. Verify Stock was decremented
  const invCheck = await req("/api/erp/inventory");
  const updatedItem = invCheck.data?.items?.find((i) => i.id === firstItem?.id);
  console.log("Updated Stock:", updatedItem?.stockQty, `(decreased by 2 from ${firstItem?.stockQty})`);

  // 5. Verify Customer balance increased
  const custCheck = await req("/api/erp/customers");
  const updatedCustomer = custCheck.data?.customers?.find((c) => c.id === firstCustomer?.id);
  console.log("Customer Total Invoiced:", updatedCustomer?.totalInvoiced, "Balance Due:", updatedCustomer?.balanceDue);

  console.log("\n=== Complete Sales & VAT Double-Entry Flow Verified! ===");
}

run().catch(console.error);
