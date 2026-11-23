import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { createVoucher } from "@/server/accounting";
import { getToday } from "@/server/settings";

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const today = await getToday();

  // Accounts in cash and bank
  const accounts = await db
    .select()
    .from(S.accounts)
    .where(or(ilike(S.accounts.code, "101%"), ilike(S.accounts.category, "%Cash%"), ilike(S.accounts.category, "%Bank%")))
    .orderBy(asc(S.accounts.code));

  // Compute live ledger balance for each cash/bank account
  const enriched = await Promise.all(
    accounts.map(async (acc) => {
      const [sum] = await db
        .select({
          dr: sql<number>`coalesce(sum(${S.ledgerEntries.debit}), 0)::float`,
          cr: sql<number>`coalesce(sum(${S.ledgerEntries.credit}), 0)::float`,
        })
        .from(S.ledgerEntries)
        .where(ilike(S.ledgerEntries.account, `${acc.code}%`));

      const liveBalance = Number(acc.openingBalance || 0) + (Number(sum?.dr || 0) - Number(sum?.cr || 0));
      return {
        ...acc,
        balance: Math.round(liveBalance * 100) / 100,
        totalDebit: Number(sum?.dr || 0),
        totalCredit: Number(sum?.cr || 0),
      };
    })
  );

  // Recent cash & bank ledger entries
  const recent = await db
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
    .where(ilike(S.ledgerEntries.account, "101%"))
    .orderBy(desc(S.ledgerEntries.entryDate), desc(S.ledgerEntries.id))
    .limit(30);

  return NextResponse.json({ accounts: enriched, recent, today });
});

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const { type, fromAccountId, toAccountId, amount, date, reference, description } = body;

  const amt = Number(amount);
  if (!amt || amt <= 0) throw new AppError(400, "Valid transfer amount is required");
  if (!fromAccountId || !toAccountId) throw new AppError(400, "Source and Destination accounts are required");
  if (fromAccountId === toAccountId) throw new AppError(400, "Source and Destination accounts must be different");

  const [fromAcc] = await db.select().from(S.accounts).where(eq(S.accounts.id, Number(fromAccountId))).limit(1);
  const [toAcc] = await db.select().from(S.accounts).where(eq(S.accounts.id, Number(toAccountId))).limit(1);
  if (!fromAcc || !toAcc) throw new AppError(400, "Account not found");

  const lines = [
    {
      accountId: toAcc.id,
      accountCode: toAcc.code,
      accountName: toAcc.name,
      description: description || `Transfer received from ${fromAcc.name}`,
      debit: amt,
      credit: 0,
    },
    {
      accountId: fromAcc.id,
      accountCode: fromAcc.code,
      accountName: fromAcc.name,
      description: description || `Transfer sent to ${toAcc.name}`,
      debit: 0,
      credit: amt,
    },
  ];

  const voucher = await createVoucher({
    voucherType: "contra",
    date: date || (await getToday()),
    reference: reference || "Bank/Cash Contra Transfer",
    description: description || `${type === "deposit" ? "Bank Deposit" : type === "withdraw" ? "Bank Withdrawal" : "Bank Transfer"}: ${fromAcc.name} → ${toAcc.name}`,
    lines,
    status: "posted",
    userId: user.id,
  });

  return NextResponse.json({ ok: true, voucher });
});
