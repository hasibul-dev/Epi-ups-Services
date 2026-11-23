/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { AppError } from "./api";
import { getSettings, getToday } from "./settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export async function getNextSequence(prefix: string, table: string, col: string): Promise<string> {
  const year = (await getToday()).slice(0, 4);
  const pattern = `${prefix}-${year}-%`;
  const [last] = await db
    .select({ val: (S as any)[table][col] })
    .from((S as any)[table])
    .where(ilike((S as any)[table][col], pattern))
    .orderBy(desc((S as any)[table].id))
    .limit(1);

  let seq = 1;
  if (last?.val) {
    const parts = String(last.val).split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) seq = num + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/* ───────── VOUCHERS & JOURNAL ───────── */

export interface VoucherLine {
  accountId?: number;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export async function createVoucher(data: {
  voucherType: "journal" | "payment" | "receipt" | "contra" | "adjustment";
  date: string;
  reference?: string;
  description?: string;
  lines: VoucherLine[];
  status?: "draft" | "posted";
  userId?: number;
}) {
  const today = await getToday();
  const date = data.date || today;
  const status = data.status || "posted";
  const lines = data.lines || [];

  if (lines.length < 2) {
    throw new AppError(400, "A voucher must have at least two line entries (Debit and Credit)");
  }

  const totalDebit = r2(lines.reduce((s, l) => s + Number(l.debit || 0), 0));
  const totalCredit = r2(lines.reduce((s, l) => s + Number(l.credit || 0), 0));

  if (status === "posted" && Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new AppError(
      400,
      `Unbalanced voucher: Total Debit (৳${totalDebit.toFixed(2)}) must equal Total Credit (৳${totalCredit.toFixed(2)})`
    );
  }

  const prefixMap: Record<string, string> = {
    journal: "JV",
    payment: "PV",
    receipt: "RV",
    contra: "CV",
    adjustment: "AV",
  };
  const prefix = prefixMap[data.voucherType] || "JV";
  const voucherNo = await getNextSequence(prefix, "vouchers", "voucherNo");

  return db.transaction(async (tx) => {
    const [voucher] = await tx
      .insert(S.vouchers)
      .values({
        voucherNo,
        voucherType: data.voucherType,
        date,
        reference: data.reference || null,
        description: data.description || null,
        totalAmount: totalDebit,
        status,
        lines,
        createdBy: data.userId || null,
        postedAt: status === "posted" ? date : null,
      })
      .returning();

    if (status === "posted") {
      for (const line of lines) {
        const dr = r2(line.debit || 0);
        const cr = r2(line.credit || 0);
        if (dr > 0 || cr > 0) {
          let accName = line.accountName;
          let accCode = line.accountCode;

          // Lookup account if name is missing or for balance updating
          const cond = line.accountId ? eq(S.accounts.id, line.accountId) : eq(S.accounts.code, accCode);
          const [acc] = await tx.select().from(S.accounts).where(cond).limit(1);
          if (acc) {
            accName = accName || acc.name;
            accCode = accCode || acc.code;
          }

          const accountTitle = accName ? `${accCode} — ${accName}` : accCode;

          await tx.insert(S.ledgerEntries).values({
            entryDate: date,
            account: accountTitle,
            description: line.description || data.description || `Voucher ${voucherNo}`,
            debit: dr,
            credit: cr,
            voucherNo,
            voucherType: data.voucherType,
            refType: "vouchers",
            refId: voucher.id,
            isPosted: true,
          });

          // Update running balance on account if exists
          if (acc) {
            const normalBalance = acc.type === "asset" || acc.type === "expense" ? 1 : -1;
            const delta = (dr - cr) * normalBalance;
            await tx
              .update(S.accounts)
              .set({ balance: sql`${S.accounts.balance} + ${delta}`, updatedAt: new Date() })
              .where(eq(S.accounts.id, acc.id));
          }
        }
      }
    }

    return voucher;
  });
}

/* ───────── SALES INVOICE INTEGRATION ───────── */

export interface InvoiceItem {
  code?: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  vatRate?: number;
  total: number;
}

export async function createSalesInvoice(data: {
  clientId: number;
  issueDate: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  vatRate?: number;
  tax?: number;
  total: number;
  notes?: string;
  mushakNo?: string;
  status?: string;
}) {
  const today = await getToday();
  const issueDate = data.issueDate || today;
  const status = data.status || "issued";
  const invoiceNo = await getNextSequence("INV", "invoices", "invoiceNo");

  const [client] = await db.select().from(S.clients).where(eq(S.clients.id, data.clientId)).limit(1);
  if (!client) throw new AppError(400, "Client not found");

  let subtotal = r2(data.subtotal);
  if (!subtotal && data.items && data.items.length) {
    subtotal = r2(
      data.items.reduce(
        (s, it) =>
          s +
          Number(
            it.total ||
              Number(it.qty || (it as any).quantity || 1) * Number(it.unitPrice || 0)
          ),
        0
      )
    );
  }
  const discount = r2(data.discount || 0);
  const vatRate = Number(data.vatRate ?? 15);
  const tax = r2(data.tax || Math.max(0, subtotal - discount) * (vatRate / 100));
  const total = r2(data.total || Math.max(0, subtotal - discount) + tax);

  return db.transaction(async (tx) => {
    const [inv] = await tx
      .insert(S.invoices)
      .values({
        invoiceNo,
        clientId: data.clientId,
        issueDate,
        dueDate: data.dueDate || null,
        subtotal,
        discount,
        vatRate,
        tax,
        total,
        paidAmount: 0,
        items: data.items,
        mushakNo: data.mushakNo || `MUSHAK-6.3-${invoiceNo.replace("INV-", "")}`,
        status,
        notes: data.notes || null,
      })
      .returning();

    if (status === "issued") {
      // 1. Post to double-entry ledger
      // Dr Accounts Receivable (Customer)
      await tx.insert(S.ledgerEntries).values({
        entryDate: issueDate,
        account: "1020 — Accounts Receivable (Trade Debtors)",
        description: `Invoice ${invoiceNo} — ${client.name}`,
        debit: total,
        credit: 0,
        voucherNo: invoiceNo,
        voucherType: "sales_invoice",
        partyType: "customer",
        partyId: client.id,
        refType: "invoices",
        refId: inv.id,
        isPosted: true,
      });

      // Cr Sales Revenue (Net)
      const netSales = r2(subtotal - discount);
      if (netSales > 0) {
        await tx.insert(S.ledgerEntries).values({
          entryDate: issueDate,
          account: "4010 — UPS Sales Revenue",
          description: `Invoice ${invoiceNo} — ${client.name}`,
          debit: 0,
          credit: netSales,
          voucherNo: invoiceNo,
          voucherType: "sales_invoice",
          partyType: "customer",
          partyId: client.id,
          refType: "invoices",
          refId: inv.id,
          isPosted: true,
        });
      }

      // Cr VAT Payable (Mushak 9.1 Output VAT)
      if (tax > 0) {
        await tx.insert(S.ledgerEntries).values({
          entryDate: issueDate,
          account: "2020 — VAT Payable (Mushak 9.1 Output - Input)",
          description: `VAT on Invoice ${invoiceNo} (${vatRate}%) — ${client.name}`,
          debit: 0,
          credit: tax,
          voucherNo: invoiceNo,
          voucherType: "sales_invoice",
          partyType: "customer",
          partyId: client.id,
          refType: "invoices",
          refId: inv.id,
          isPosted: true,
        });
      }

      // 2. Reduce stock for inventory items & record COGS
      for (const it of data.items || []) {
        const qty = Number(it.qty || (it as any).quantity || 1);
        const itemId = (it as any).itemId;
        let invItem = null;
        if (itemId) {
          [invItem] = await tx.select().from(S.inventoryItems).where(eq(S.inventoryItems.id, Number(itemId))).limit(1);
        } else if (it.code) {
          [invItem] = await tx.select().from(S.inventoryItems).where(eq(S.inventoryItems.code, it.code)).limit(1);
        }

        if (invItem && qty > 0) {
          await tx
            .update(S.inventoryItems)
            .set({
              currentStock: sql`GREATEST(0, ${S.inventoryItems.currentStock} - ${qty})`,
              updatedAt: new Date(),
            })
            .where(eq(S.inventoryItems.id, invItem.id));

          await tx.insert(S.inventoryTransactions).values({
            itemId: invItem.id,
            type: "stock_out",
            date: issueDate,
            quantity: qty,
            unitCost: invItem.purchasePrice,
            refType: "invoice",
            refId: inv.id,
            notes: `Sold via Invoice ${invoiceNo}`,
          });

          // If purchase price is set, record COGS Dr & Inventory Cr
          const cogs = r2(Number(invItem.purchasePrice || 0) * qty);
          if (cogs > 0) {
            await tx.insert(S.ledgerEntries).values({
              entryDate: issueDate,
              account: "5010 — Cost of Goods Sold (COGS)",
              description: `COGS: ${invItem.name} (${qty} ${invItem.unit}) on ${invoiceNo}`,
              debit: cogs,
              credit: 0,
              voucherNo: invoiceNo,
              refType: "invoices",
              refId: inv.id,
              isPosted: true,
            });
            await tx.insert(S.ledgerEntries).values({
              entryDate: issueDate,
              account: "1030 — Merchandise Inventory",
              description: `Inventory reduction: ${invItem.name} (${qty} ${invItem.unit}) on ${invoiceNo}`,
              debit: 0,
              credit: cogs,
              voucherNo: invoiceNo,
              refType: "invoices",
              refId: inv.id,
              isPosted: true,
            });
          }
        }
      }
    }

    return inv;
  });
}

/* ───────── PURCHASE BILL INTEGRATION ───────── */

export interface PurchaseItem {
  code?: string;
  name: string;
  qty: number;
  unitCost: number;
  discount?: number;
  vatRate?: number;
  total: number;
}

export async function createPurchaseBill(data: {
  supplierId?: number;
  supplierName: string;
  purchaseDate: string;
  dueDate?: string;
  items: PurchaseItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  amount: number;
  billNo?: string;
  notes?: string;
  status?: string;
}) {
  const today = await getToday();
  const purchaseDate = data.purchaseDate || today;
  const status = data.status || "approved";
  const purchaseNo = await getNextSequence("PUR", "purchases", "purchaseNo");

  let supplierId = data.supplierId;
  const supplierName = data.supplierName.trim();

  return db.transaction(async (tx) => {
    // If supplierId not provided, lookup or create supplier
    if (!supplierId) {
      const [existingSup] = await tx
        .select()
        .from(S.suppliers)
        .where(ilike(S.suppliers.name, supplierName))
        .limit(1);
      if (existingSup) {
        supplierId = existingSup.id;
      } else {
        const [newSup] = await tx
          .insert(S.suppliers)
          .values({
            name: supplierName,
            companyName: supplierName,
            status: "active",
          })
          .returning();
        supplierId = newSup.id;
      }
    }

    let subtotal = r2(data.subtotal);
    if (!subtotal && data.items && data.items.length) {
      subtotal = r2(
        data.items.reduce(
          (s, it) =>
            s +
            Number(
              it.total ||
                Number(it.qty || (it as any).quantity || 1) * Number(it.unitCost || (it as any).unitPrice || 0)
            ),
          0
        )
      );
    }
    const discount = r2(data.discount || 0);
    const tax = r2(data.tax || 0);
    const amount = r2(data.amount || Math.max(0, subtotal - discount) + tax);

    const [purchase] = await tx
      .insert(S.purchases)
      .values({
        purchaseNo,
        supplier: supplierName,
        supplierId,
        purchaseDate,
        dueDate: data.dueDate || null,
        subtotal,
        discount,
        tax,
        amount,
        paidAmount: 0,
        items: data.items,
        billNo: data.billNo || null,
        status,
        notes: data.notes || null,
      })
      .returning();

    if (status !== "cancelled") {
      // 1. Post to double-entry ledger
      // Dr Merchandise Inventory / Purchases: subtotal - discount
      const netPurchases = r2(subtotal - discount);
      if (netPurchases > 0) {
        await tx.insert(S.ledgerEntries).values({
          entryDate: purchaseDate,
          account: "1030 — Merchandise Inventory",
          description: `Purchase ${purchaseNo} — ${supplierName}`,
          debit: netPurchases,
          credit: 0,
          voucherNo: purchaseNo,
          voucherType: "purchase_bill",
          partyType: "supplier",
          partyId: supplierId,
          refType: "purchases",
          refId: purchase.id,
          isPosted: true,
        });
      }

      // Dr VAT Input Credit: tax
      if (tax > 0) {
        await tx.insert(S.ledgerEntries).values({
          entryDate: purchaseDate,
          account: "2020 — VAT Payable (Mushak 9.1 Output - Input)",
          description: `Input VAT rebate on Purchase ${purchaseNo} — ${supplierName}`,
          debit: tax, // Debit to liability decreases VAT Payable!
          credit: 0,
          voucherNo: purchaseNo,
          voucherType: "purchase_bill",
          partyType: "supplier",
          partyId: supplierId,
          refType: "purchases",
          refId: purchase.id,
          isPosted: true,
        });
      }

      // Cr Accounts Payable (Supplier)
      await tx.insert(S.ledgerEntries).values({
        entryDate: purchaseDate,
        account: "2010 — Accounts Payable (Trade Creditors)",
        description: `Bill ${purchaseNo} — ${supplierName}`,
        debit: 0,
        credit: amount,
        voucherNo: purchaseNo,
        voucherType: "purchase_bill",
        partyType: "supplier",
        partyId: supplierId,
        refType: "purchases",
        refId: purchase.id,
        isPosted: true,
      });

      // 2. Increase stock for inventory items
      for (const it of data.items || []) {
        const qty = Number(it.qty || (it as any).quantity || 1);
        const itemId = (it as any).itemId;
        let invItem = null;
        if (itemId) {
          [invItem] = await tx.select().from(S.inventoryItems).where(eq(S.inventoryItems.id, Number(itemId))).limit(1);
        } else if (it.code) {
          [invItem] = await tx.select().from(S.inventoryItems).where(eq(S.inventoryItems.code, it.code)).limit(1);
        }

        if (invItem && qty > 0) {
          const unitPrice = Number(it.unitCost || (it as any).unitPrice || 0);
          await tx
            .update(S.inventoryItems)
            .set({
              currentStock: sql`${S.inventoryItems.currentStock} + ${qty}`,
              purchasePrice: unitPrice > 0 ? unitPrice : S.inventoryItems.purchasePrice,
              updatedAt: new Date(),
            })
            .where(eq(S.inventoryItems.id, invItem.id));

          await tx.insert(S.inventoryTransactions).values({
            itemId: invItem.id,
            type: "stock_in",
            date: purchaseDate,
            quantity: qty,
            unitCost: unitPrice,
            refType: "purchase",
            refId: purchase.id,
            notes: `Purchased via ${purchaseNo}`,
          });
        }
      }

      // 3. Update supplier payable balance
      if (supplierId) {
        await tx
          .update(S.suppliers)
          .set({
            payableBalance: sql`${S.suppliers.payableBalance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(S.suppliers.id, supplierId));
      }
    }

    return purchase;
  });
}

/* ───────── CENTRALIZED PAYMENTS & RECEIPTS ───────── */

export async function createPayment(data: {
  direction: "received" | "paid";
  clientId?: number;
  supplierId?: number;
  invoiceId?: number;
  purchaseId?: number;
  party?: string;
  category?: string;
  amount: number;
  paymentDate: string;
  method: string; // cash | bank | bkash | cheque | card
  reference?: string;
  notes?: string;
}) {
  const today = await getToday();
  const paymentDate = data.paymentDate || today;
  const amount = r2(data.amount);
  if (amount <= 0) throw new AppError(400, "Payment amount must be greater than zero");

  const paymentNo = await getNextSequence("PAY", "payments", "paymentNo");
  const isBank = data.method === "bank" || data.method === "cheque" || data.method === "card";
  const cashBankAccount = isBank ? "1012 — City Bank A/C #1102938475" : "1011 — Cash in Hand";

  return db.transaction(async (tx) => {
    let partyName = data.party || "";
    if (data.clientId) {
      const [c] = await tx.select().from(S.clients).where(eq(S.clients.id, data.clientId)).limit(1);
      if (c) partyName = c.name;
    } else if (data.supplierId) {
      const [s] = await tx.select().from(S.suppliers).where(eq(S.suppliers.id, data.supplierId)).limit(1);
      if (s) partyName = s.name;
    }

    const [pay] = await tx
      .insert(S.payments)
      .values({
        paymentNo,
        direction: data.direction,
        clientId: data.clientId || null,
        invoiceId: data.invoiceId || null,
        supplierId: data.supplierId || null,
        purchaseId: data.purchaseId || null,
        category: data.category || (data.direction === "received" ? "Customer Receipt" : "Supplier Payment"),
        party: partyName,
        paymentDate,
        amount,
        method: data.method,
        reference: data.reference || null,
        notes: data.notes || null,
      })
      .returning();

    if (data.direction === "received") {
      // Customer Receipt: Dr Cash/Bank, Cr Accounts Receivable
      await tx.insert(S.ledgerEntries).values({
        entryDate: paymentDate,
        account: cashBankAccount,
        description: `Receipt ${paymentNo} — ${partyName} (${data.method.toUpperCase()})`,
        debit: amount,
        credit: 0,
        voucherNo: paymentNo,
        voucherType: "receipt",
        partyType: "customer",
        partyId: data.clientId || null,
        refType: "payments",
        refId: pay.id,
        isPosted: true,
      });

      await tx.insert(S.ledgerEntries).values({
        entryDate: paymentDate,
        account: "1020 — Accounts Receivable (Trade Debtors)",
        description: `Payment received against ${data.invoiceId ? `Invoice #${data.invoiceId}` : "account"} — ${partyName}`,
        debit: 0,
        credit: amount,
        voucherNo: paymentNo,
        voucherType: "receipt",
        partyType: "customer",
        partyId: data.clientId || null,
        refType: "payments",
        refId: pay.id,
        isPosted: true,
      });

      if (data.invoiceId) {
        await tx
          .update(S.invoices)
          .set({ paidAmount: sql`${S.invoices.paidAmount} + ${amount}`, updatedAt: new Date() })
          .where(eq(S.invoices.id, data.invoiceId));
      }
    } else {
      // Supplier / Expense Payment: Dr Accounts Payable, Cr Cash/Bank
      await tx.insert(S.ledgerEntries).values({
        entryDate: paymentDate,
        account: "2010 — Accounts Payable (Trade Creditors)",
        description: `Payment ${paymentNo} — ${partyName}`,
        debit: amount,
        credit: 0,
        voucherNo: paymentNo,
        voucherType: "payment",
        partyType: "supplier",
        partyId: data.supplierId || null,
        refType: "payments",
        refId: pay.id,
        isPosted: true,
      });

      await tx.insert(S.ledgerEntries).values({
        entryDate: paymentDate,
        account: cashBankAccount,
        description: `Payment ${paymentNo} — ${partyName} (${data.method.toUpperCase()})`,
        debit: 0,
        credit: amount,
        voucherNo: paymentNo,
        voucherType: "payment",
        partyType: "supplier",
        partyId: data.supplierId || null,
        refType: "payments",
        refId: pay.id,
        isPosted: true,
      });

      if (data.purchaseId) {
        await tx
          .update(S.purchases)
          .set({ paidAmount: sql`${S.purchases.paidAmount} + ${amount}`, updatedAt: new Date() })
          .where(eq(S.purchases.id, data.purchaseId));
      }
      if (data.supplierId) {
        await tx
          .update(S.suppliers)
          .set({ payableBalance: sql`GREATEST(0, ${S.suppliers.payableBalance} - ${amount})`, updatedAt: new Date() })
          .where(eq(S.suppliers.id, data.supplierId));
      }
    }

    return pay;
  });
}

/* ───────── FINANCIAL REPORTS CALCULATOR ───────── */

export async function getFinancialSummary(from?: string, to?: string) {
  const today = await getToday();
  const curTo = to || today;
  const curFrom = from || `${today.slice(0, 7)}-01`;

  const [revRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.credit} - ${S.ledgerEntries.debit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "4%"), gte(S.ledgerEntries.entryDate, curFrom), lte(S.ledgerEntries.entryDate, curTo)));

  const [expRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "5%"), gte(S.ledgerEntries.entryDate, curFrom), lte(S.ledgerEntries.entryDate, curTo)));

  const revenue = r2(Number(revRow?.s || 0));
  const expense = r2(Number(expRow?.s || 0));
  const netProfit = r2(revenue - expense);

  // Cash and Bank balances
  const [cashRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "%1011%"), lte(S.ledgerEntries.entryDate, curTo)));

  const [bankRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(or(ilike(S.ledgerEntries.account, "%1012%"), ilike(S.ledgerEntries.account, "%1013%")), lte(S.ledgerEntries.entryDate, curTo)));

  // Receivables & Payables
  const [arRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "%1020%"), lte(S.ledgerEntries.entryDate, curTo)));

  const [apRow] = await db
    .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.credit} - ${S.ledgerEntries.debit}), 0)::float` })
    .from(S.ledgerEntries)
    .where(and(ilike(S.ledgerEntries.account, "%2010%"), lte(S.ledgerEntries.entryDate, curTo)));

  return {
    period: { from: curFrom, to: curTo },
    revenue,
    expense,
    netProfit,
    cashBalance: r2(Number(cashRow?.s || 0)),
    bankBalance: r2(Number(bankRow?.s || 0)),
    accountsReceivable: r2(Number(arRow?.s || 0)),
    accountsPayable: r2(Number(apRow?.s || 0)),
  };
}
