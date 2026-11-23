import { NextResponse } from "next/server";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertResource } from "@/server/permissions";
import { deleteRow, getDef, getRow, recordTitle, updateRow } from "@/server/resources";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string; id: string }> };

async function parse(ctx: Ctx) {
  const p = await ctx.params;
  const id = Number(p.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "Invalid id");
  return { def: getDef(p.resource), id };
}

export const GET = apiHandler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { def, id } = await parse(ctx);
  await assertResource(user, def, "view");
  return NextResponse.json({ row: await getRow(def, id) });
});

export const PUT = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { def, id } = await parse(ctx);
  await assertResource(user, def, "edit");
  const row = await updateRow(def, id, await req.json());
  await logAudit({ user, action: "update", module: def.modules[0], entity: def.key, entityId: id, details: `Updated ${def.singular}: ${recordTitle(def, row)}`, ip: clientIp(req) });
  return NextResponse.json({ row });
});

export const DELETE = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { def, id } = await parse(ctx);
  await assertResource(user, def, "delete");
  const row = await deleteRow(def, id);
  await logAudit({ user, action: "delete", module: def.modules[0], entity: def.key, entityId: id, details: `Deleted ${def.singular}: ${recordTitle(def, row)}`, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});
