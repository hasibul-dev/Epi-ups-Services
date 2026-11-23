import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { createVoucher } from "@/server/accounting";
import { getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async () => {
  await requireUser();

  const assets = await db.select().from(S.fixedAssets).orderBy(asc(S.fixedAssets.id));

  let totalCost = 0;
  let totalDepreciation = 0;
  let totalBookValue = 0;

  const enriched = assets.map((a) => {
    const cost = Number(a.purchaseCost || 0);
    const dep = Number(a.accumulatedDepreciation || 0);
    const book = r2(cost - dep);

    totalCost += cost;
    totalDepreciation += dep;
    totalBookValue += book;

    return {
      ...a,
      currentBookValue: book,
    };
  });

  return NextResponse.json({
    assets: enriched,
    summary: {
      totalAssets: assets.length,
      totalCost: r2(totalCost),
      totalDepreciation: r2(totalDepreciation),
      totalBookValue: r2(totalBookValue),
    },
  });
});

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const today = await getToday();

  // Run periodic depreciation
  if (body.action === "post_depreciation") {
    const assets = await db.select().from(S.fixedAssets).where(eq(S.fixedAssets.status, "active"));
    if (assets.length === 0) throw new AppError(400, "No active assets found");

    let totalMonthlyDep = 0;
    for (const a of assets) {
      const cost = Number(a.purchaseCost || 0);
      const salvage = Number(a.salvageValue || 0);
      const years = Number(a.usefulLifeYears || 5);
      // Monthly straight-line depreciation = (Cost - Salvage) / (years * 12)
      const monthlyDep = r2((cost - salvage) / (years * 12));
      const newAccumulated = r2(Number(a.accumulatedDepreciation || 0) + monthlyDep);
      const newBook = Math.max(salvage, r2(cost - newAccumulated));

      totalMonthlyDep += monthlyDep;

      await db
        .update(S.fixedAssets)
        .set({
          accumulatedDepreciation: newAccumulated,
          currentBookValue: newBook,
          updatedAt: new Date(),
        })
        .where(eq(S.fixedAssets.id, a.id));
    }

    totalMonthlyDep = r2(totalMonthlyDep);

    // Create journal entry: Dr Depreciation Expense, Cr Accumulated Depreciation
    const lines = [
      {
        accountCode: "5080",
        accountName: "Depreciation Expense",
        description: `Monthly Fixed Asset Depreciation (${assets.length} assets)`,
        debit: totalMonthlyDep,
        credit: 0,
      },
      {
        accountCode: "1045",
        accountName: "Accumulated Depreciation",
        description: `Accumulated depreciation entry for ${today.slice(0, 7)}`,
        debit: 0,
        credit: totalMonthlyDep,
      },
    ];

    const voucher = await createVoucher({
      voucherType: "journal",
      date: body.date || today,
      reference: `DEP-${today.slice(0, 7)}`,
      description: `Monthly Depreciation posting for ${today.slice(0, 7)}`,
      lines,
      status: "posted",
      userId: user.id,
    });

    return NextResponse.json({ ok: true, totalDepreciation: totalMonthlyDep, voucher });
  }

  // Create new asset
  if (!body.name?.trim() || !body.purchaseCost) {
    throw new AppError(400, "Asset Name and Purchase Cost are required");
  }

  const cost = Number(body.purchaseCost || 0);
  const salvage = Number(body.salvageValue || 0);
  const code = body.assetCode?.trim() || `AST-${Date.now().toString().slice(-4)}`;

  const [asset] = await db
    .insert(S.fixedAssets)
    .values({
      assetCode: code,
      name: body.name.trim(),
      category: body.category?.trim() || "Machinery & Equipment",
      purchaseDate: body.purchaseDate || today,
      purchaseCost: cost,
      usefulLifeYears: Number(body.usefulLifeYears || 5),
      depreciationMethod: body.depreciationMethod || "straight_line",
      salvageValue: salvage,
      accumulatedDepreciation: 0,
      currentBookValue: cost,
      status: "active",
      notes: body.notes?.trim() || null,
    })
    .returning();

  return NextResponse.json({ ok: true, asset });
});
