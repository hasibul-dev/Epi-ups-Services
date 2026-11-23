import { NextResponse } from "next/server";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertCan } from "@/server/permissions";
import { getReport } from "@/lib/report-config";
import { runReport } from "@/server/reports";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (req: Request, ctx: { params: Promise<{ key: string }> }) => {
  const user = await requireUser();
  const def = getReport((await ctx.params).key);
  if (!def) throw new AppError(404, "Unknown report");
  await assertCan(user, def.dept, "view");
  const sp = new URL(req.url).searchParams;
  const result = await runReport(def, {
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    client: sp.get("client") || undefined,
    status: sp.get("status") || undefined,
    category: sp.get("category") || undefined,
    department: sp.get("department") || undefined,
    q: sp.get("q") || undefined,
  });
  if (sp.get("audit") === "1") await logAudit({ user, action: "report_view", module: def.dept, entity: def.key, details: def.title, ip: clientIp(req) });
  return NextResponse.json(result);
});
