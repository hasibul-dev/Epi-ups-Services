import { NextResponse } from "next/server";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category");

  const conds = [];
  if (category) conds.push(eq(S.inventoryItems.category, category));
  if (q) conds.push(or(ilike(S.inventoryItems.code, `%${q}%`), ilike(S.inventoryItems.name, `%${q}%`)));

  const items = await db
    .select()
    .from(S.inventoryItems)
    .where(conds.length ? or(...conds) : undefined)
    .orderBy(asc(S.inventoryItems.code));

  // Compute total valuation and low stock count
  let totalValuation = 0;
  let lowStockCount = 0;
  const enriched = items.map((it) => {
    const stock = Number(it.currentStock || 0);
    const pPrice = Number(it.purchasePrice || 0);
    const valuation = r2(stock * pPrice);
    totalValuation += valuation;
    const isLow = stock <= Number(it.minStockAlert || 5);
    if (isLow) lowStockCount++;

    return {
      ...it,
      sku: it.code,
      stockQty: stock,
      costPrice: pPrice,
      reorderLevel: Number(it.minStockAlert || 5),
      totalValuation: valuation,
      valuation,
      isLow,
    };
  });

  // Recent inventory transactions
  const transactions = await db
    .select({
      id: S.inventoryTransactions.id,
      date: S.inventoryTransactions.date,
      type: S.inventoryTransactions.type,
      quantity: S.inventoryTransactions.quantity,
      unitCost: S.inventoryTransactions.unitCost,
      refType: S.inventoryTransactions.refType,
      refId: S.inventoryTransactions.refId,
      notes: S.inventoryTransactions.notes,
      itemCode: S.inventoryItems.code,
      itemName: S.inventoryItems.name,
      unit: S.inventoryItems.unit,
    })
    .from(S.inventoryTransactions)
    .innerJoin(S.inventoryItems, eq(S.inventoryTransactions.itemId, S.inventoryItems.id))
    .orderBy(desc(S.inventoryTransactions.date), desc(S.inventoryTransactions.id))
    .limit(25);

  return NextResponse.json({
    items: enriched,
    transactions,
    summary: {
      totalItems: items.length,
      totalValuation: r2(totalValuation),
      lowStockCount,
    },
  });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();
  const today = await getToday();

  if (body.action === "adjust") {
    const itemId = Number(body.itemId);
    const qty = Number(body.quantity); // positive for add, negative for deduction
    if (!itemId || isNaN(qty) || qty === 0) throw new AppError(400, "Valid item and adjustment quantity are required");

    const [item] = await db.select().from(S.inventoryItems).where(eq(S.inventoryItems.id, itemId)).limit(1);
    if (!item) throw new AppError(404, "Item not found");

    const newStock = Math.max(0, Number(item.currentStock || 0) + qty);

    await db.transaction(async (tx) => {
      await tx
        .update(S.inventoryItems)
        .set({ currentStock: newStock, updatedAt: new Date() })
        .where(eq(S.inventoryItems.id, itemId));

      await tx.insert(S.inventoryTransactions).values({
        itemId,
        type: "adjustment",
        date: body.date || today,
        quantity: qty,
        unitCost: item.purchasePrice,
        notes: body.notes || `Stock adjustment: ${qty > 0 ? `+${qty}` : qty} (${body.reason || "Physical count adjustment"})`,
      });
    });

    return NextResponse.json({ ok: true, newStock });
  }

  // Create new inventory item
  if (!body.code?.trim() || !body.name?.trim()) {
    throw new AppError(400, "Item Code (SKU) and Name are required");
  }

  const [existing] = await db.select().from(S.inventoryItems).where(eq(S.inventoryItems.code, body.code.trim())).limit(1);
  if (existing) throw new AppError(400, `Item Code "${body.code}" already exists`);

  const openingStock = Number(body.openingStock || 0);

  const [created] = await db
    .insert(S.inventoryItems)
    .values({
      code: body.code.trim(),
      name: body.name.trim(),
      category: body.category?.trim() || "General",
      unit: body.unit?.trim() || "Pcs",
      purchasePrice: Number(body.purchasePrice || 0),
      salesPrice: Number(body.salesPrice || 0),
      openingStock,
      currentStock: openingStock,
      minStockAlert: Number(body.minStockAlert || 5),
      vatRate: Number(body.vatRate ?? 15),
      status: "active",
      notes: body.notes?.trim() || null,
    })
    .returning();

  if (openingStock > 0) {
    await db.insert(S.inventoryTransactions).values({
      itemId: created.id,
      type: "opening",
      date: today,
      quantity: openingStock,
      unitCost: created.purchasePrice,
      notes: "Opening stock balance",
    });
  }

  return NextResponse.json({ ok: true, item: created });
});
