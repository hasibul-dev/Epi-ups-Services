import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getSettings, getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const rawKey = url.searchParams.get("report") || "trial_balance";
  const aliasMap: Record<string, string> = {
    receivables: "accounts_receivable",
    payables: "accounts_payable",
    sales_summary: "sales_report",
    purchase_summary: "purchase_report",
    expenses_analysis: "expense_report",
    income_summary: "income_report",
    cash_bank_book: "cash_bank_report",
    vat_mushak_9_1: "vat_report",
    voucher_register: "voucher_report",
  };
  const reportKey = aliasMap[rawKey] || rawKey;
  const today = await getToday();
  const from = url.searchParams.get("from") || `${today.slice(0, 4)}-01-01`;
  const to = url.searchParams.get("to") || today;
  const settings = await getSettings();

  const company = {
    name: settings["company.name"] || "EPI UPS Bangladesh Limited",
    address: settings["company.address"] || "House #24, Road #05, Dhanmondi, Dhaka-1205, Bangladesh",
    bin: settings["company.bin"] || "001894562-0101",
    tin: settings["company.tin"] || "482910485912",
    phone: settings["company.phone"] || "+880 2 9123456",
    currency: "BDT",
    symbol: "৳",
  };

  switch (reportKey) {
    /* 1. TRIAL BALANCE */
    case "trial_balance": {
      const accounts = await db.select().from(S.accounts).orderBy(asc(S.accounts.code));
      let totalDr = 0;
      let totalCr = 0;

      const rows = await Promise.all(
        accounts.map(async (acc) => {
          const [sums] = await db
            .select({
              dr: sql<number>`coalesce(sum(${S.ledgerEntries.debit}), 0)::float`,
              cr: sql<number>`coalesce(sum(${S.ledgerEntries.credit}), 0)::float`,
            })
            .from(S.ledgerEntries)
            .where(and(ilike(S.ledgerEntries.account, `${acc.code}%`), lte(S.ledgerEntries.entryDate, to)));

          const ob = Number(acc.openingBalance || 0);
          const net = ob + (Number(sums?.dr || 0) - Number(sums?.cr || 0));

          let debitBalance = 0;
          let creditBalance = 0;

          if (acc.type === "asset" || acc.type === "expense") {
            if (net >= 0) debitBalance = r2(net);
            else creditBalance = r2(Math.abs(net));
          } else {
            const crNet = -ob + (Number(sums?.cr || 0) - Number(sums?.dr || 0));
            if (crNet >= 0) creditBalance = r2(crNet);
            else debitBalance = r2(Math.abs(crNet));
          }

          totalDr += debitBalance;
          totalCr += creditBalance;

          return {
            code: acc.code,
            name: acc.name,
            type: acc.type,
            category: acc.category,
            debit: debitBalance,
            credit: creditBalance,
          };
        })
      );

      const activeRows = rows.filter((r) => r.debit > 0 || r.credit > 0);

      return NextResponse.json({
        report: "Trial Balance",
        period: { asOf: to },
        company,
        rows: activeRows,
        totals: { debit: r2(totalDr), credit: r2(totalCr), isBalanced: Math.abs(totalDr - totalCr) < 0.05 },
      });
    }

    /* 2. PROFIT & LOSS STATEMENT */
    case "profit_loss": {
      // Income (code 4xxx)
      const incomeEntries = await db
        .select({
          account: S.ledgerEntries.account,
          amount: sql<number>`sum(${S.ledgerEntries.credit} - ${S.ledgerEntries.debit})::float`,
        })
        .from(S.ledgerEntries)
        .where(and(ilike(S.ledgerEntries.account, "4%"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)))
        .groupBy(S.ledgerEntries.account);

      // Expenses (code 5xxx)
      const expenseEntries = await db
        .select({
          account: S.ledgerEntries.account,
          amount: sql<number>`sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit})::float`,
        })
        .from(S.ledgerEntries)
        .where(and(ilike(S.ledgerEntries.account, "5%"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)))
        .groupBy(S.ledgerEntries.account);

      const totalRevenue = r2(incomeEntries.reduce((s, r) => s + Number(r.amount || 0), 0));
      const totalExpenses = r2(expenseEntries.reduce((s, r) => s + Number(r.amount || 0), 0));
      const netProfit = r2(totalRevenue - totalExpenses);

      return NextResponse.json({
        report: "Profit & Loss Statement",
        period: { from, to },
        company,
        income: incomeEntries.map((r) => ({ account: r.account, amount: r2(Number(r.amount || 0)) })),
        expenses: expenseEntries.map((r) => ({ account: r.account, amount: r2(Number(r.amount || 0)) })),
        totalRevenue,
        totalExpenses,
        netProfit,
      });
    }

    /* 3. BALANCE SHEET */
    case "balance_sheet": {
      const accounts = await db.select().from(S.accounts).orderBy(asc(S.accounts.code));

      // Net profit till date (retained in equity)
      const [revRow] = await db
        .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.credit} - ${S.ledgerEntries.debit}), 0)::float` })
        .from(S.ledgerEntries)
        .where(and(ilike(S.ledgerEntries.account, "4%"), lte(S.ledgerEntries.entryDate, to)));
      const [expRow] = await db
        .select({ s: sql<number>`coalesce(sum(${S.ledgerEntries.debit} - ${S.ledgerEntries.credit}), 0)::float` })
        .from(S.ledgerEntries)
        .where(and(ilike(S.ledgerEntries.account, "5%"), lte(S.ledgerEntries.entryDate, to)));
      const currentPeriodProfit = r2(Number(revRow?.s || 0) - Number(expRow?.s || 0));

      const assets: any[] = [];
      const liabilities: any[] = [];
      const equity: any[] = [];

      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      for (const acc of accounts) {
        if (acc.type === "income" || acc.type === "expense") continue;

        const [sum] = await db
          .select({
            dr: sql<number>`coalesce(sum(${S.ledgerEntries.debit}), 0)::float`,
            cr: sql<number>`coalesce(sum(${S.ledgerEntries.credit}), 0)::float`,
          })
          .from(S.ledgerEntries)
          .where(and(ilike(S.ledgerEntries.account, `${acc.code}%`), lte(S.ledgerEntries.entryDate, to)));

        const ob = Number(acc.openingBalance || 0);

        if (acc.type === "asset") {
          const val = r2(ob + Number(sum?.dr || 0) - Number(sum?.cr || 0));
          if (val !== 0) {
            assets.push({ code: acc.code, name: acc.name, category: acc.category, amount: val });
            totalAssets += val;
          }
        } else if (acc.type === "liability") {
          const val = r2(ob + Number(sum?.cr || 0) - Number(sum?.dr || 0));
          if (val !== 0) {
            liabilities.push({ code: acc.code, name: acc.name, category: acc.category, amount: val });
            totalLiabilities += val;
          }
        } else if (acc.type === "equity") {
          const val = r2(ob + Number(sum?.cr || 0) - Number(sum?.dr || 0));
          if (val !== 0) {
            equity.push({ code: acc.code, name: acc.name, category: acc.category, amount: val });
            totalEquity += val;
          }
        }
      }

      // Add Current Period Net Profit into Equity
      if (currentPeriodProfit !== 0) {
        equity.push({
          code: "3999",
          name: "Current Period Net Profit / (Loss)",
          category: "Retained Earnings",
          amount: currentPeriodProfit,
        });
        totalEquity += currentPeriodProfit;
      }

      totalAssets = r2(totalAssets);
      totalLiabilities = r2(totalLiabilities);
      totalEquity = r2(totalEquity);

      return NextResponse.json({
        report: "Balance Sheet",
        period: { asOf: to },
        company,
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabEquity: r2(totalLiabilities + totalEquity),
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.05,
      });
    }

    /* 4. CASH FLOW STATEMENT */
    case "cash_flow": {
      const cashIn = await db
        .select({
          desc: S.ledgerEntries.description,
          amount: S.ledgerEntries.debit,
          date: S.ledgerEntries.entryDate,
          voucherNo: S.ledgerEntries.voucherNo,
        })
        .from(S.ledgerEntries)
        .where(and(ilike(S.ledgerEntries.account, "101%"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to), sql`${S.ledgerEntries.debit} > 0`))
        .orderBy(desc(S.ledgerEntries.entryDate));

      const cashOut = await db
        .select({
          desc: S.ledgerEntries.description,
          amount: S.ledgerEntries.credit,
          date: S.ledgerEntries.entryDate,
          voucherNo: S.ledgerEntries.voucherNo,
        })
        .from(S.ledgerEntries)
        .where(and(ilike(S.ledgerEntries.account, "101%"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to), sql`${S.ledgerEntries.credit} > 0`))
        .orderBy(desc(S.ledgerEntries.entryDate));

      const totalIn = r2(cashIn.reduce((s, r) => s + Number(r.amount || 0), 0));
      const totalOut = r2(cashOut.reduce((s, r) => s + Number(r.amount || 0), 0));

      return NextResponse.json({
        report: "Cash Flow Statement",
        period: { from, to },
        company,
        cashInflow: cashIn,
        cashOutflow: cashOut,
        totalInflow: totalIn,
        totalOutflow: totalOut,
        netCashFlow: r2(totalIn - totalOut),
      });
    }

    /* 5. GENERAL LEDGER (All Accounts) */
    case "general_ledger": {
      const entries = await db
        .select({
          id: S.ledgerEntries.id,
          date: S.ledgerEntries.entryDate,
          account: S.ledgerEntries.account,
          description: S.ledgerEntries.description,
          debit: S.ledgerEntries.debit,
          credit: S.ledgerEntries.credit,
          voucherNo: S.ledgerEntries.voucherNo,
        })
        .from(S.ledgerEntries)
        .where(and(gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)))
        .orderBy(asc(S.ledgerEntries.entryDate), asc(S.ledgerEntries.id));

      return NextResponse.json({
        report: "General Ledger",
        period: { from, to },
        company,
        rows: entries,
        totalDebit: r2(entries.reduce((s, e) => s + Number(e.debit || 0), 0)),
        totalCredit: r2(entries.reduce((s, e) => s + Number(e.credit || 0), 0)),
      });
    }

    /* 6. CUSTOMER LEDGER */
    case "customer_ledger": {
      const entries = await db
        .select({
          id: S.ledgerEntries.id,
          date: S.ledgerEntries.entryDate,
          customerName: S.clients.name,
          company: S.clients.companyName,
          description: S.ledgerEntries.description,
          debit: S.ledgerEntries.debit,
          credit: S.ledgerEntries.credit,
          voucherNo: S.ledgerEntries.voucherNo,
        })
        .from(S.ledgerEntries)
        .leftJoin(S.clients, eq(S.clients.id, S.ledgerEntries.partyId))
        .where(and(eq(S.ledgerEntries.partyType, "customer"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)))
        .orderBy(asc(S.ledgerEntries.entryDate));

      return NextResponse.json({
        report: "Customer Ledger",
        period: { from, to },
        company,
        rows: entries,
        totalDebit: r2(entries.reduce((s, e) => s + Number(e.debit || 0), 0)),
        totalCredit: r2(entries.reduce((s, e) => s + Number(e.credit || 0), 0)),
      });
    }

    /* 7. SUPPLIER LEDGER */
    case "supplier_ledger": {
      const entries = await db
        .select({
          id: S.ledgerEntries.id,
          date: S.ledgerEntries.entryDate,
          supplierName: S.suppliers.name,
          description: S.ledgerEntries.description,
          debit: S.ledgerEntries.debit,
          credit: S.ledgerEntries.credit,
          voucherNo: S.ledgerEntries.voucherNo,
        })
        .from(S.ledgerEntries)
        .leftJoin(S.suppliers, eq(S.suppliers.id, S.ledgerEntries.partyId))
        .where(and(eq(S.ledgerEntries.partyType, "supplier"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)))
        .orderBy(asc(S.ledgerEntries.entryDate));

      return NextResponse.json({
        report: "Supplier Ledger",
        period: { from, to },
        company,
        rows: entries,
        totalDebit: r2(entries.reduce((s, e) => s + Number(e.debit || 0), 0)),
        totalCredit: r2(entries.reduce((s, e) => s + Number(e.credit || 0), 0)),
      });
    }

    /* 8. ACCOUNTS RECEIVABLE REPORT */
    case "accounts_receivable": {
      const unpaid = await db
        .select({
          invoiceNo: S.invoices.invoiceNo,
          client: S.clients.name,
          issueDate: S.invoices.issueDate,
          dueDate: S.invoices.dueDate,
          total: S.invoices.total,
          paid: S.invoices.paidAmount,
          due: sql<number>`(${S.invoices.total} - coalesce(${S.invoices.paidAmount}, 0))::float`,
        })
        .from(S.invoices)
        .innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId))
        .where(and(eq(S.invoices.status, "issued"), sql`(${S.invoices.total} - coalesce(${S.invoices.paidAmount}, 0)) > 0.01`))
        .orderBy(desc(S.invoices.dueDate));

      return NextResponse.json({
        report: "Accounts Receivable Report",
        period: { asOf: to },
        company,
        rows: unpaid,
        totalDue: r2(unpaid.reduce((s, r) => s + Number(r.due || 0), 0)),
      });
    }

    /* 9. ACCOUNTS PAYABLE REPORT */
    case "accounts_payable": {
      const unpaid = await db
        .select({
          purchaseNo: S.purchases.purchaseNo,
          billNo: S.purchases.billNo,
          supplier: S.purchases.supplier,
          purchaseDate: S.purchases.purchaseDate,
          dueDate: S.purchases.dueDate,
          amount: S.purchases.amount,
          paid: S.purchases.paidAmount,
          due: sql<number>`(${S.purchases.amount} - coalesce(${S.purchases.paidAmount}, 0))::float`,
        })
        .from(S.purchases)
        .where(and(ne(S.purchases.status, "cancelled"), sql`(${S.purchases.amount} - coalesce(${S.purchases.paidAmount}, 0)) > 0.01`))
        .orderBy(desc(S.purchases.purchaseDate));

      return NextResponse.json({
        report: "Accounts Payable Report",
        period: { asOf: to },
        company,
        rows: unpaid,
        totalDue: r2(unpaid.reduce((s, r) => s + Number(r.due || 0), 0)),
      });
    }

    /* 10. SALES REPORT */
    case "sales_report": {
      const rows = await db
        .select({
          invoiceNo: S.invoices.invoiceNo,
          mushakNo: S.invoices.mushakNo,
          customer: S.clients.name,
          date: S.invoices.issueDate,
          subtotal: S.invoices.subtotal,
          discount: S.invoices.discount,
          tax: S.invoices.tax,
          total: S.invoices.total,
          paid: S.invoices.paidAmount,
        })
        .from(S.invoices)
        .innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId))
        .where(and(eq(S.invoices.status, "issued"), gte(S.invoices.issueDate, from), lte(S.invoices.issueDate, to)))
        .orderBy(desc(S.invoices.issueDate));

      return NextResponse.json({
        report: "Sales Invoices Report",
        period: { from, to },
        company,
        rows,
        totals: {
          subtotal: r2(rows.reduce((s, r) => s + Number(r.subtotal || 0), 0)),
          tax: r2(rows.reduce((s, r) => s + Number(r.tax || 0), 0)),
          total: r2(rows.reduce((s, r) => s + Number(r.total || 0), 0)),
        },
      });
    }

    /* 11. PURCHASE REPORT */
    case "purchase_report": {
      const rows = await db
        .select({
          purchaseNo: S.purchases.purchaseNo,
          billNo: S.purchases.billNo,
          supplier: S.purchases.supplier,
          date: S.purchases.purchaseDate,
          subtotal: S.purchases.subtotal,
          tax: S.purchases.tax,
          amount: S.purchases.amount,
          paid: S.purchases.paidAmount,
        })
        .from(S.purchases)
        .where(and(ne(S.purchases.status, "cancelled"), gte(S.purchases.purchaseDate, from), lte(S.purchases.purchaseDate, to)))
        .orderBy(desc(S.purchases.purchaseDate));

      return NextResponse.json({
        report: "Purchase Bills Report",
        period: { from, to },
        company,
        rows,
        totalAmount: r2(rows.reduce((s, r) => s + Number(r.amount || 0), 0)),
      });
    }

    /* 12. EXPENSE REPORT */
    case "expense_report": {
      const rows = await db
        .select({
          date: S.expenses.expenseDate,
          category: S.expenses.category,
          payee: S.expenses.payee,
          amount: S.expenses.amount,
          method: S.expenses.method,
          reference: S.expenses.reference,
          notes: S.expenses.notes,
        })
        .from(S.expenses)
        .where(and(gte(S.expenses.expenseDate, from), lte(S.expenses.expenseDate, to)))
        .orderBy(desc(S.expenses.expenseDate));

      return NextResponse.json({
        report: "Expense Report",
        period: { from, to },
        company,
        rows,
        totalAmount: r2(rows.reduce((s, r) => s + Number(r.amount || 0), 0)),
      });
    }

    /* 13. INCOME REPORT */
    case "income_report": {
      const rows = await db
        .select({
          date: S.incomes.incomeDate,
          category: S.incomes.category,
          source: S.incomes.source,
          amount: S.incomes.amount,
          method: S.incomes.method,
          reference: S.incomes.reference,
          notes: S.incomes.notes,
        })
        .from(S.incomes)
        .where(and(gte(S.incomes.incomeDate, from), lte(S.incomes.incomeDate, to)))
        .orderBy(desc(S.incomes.incomeDate));

      return NextResponse.json({
        report: "Income Report",
        period: { from, to },
        company,
        rows,
        totalAmount: r2(rows.reduce((s, r) => s + Number(r.amount || 0), 0)),
      });
    }

    /* 14. CASH & BANK REPORT */
    case "cash_bank_report": {
      const rows = await db
        .select({
          date: S.ledgerEntries.entryDate,
          account: S.ledgerEntries.account,
          description: S.ledgerEntries.description,
          debit: S.ledgerEntries.debit,
          credit: S.ledgerEntries.credit,
          voucherNo: S.ledgerEntries.voucherNo,
        })
        .from(S.ledgerEntries)
        .where(and(ilike(S.ledgerEntries.account, "101%"), gte(S.ledgerEntries.entryDate, from), lte(S.ledgerEntries.entryDate, to)))
        .orderBy(asc(S.ledgerEntries.entryDate));

      return NextResponse.json({
        report: "Cash & Bank Activity Report",
        period: { from, to },
        company,
        rows,
        totalInflow: r2(rows.reduce((s, r) => s + Number(r.debit || 0), 0)),
        totalOutflow: r2(rows.reduce((s, r) => s + Number(r.credit || 0), 0)),
      });
    }

    /* 15. VAT REPORT */
    case "vat_report": {
      const salesVat = await db
        .select({
          invoiceNo: S.invoices.invoiceNo,
          mushakNo: S.invoices.mushakNo,
          date: S.invoices.issueDate,
          client: S.clients.name,
          taxable: S.invoices.subtotal,
          vatRate: S.invoices.vatRate,
          vatAmount: S.invoices.tax,
        })
        .from(S.invoices)
        .innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId))
        .where(and(eq(S.invoices.status, "issued"), gte(S.invoices.issueDate, from), lte(S.invoices.issueDate, to)));

      const purchaseVat = await db
        .select({
          purchaseNo: S.purchases.purchaseNo,
          billNo: S.purchases.billNo,
          date: S.purchases.purchaseDate,
          supplier: S.purchases.supplier,
          taxable: S.purchases.subtotal,
          vatAmount: S.purchases.tax,
        })
        .from(S.purchases)
        .where(and(ne(S.purchases.status, "cancelled"), gte(S.purchases.purchaseDate, from), lte(S.purchases.purchaseDate, to)));

      const totalOutput = r2(salesVat.reduce((s, r) => s + Number(r.vatAmount || 0), 0));
      const totalInput = r2(purchaseVat.reduce((s, r) => s + Number(r.vatAmount || 0), 0));

      return NextResponse.json({
        report: "VAT (Mushak) Summary Report",
        period: { from, to },
        company,
        salesVat,
        purchaseVat,
        totalOutputVat: totalOutput,
        totalInputVatRebate: totalInput,
        netVatPayable: r2(totalOutput - totalInput),
      });
    }

    /* 16. JOURNAL & VOUCHER REPORT */
    case "voucher_report": {
      const vouchers = await db
        .select({
          voucherNo: S.vouchers.voucherNo,
          type: S.vouchers.voucherType,
          date: S.vouchers.date,
          reference: S.vouchers.reference,
          description: S.vouchers.description,
          totalAmount: S.vouchers.totalAmount,
          status: S.vouchers.status,
          lines: S.vouchers.lines,
        })
        .from(S.vouchers)
        .where(and(gte(S.vouchers.date, from), lte(S.vouchers.date, to)))
        .orderBy(desc(S.vouchers.date));

      return NextResponse.json({
        report: "Journal & Voucher Audit Report",
        period: { from, to },
        company,
        rows: vouchers,
        totalAmount: r2(vouchers.reduce((s, r) => s + Number(r.totalAmount || 0), 0)),
      });
    }

    default:
      throw new AppError(400, "Unknown report requested");
  }
});
