import { NextResponse } from "next/server";
import { apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertResource } from "@/server/permissions";
import { createRow, getDef, listRows, recordTitle } from "@/server/resources";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string }> };

export const GET = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const def = getDef((await ctx.params).resource);
  await assertResource(user, def, "view");
  const sp = new URL(req.url).searchParams;
  const rows = await listRows(def, {
    preset: sp.get("preset") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    client: sp.get("client") || undefined,
    status: sp.get("status") || undefined,
    category: sp.get("category") || undefined,
    department: sp.get("department") || undefined,
    q: sp.get("q") || undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
  });
  return NextResponse.json({ rows });
});

export const POST = apiHandler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const def = getDef((await ctx.params).resource);
  await assertResource(user, def, "create");
  const row = await createRow(def, await req.json());
  await logAudit({ user, action: "create", module: def.modules[0], entity: def.key, entityId: row.id, details: `Created ${def.singular}: ${recordTitle(def, row)}`, ip: clientIp(req) });
  return NextResponse.json({ row }, { status: 201 });
});
