import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getSettings, getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const today = await getToday();
  const month = url.searchParams.get("month") || today.slice(0, 7); // YYYY-MM
  const [yStr, mStr] = month.split("-");
  const yr = parseInt(yStr, 10);
  const mo = parseInt(mStr, 10);
  const lastDay = new Date(yr, mo, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  const settings = await getSettings();
  const bin = settings["company.bin"] || "001894562-0101";
  const companyName = settings["company.name"] || "EPI UPS Bangladesh Limited";

  // 1. Output VAT (from Sales Invoices issued in month)
  const salesInvoices = await db
    .select({
      id: S.invoices.id,
      invoiceNo: S.invoices.invoiceNo,
      mushakNo: S.invoices.mushakNo,
      clientName: S.clients.name,
      issueDate: S.invoices.issueDate,
      subtotal: S.invoices.subtotal,
      discount: S.invoices.discount,
      vatRate: S.invoices.vatRate,
      tax: S.invoices.tax,
      total: S.invoices.total,
    })
    .from(S.invoices)
    .innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId))
    .where(and(eq(S.invoices.status, "issued"), gte(S.invoices.issueDate, monthStart), lte(S.invoices.issueDate, monthEnd)))
    .orderBy(desc(S.invoices.issueDate));

  const totalSalesTaxable = r2(salesInvoices.reduce((s, inv) => s + (Number(inv.subtotal) - Number(inv.discount || 0)), 0));
  const totalOutputVat = r2(salesInvoices.reduce((s, inv) => s + Number(inv.tax || 0), 0));

  // 2. Input VAT (from Purchases in month)
  const purchases = await db
    .select({
      id: S.purchases.id,
      purchaseNo: S.purchases.purchaseNo,
      billNo: S.purchases.billNo,
      supplier: S.purchases.supplier,
      purchaseDate: S.purchases.purchaseDate,
      subtotal: S.purchases.subtotal,
      tax: S.purchases.tax,
      amount: S.purchases.amount,
    })
    .from(S.purchases)
    .where(and(gte(S.purchases.purchaseDate, monthStart), lte(S.purchases.purchaseDate, monthEnd)));

  const totalPurchasesTaxable = r2(purchases.reduce((s, p) => s + Number(p.subtotal || p.amount || 0), 0));
  const totalInputVatRebate = r2(purchases.reduce((s, p) => s + Number(p.tax || 0), 0));

  // 3. Net Tax Payable (Output VAT - Input VAT)
  const netVatPayable = r2(totalOutputVat - totalInputVatRebate);

  return NextResponse.json({
    month,
    company: { name: companyName, bin },
    outputVat: {
      salesTaxable: totalSalesTaxable,
      vatAmount: totalOutputVat,
      invoices: salesInvoices,
    },
    inputVat: {
      purchasesTaxable: totalPurchasesTaxable,
      rebateAmount: totalInputVatRebate,
      purchases,
    },
    netVatPayable,
    mushak91: {
      part3_supplies: [
        { note: "Note 1", description: "Standard Rated Local Sales (15%)", value: totalSalesTaxable, tax: totalOutputVat },
        { note: "Note 2", description: "Exempted / Zero Rated Sales", value: 0, tax: 0 },
      ],
      part4_purchases: [
        { note: "Note 10", description: "Standard Rated Local Purchases (15%)", value: totalPurchasesTaxable, tax: totalInputVatRebate },
      ],
      part5_net_tax: {
        totalOutputTax: totalOutputVat,
        totalInputTaxRebate: totalInputVatRebate,
        netTaxPayable: netVatPayable > 0 ? netVatPayable : 0,
        closingBalanceRefundable: netVatPayable < 0 ? Math.abs(netVatPayable) : 0,
      },
    },
  });
});
