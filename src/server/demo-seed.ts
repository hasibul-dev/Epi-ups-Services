/* eslint-disable @typescript-eslint/no-explicit-any */
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { RESOURCES } from "@/lib/resource-config";
import { addDays } from "@/lib/utils";
import { hashPassword } from "./password";
import { createRow } from "./resources";
import { ensureBootstrap } from "./bootstrap";
import { getToday } from "./settings";

export const DEMO_PASSWORD = "Demo@12345";

/** OPTIONAL demo data. Never called automatically. Skips when clients already exist. */
export async function seedDemo(): Promise<{ seeded: boolean; message: string }> {
  await ensureBootstrap();
  const [{ n }] = await db.select({ n: count() }).from(S.clients);
  if (n > 0) return { seeded: false, message: "Demo data skipped: clients already exist. Demo data is only loaded into an empty system." };

  const today = await getToday();
  const d = (x: number) => addDays(today, x);
  const pw = await hashPassword(DEMO_PASSWORD);

  const demoUsers = [
    { username: "sales.manager", name: "Rahim Uddin", email: "rahim@epiups.demo", role: "manager", department: "sales" },
    { username: "sales.exec", name: "Nusrat Jahan", email: "nusrat@epiups.demo", role: "staff", department: "sales" },
    { username: "sabbir", name: "Sabbir Hossain", email: "sabbir@epiups.demo", role: "staff", department: "service" },
    { username: "tanvir", name: "Tanvir Ahmed", email: "tanvir@epiups.demo", role: "staff", department: "service" },
    { username: "service.manager", name: "Engr. Kamal Hasan", email: "kamal@epiups.demo", role: "manager", department: "service" },
    { username: "accountant", name: "Chief Accountant", email: "accounts@epiups.demo", role: "manager", department: "erp" },
    { username: "marketing", name: "Farhana Islam", email: "farhana@epiups.demo", role: "staff", department: "marketing" },
    { username: "it.support", name: "Md. Al-Amin", email: "alamin@epiups.demo", role: "staff", department: "it" },
    { username: "auditor", name: "Read Only Auditor", email: "auditor@epiups.demo", role: "readonly", department: "erp" },
  ];
  const ids: Record<string, number> = {};
  for (const u of demoUsers) {
    const [row] = await db.insert(S.users).values({ ...u, passwordHash: pw }).onConflictDoNothing().returning({ id: S.users.id });
    if (row) ids[u.username] = row.id;
    else {
      const [ex] = await db.select({ id: S.users.id }).from(S.users).where(eq(S.users.username, u.username));
      ids[u.username] = ex.id;
    }
  }

  const mk = async (key: string, body: Record<string, unknown>) => (await createRow(RESOURCES[key], body)).id as number;

  const clientData = [
    ["Trust Machineries Co., Ltd", "Md. Mahmudul Hasan", "01778-249416", "Mirpur, Dhaka-1216", "Industrial"],
    ["Horizon Commercial Tower", "Mina Chowdhury", "01833-220044", "Gulshan Avenue, Gulshan-2, Dhaka", "Corporate"],
    ["Apex Textile & Garments Ltd", "Faruk Ahmed", "01722-110022", "Ashulia, Savar, Dhaka", "Industrial"],
    ["Alpha Traders & Logistics", "Engr. Rahim Uddin", "01711-000001", "Motijheel C/A, Dhaka", "Corporate"],
    ["Vertex Power Solutions", "Rafiqul Islam", "01799-334455", "Plot 12, Gazipur Industrial Area", "Industrial"],
    ["Popular Diagnostic Centre", "Dr. Shamima Akter", "01912-556677", "Dhanmondi, Dhaka", "Healthcare"],
    ["Sonali Bank PLC - Branch Office", "Mr. Jahangir Alam", "01815-889900", "Agrabad, Chattogram", "Banking & Finance"],
    ["Green Valley University", "Prof. Anwar Hossain", "01611-223344", "Uttara, Dhaka", "Education"],
  ];
  const cid: number[] = [];
  for (const [i, c] of clientData.entries()) {
    cid.push(await mk("clients", { name: c[0], companyName: c[0], contactPerson: c[1], phone: c[2], address: c[3], category: c[4], email: `contact${i + 1}@example.com`, salespersonId: ids[i % 2 ? "sales.exec" : "sales.manager"], registrationDate: d(-60 + i * 5) }));
  }

  const work = [
    ["Quotation for 10kVA online UPS", 0, "Quotation", -6, -2, "high", "in_progress"],
    ["Product demo — 3-phase UPS", 1, "Product Demo", -3, 0, "normal", "new"],
    ["Negotiation: AMC contract", 2, "Negotiation", -10, -4, "urgent", "in_progress"],
    ["Payment collection — Invoice follow-up", 3, "Payment Collection", -5, 3, "normal", "new"],
    ["Site visit for battery bank sizing", 4, "Site Visit", -1, 4, "normal", "new"],
    ["Order follow-up: 20kVA UPS", 5, "Order Follow-up", -20, -15, "high", "completed"],
    ["Renewal proposal", 6, "Quotation", -2, 7, "low", "new"],
    ["Technical presentation", 7, "Product Demo", -12, -8, "normal", "completed"],
  ] as const;
  const wid: number[] = [];
  for (const w of work) wid.push(await mk("sales_work", { title: w[0], clientId: cid[w[1]], category: w[2], assignedTo: ids[w[1] % 2 ? "sales.exec" : "sales.manager"], startDate: d(w[3]), dueDate: d(w[4]), priority: w[5], status: w[6], followUpDate: d(w[4] + 2), description: "Demo record" }));

  const fu = [[0, -2, "call", "pending"], [1, 0, "visit", "pending"], [2, -1, "email", "pending"], [3, 2, "call", "pending"], [4, 5, "meeting", "pending"], [5, -10, "call", "done"]] as const;
  for (const f of fu) await mk("follow_ups", { clientId: cid[f[0]], workId: wid[f[0]], type: f[2], dueDate: d(f[1]), status: f[3], assignedTo: ids["sales.exec"], notes: "Confirm decision and next steps" });

  const svc: [string, string, number, number, string, string, string, Record<string, unknown>][] = [
    ["installation", "Install & commission 10kVA online UPS with battery cabinet", 0, -3, "sabbir", "high", "scheduled", { capacity: "10 kVA", productModel: "EPI Online 10kVA 3:1", location: "Factory floor, Mirpur", commissioningStatus: "pending", checklist: "Rack mount, cabling, earthing, load bank test" }],
    ["maintenance", "Quarterly battery bank voltage & impedance inspection", 1, -2, "tanvir", "normal", "scheduled", { equipment: "16 x 12V 100Ah battery bank", maintenanceType: "preventive", nextMaintenanceDate: d(88) }],
    ["servicing", "AVR voltage step-down & relay calibration", 2, 0, "sabbir", "urgent", "in_progress", { upsModel: "EPI AVR 5kVA", serialNumber: "AVR5K-2291" }],
    ["general", "Warehouse spare parts stock audit & battery charging", 3, 1, "tanvir", "normal", "scheduled", {}],
    ["installation", "Server room main UPS commissioning & earthing audit", 4, 2, "sabbir", "high", "scheduled", { capacity: "10 kVA redundant", productModel: "EPI Online 10kVA", location: "Server room", commissioningStatus: "testing" }],
    ["maintenance", "AMC visit — Online UPS 3kVA", 5, 4, "tanvir", "normal", "scheduled", { equipment: "Online UPS 3kVA", maintenanceType: "amc", nextMaintenanceDate: d(94) }],
    ["servicing", "Inverter board repair", 6, -8, "sabbir", "normal", "completed", { upsModel: "EPI Hybrid 3kVA", serialNumber: "HYB3K-1188", completedDate: d(-7) }],
    ["installation", "Campus backup UPS installation", 7, -15, "tanvir", "high", "completed", { capacity: "20 kVA", productModel: "EPI Online 20kVA", location: "Admin building", commissioningStatus: "handed_over", completedDate: d(-12) }],
    ["servicing", "Battery replacement — 2kVA UPS", 1, 0, "sabbir", "normal", "scheduled", { upsModel: "EPI Line-Interactive 2kVA", serialNumber: "LI2K-5530" }],
  ];
  for (const s of svc) await mk("service_all", { category: s[0], title: s[1], clientId: cid[s[2]], scheduledDate: d(s[3]), technicianId: ids[s[4]], priority: s[5], status: s[6], description: "Demo record", ...s[7] });

  const warr = [[0, "EPI Online UPS 10kVA", "ON10K-0001", -340, 25], [2, "EPI AVR 5kVA", "AVR5K-2291", -300, 65], [5, "EPI Online UPS 20kVA", "ON20K-0457", -700, -5], [7, "EPI Online UPS 20kVA", "ON20K-0510", -12, 353], [1, "EPI Battery 12V 100Ah x16", "BAT100-BANK", -200, 530]] as const;
  for (const w of warr) await mk("warranties", { clientId: cid[w[0]], product: w[1], serialNumber: w[2], purchaseDate: d(w[3]), warrantyStart: d(w[3]), warrantyExpiry: d(w[4]), status: "active" });

  const camp = [
    ["EPI Industrial Online UPS Summer Shield 2026", "facebook_linkedin", 65000, 38400, 112, 48000, 2100, "active"],
    ["Garments & Spinning Mill Servo AVR Protection Drive", "linkedin", 45000, 42000, 74, 31000, 1500, "active"],
    ["Hospital & Healthcare Diagnostic Power Continuity", "email", 30000, 12500, 19, 9000, 380, "active"],
    ["Winter Battery Care", "facebook", 20000, 19800, 41, 25000, 900, "completed"],
  ] as const;
  const camId: number[] = [];
  for (const c of camp) camId.push(await mk("campaigns", { name: c[0], channel: c[1], budget: c[2], spent: c[3], leads: c[4], impressions: c[5], clicks: c[6], status: c[7], startDate: d(-45), endDate: d(30), assignedTo: ids["marketing"], objective: "Lead generation" }));
  const posts = [["Why every factory needs an online UPS", "facebook", 0, "published", -10, 4200, 310, 12], ["AVR vs UPS — what to choose?", "linkedin", 1, "published", -6, 3100, 280, 18], ["Battery care checklist", "facebook", 0, "published", -3, 2500, 190, 7], ["Case study: Healthcare power continuity", "linkedin", 2, "scheduled", 3, 0, 0, 0], ["Summer Shield offer", "facebook", 0, "draft", 6, 0, 0, 0]] as const;
  for (const p of posts) await mk("social_posts", { title: p[0], platform: p[1], campaignId: camId[p[2]], status: p[3], scheduledDate: d(p[4]), publishedDate: p[3] === "published" ? d(p[4]) : "", reach: p[5], engagement: p[6], leads: p[7], assignedTo: ids["marketing"] });
  for (const t of [["Design Q3 brochure", -2, "in_progress"], ["Update LinkedIn company page", 3, "todo"], ["Prepare campaign report", 7, "todo"]] as const) await mk("marketing_tasks", { title: t[0], dueDate: d(t[1]), status: t[2], assignedTo: ids["marketing"], campaignId: camId[0], priority: "normal" });

  const dev: number[] = [];
  for (const v of [["Dell Latitude 5420", "Laptop", "Dell", "Latitude 5420", "DL5420-001", "MD. MAHMUDUL HASAN", "Sales", 400, 330, "active"], ["Canon LBP-2900", "Printer", "Canon", "LBP-2900", "CN2900-77", "Accounts desk", "Accounts & ERP", 900, -170, "in_repair"], ["HP ProDesk 400", "Desktop", "HP", "ProDesk 400 G7", "HP400-210", "Chief Accountant", "Accounts & ERP", 500, 230, "active"], ["Core Switch 24-port", "Network", "TP-Link", "TL-SG3428", "TL3428-09", "IT Room", "IT", 700, 20, "active"], ["Lenovo ThinkPad E14", "Laptop", "Lenovo", "E14 Gen 3", "LT-E14-33", "Farhana Islam", "Marketing", 120, 610, "active"], ["Spare UPS 1kVA", "UPS", "EPI", "Line-Interactive 1kVA", "EPI1K-11", "IT Room", "IT", 200, 530, "spare"]] as const)
    dev.push(await mk("devices", { name: v[0], type: v[1], brand: v[2], model: v[3], serialNumber: v[4], assignedEmployee: v[5], department: v[6], purchaseDate: d(-v[7]), warrantyExpiry: d(v[8]), status: v[9] }));
  const tickets = [["Laptop display flickering & battery not charging", "MD. MAHMUDUL HASAN", "Sales", 0, "high", "in_progress"], ["Network printer offline", "Chief Accountant", "Accounts & ERP", 1, "high", "open"], ["Email access request", "Nusrat Jahan", "Sales", -1, "normal", "pending"], ["Antivirus license renewal", "Farhana Islam", "Marketing", 4, "low", "resolved"], ["Wi-Fi dead zone in warehouse", "Sabbir Hossain", "Service", -1, "urgent", "closed"]] as const;
  for (const t of tickets) await mk("it_tickets", { subject: t[0], userName: t[1], department: t[2], deviceId: t[3] >= 0 ? dev[t[3]] : "", issue: t[0], priority: t[4], status: t[5], technicianId: ids["it.support"], resolution: ["resolved", "closed"].includes(t[5]) ? "Resolved by IT team" : "" });
  for (const t of [["Quarterly backup verification", 5, "todo"], ["Patch Windows workstations", -1, "in_progress"]] as const) await mk("it_tasks", { title: t[0], dueDate: d(t[1]), status: t[2], assignedTo: ids["it.support"], priority: "normal" });

  const inv: number[] = [];
  for (const v of [[0, -30, -1, 150000, 0, "issued"], [2, -20, 10, 96000, 0, "issued"], [3, -45, -15, 172500, 0, "issued"], [5, -5, 25, 62000, 0, "issued"], [1, -2, 28, 38000, 0, "draft"]] as const)
    inv.push(await mk("invoices", { clientId: cid[v[0]], issueDate: d(v[1]), dueDate: d(v[2]), subtotal: v[3], tax: v[4], status: v[5], notes: "Demo invoice (tax entered manually)" }));
  await mk("payments", { direction: "received", invoiceId: inv[0], paymentDate: d(-10), amount: 100000, method: "bank", reference: "TRX-9001" });
  await mk("payments", { direction: "received", invoiceId: inv[1], paymentDate: d(-3), amount: 96000, method: "bkash", reference: "BK-5521" });
  await mk("purchases", { supplier: "Power Components Ltd", purchaseDate: d(-25), dueDate: d(5), amount: 210000, status: "received" });
  await mk("purchases", { supplier: "Battery Import House", purchaseDate: d(-8), dueDate: d(20), amount: 84000, status: "pending" });
  await mk("payments", { direction: "paid", party: "Power Components Ltd", paymentDate: d(-6), amount: 100000, method: "cheque", reference: "CHQ-0044" });
  for (const e of [["Office Rent", 45000, -4], ["Utilities", 8200, -3], ["Transport", 5400, -2], ["Salaries", 120000, -1]] as const) await mk("expenses", { expenseDate: d(e[2]), category: e[0], amount: e[1], payee: "Various", method: "bank" });
  await mk("incomes", { incomeDate: d(-7), category: "Scrap Sale", source: "Old battery scrap", amount: 18500, method: "cash" });
  await mk("incomes", { incomeDate: d(-14), category: "Interest", source: "Bank interest", amount: 4200, method: "bank" });

  return { seeded: true, message: `Demo data loaded. Demo users share the password "${DEMO_PASSWORD}".` };
}
