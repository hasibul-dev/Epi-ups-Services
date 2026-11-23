import { NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { createSalesInvoice } from "@/server/accounting";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async (req: Request) => {
  await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const clientId = url.searchParams.get("clientId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conds = [];
  if (status) conds.push(eq(S.invoices.status, status));
  if (clientId) conds.push(eq(S.invoices.clientId, Number(clientId)));
  if (from) conds.push(gte(S.invoices.issueDate, from));
  if (to) conds.push(lte(S.invoices.issueDate, to));
  if (q) {
    conds.push(or(ilike(S.invoices.invoiceNo, `%${q}%`), ilike(S.clients.name, `%${q}%`), ilike(S.clients.companyName, `%${q}%`)));
  }

  const rows = await db
    .select({
      id: S.invoices.id,
      invoiceNo: S.invoices.invoiceNo,
      clientId: S.invoices.clientId,
      clientName: S.clients.name,
      clientCompany: S.clients.companyName,
      clientPhone: S.clients.phone,
      clientAddress: S.clients.address,
      issueDate: S.invoices.issueDate,
      dueDate: S.invoices.dueDate,
      subtotal: S.invoices.subtotal,
      discount: S.invoices.discount,
      vatRate: S.invoices.vatRate,
      tax: S.invoices.tax,
      total: S.invoices.total,
      paidAmount: S.invoices.paidAmount,
      items: S.invoices.items,
      mushakNo: S.invoices.mushakNo,
      status: S.invoices.status,
      notes: S.invoices.notes,
      createdAt: S.invoices.createdAt,
    })
    .from(S.invoices)
    .innerJoin(S.clients, eq(S.clients.id, S.invoices.clientId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(S.invoices.issueDate), desc(S.invoices.id))
    .limit(1000);

  // Derive dynamic paymentStatus and dueAmount
  const invoices = rows.map((r) => {
    const paid = r2(Number(r.paidAmount || 0));
    const total = r2(Number(r.total || 0));
    const due = Math.max(0, r2(total - paid));
    let paymentStatus = "unpaid";
    if (paid >= total - 0.005 && total > 0) paymentStatus = "paid";
    else if (paid > 0) paymentStatus = "partial";

    return {
      ...r,
      paidAmount: paid,
      dueAmount: due,
      paymentStatus,
    };
  });

  return NextResponse.json({ invoices });
});

export const POST = apiHandler(async (req: Request) => {
  await requireUser();
  const body = await req.json();

  if (!body.clientId) throw new AppError(400, "Customer / Client is required");
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError(400, "At least one invoice item is required");
  }

  const invoice = await createSalesInvoice({
    clientId: Number(body.clientId),
    issueDate: body.issueDate,
    dueDate: body.dueDate,
    items: body.items,
    subtotal: Number(body.subtotal || 0),
    discount: Number(body.discount || 0),
    vatRate: Number(body.vatRate ?? 15),
    tax: Number(body.tax || 0),
    total: Number(body.total || 0),
    notes: body.notes,
    mushakNo: body.mushakNo,
    status: body.status || "issued",
  });

  return NextResponse.json({ ok: true, invoice });
});
