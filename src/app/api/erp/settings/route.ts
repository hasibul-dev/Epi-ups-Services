import { NextResponse } from "next/server";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const GET = apiHandler(async () => {
  await requireUser();
  const settings = await getSettings();

  return NextResponse.json({
    companyName: settings["company.name"] || "EPI UPS Bangladesh Limited",
    bin: settings["company.bin"] || "001894562-0101",
    tin: settings["company.tin"] || "482910485912",
    address: settings["company.address"] || "House #24, Road #05, Dhanmondi, Dhaka-1205, Bangladesh",
    phone: settings["company.phone"] || "+880 2 9123456 / +880 1712-345678",
    email: settings["company.email"] || "accounts@epiups.com.bd",
    currency: settings["company.currency"] || "BDT",
    currencySymbol: settings["company.currencySymbol"] || "৳",
    vatRate: settings["company.vatRate"] || "15",
    fiscalYear: settings["company.fiscalYear"] || "July – June",
    voucherPrefixJV: settings["numbering.jv"] || "JV",
    voucherPrefixPV: settings["numbering.pv"] || "PV",
    voucherPrefixRV: settings["numbering.rv"] || "RV",
    invoicePrefix: settings["numbering.inv"] || "INV",
    purchasePrefix: settings["numbering.pur"] || "PUR",
  });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();

  const entries: [string, string][] = [
    ["company.name", body.companyName?.trim() || ""],
    ["company.bin", body.bin?.trim() || ""],
    ["company.tin", body.tin?.trim() || ""],
    ["company.address", body.address?.trim() || ""],
    ["company.phone", body.phone?.trim() || ""],
    ["company.email", body.email?.trim() || ""],
    ["company.currency", body.currency?.trim() || "BDT"],
    ["company.currencySymbol", body.currencySymbol?.trim() || "৳"],
    ["company.vatRate", String(body.vatRate || "15")],
    ["company.fiscalYear", body.fiscalYear?.trim() || "July – June"],
    ["numbering.jv", body.voucherPrefixJV?.trim() || "JV"],
    ["numbering.pv", body.voucherPrefixPV?.trim() || "PV"],
    ["numbering.rv", body.voucherPrefixRV?.trim() || "RV"],
    ["numbering.inv", body.invoicePrefix?.trim() || "INV"],
    ["numbering.pur", body.purchasePrefix?.trim() || "PUR"],
  ];

  for (const [key, value] of entries) {
    if (value) {
      await db
        .insert(S.settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: S.settings.key, set: { value } });
    }
  }

  return NextResponse.json({ ok: true, message: "Accounts settings saved successfully" });
});
