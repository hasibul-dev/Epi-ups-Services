import { NextResponse } from "next/server";
import { and, desc, eq, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, followUps } from "@/db/schema";
import { apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertCan } from "@/server/permissions";
import { todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (req: Request) => {
  const user = await requireUser();
  await assertCan(user, "sales", "view");

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const q = searchParams.get("q")?.trim() || "";
  const today = todayStr();

  const conds = [];

  if (status === "pending") {
    conds.push(eq(followUps.status, "pending"));
  } else if (status === "done") {
    conds.push(eq(followUps.status, "done"));
  } else if (status === "today") {
    conds.push(eq(followUps.status, "pending"));
    conds.push(lte(followUps.dueDate, today));
  } else if (status === "overdue") {
    conds.push(eq(followUps.status, "pending"));
    conds.push(sql`${followUps.dueDate} < ${today}`);
  }

  if (q) {
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
    conds.push(
      or(
        ilike(clients.name, like),
        ilike(clients.companyName, like),
        ilike(clients.phone, like),
        ilike(clients.email, like),
        ilike(clients.designation, like),
        ilike(followUps.notes, like)
      )
    );
  }

  const rows = await db
    .select({
      id: followUps.id,
      clientId: followUps.clientId,
      workId: followUps.workId,
      type: followUps.type,
      dueDate: followUps.dueDate,
      status: followUps.status,
      assignedTo: followUps.assignedTo,
      notes: followUps.notes,
      result: followUps.result,
      method: followUps.method,
      createdAt: followUps.createdAt,
      updatedAt: followUps.updatedAt,
      // Joined Client details
      clientName: clients.name,
      clientCompany: clients.companyName,
      clientDesignation: clients.designation,
      clientPhone: clients.phone,
      clientEmail: clients.email,
      clientAddress: clients.address,
      clientCategory: clients.category,
      clientNotes: clients.notes,
    })
    .from(followUps)
    .innerJoin(clients, eq(followUps.clientId, clients.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(followUps.dueDate), desc(followUps.id))
    .limit(1000);

  // Compute status flag on the fly
  const items = rows.map((r) => ({
    ...r,
    isOverdue: r.status === "pending" && r.dueDate < today,
    isToday: r.status === "pending" && r.dueDate === today,
  }));

  return NextResponse.json({ followUps: items, today });
});
