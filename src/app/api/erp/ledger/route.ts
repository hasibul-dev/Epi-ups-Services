import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, ilike, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const account = url.searchParams.get("account"); // account name or code prefix
  const partyType = url.searchParams.get("partyType"); // customer | supplier
  const partyId = url.searchParams.get("partyId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to") || (await getToday());
  const q = url.searchParams.get("q")?.trim();

  // 1. Calculate opening balance before `from` date
  let openingBalance = 0;
  if (from) {
    const obConds = [lt(S.ledgerEntries.entryDate, from)];
    if (account) obConds.push(ilike(S.ledgerEntries.account, `${account}%`));
    if (partyType) obConds.push(eq(S.ledgerEntries.partyType, partyType));
    if (partyId) obConds.push(eq(S.ledgerEntries.partyId, Number(partyId)));

    const [obRow] = await db
      .select({
        dr: sql<number>`coalesce(sum(${S.ledgerEntries.debit}), 0)::float`,
        cr: sql<number>`coalesce(sum(${S.ledgerEntries.credit}), 0)::float`,
      })
      .from(S.ledgerEntries)
      .where(and(...obConds));

    openingBalance = r2(Number(obRow?.dr || 0) - Number(obRow?.cr || 0));
  }

  // 2. Fetch ledger entries in date range
  const conds = [];
  if (from) conds.push(gte(S.ledgerEntries.entryDate, from));
  if (to) conds.push(lte(S.ledgerEntries.entryDate, to));
  if (account) conds.push(ilike(S.ledgerEntries.account, `${account}%`));
  if (partyType) conds.push(eq(S.ledgerEntries.partyType, partyType));
  if (partyId) conds.push(eq(S.ledgerEntries.partyId, Number(partyId)));
  if (q) {
    conds.push(or(ilike(S.ledgerEntries.description, `%${q}%`), ilike(S.ledgerEntries.voucherNo, `%${q}%`), ilike(S.ledgerEntries.account, `%${q}%`)));
  }

  const entries = await db
    .select({
      id: S.ledgerEntries.id,
      date: S.ledgerEntries.entryDate,
      account: S.ledgerEntries.account,
      description: S.ledgerEntries.description,
      debit: S.ledgerEntries.debit,
      credit: S.ledgerEntries.credit,
      voucherNo: S.ledgerEntries.voucherNo,
      voucherType: S.ledgerEntries.voucherType,
      partyType: S.ledgerEntries.partyType,
      partyId: S.ledgerEntries.partyId,
      refType: S.ledgerEntries.refType,
      refId: S.ledgerEntries.refId,
    })
    .from(S.ledgerEntries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(S.ledgerEntries.entryDate), asc(S.ledgerEntries.id))
    .limit(2000);

  // Compute running balance
  let running = openingBalance;
  const rows = entries.map((e) => {
    running = r2(running + Number(e.debit || 0) - Number(e.credit || 0));
    return {
      ...e,
      runningBalance: running,
    };
  });

  const totalDebit = r2(entries.reduce((s, e) => s + Number(e.debit || 0), 0));
  const totalCredit = r2(entries.reduce((s, e) => s + Number(e.credit || 0), 0));
  const closingBalance = running;

  return NextResponse.json({
    openingBalance,
    entries: rows,
    totalDebit,
    totalCredit,
    closingBalance,
  });
});
