import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { rolePermissions } from "@/db/schema";
import { DEPT_ORDER } from "@/lib/constants";
import { apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { assertCan, assertSuperAdmin, invalidatePerms } from "@/server/permissions";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  await assertCan(user, "admin", "view");
  return NextResponse.json({ rows: await db.select().from(rolePermissions) });
});

const schema = z.object({
  rows: z.array(z.object({
    role: z.enum(["administrator", "manager", "staff", "readonly"]),
    module: z.enum(DEPT_ORDER as [string, ...string[]]),
    canView: z.boolean(), canCreate: z.boolean(), canEdit: z.boolean(), canDelete: z.boolean(), canExport: z.boolean(),
  })),
});

export const PUT = apiHandler(async (req: Request) => {
  const user = await requireUser();
  assertSuperAdmin(user);
  const { rows } = schema.parse(await req.json());
  await db.transaction(async (tx) => {
    for (const r of rows) {
      // create/edit/delete/export imply view
      const view = r.canView || r.canCreate || r.canEdit || r.canDelete || r.canExport;
      await tx
        .insert(rolePermissions)
        .values({ ...r, canView: view })
        .onConflictDoUpdate({ target: [rolePermissions.role, rolePermissions.module], set: { canView: view, canCreate: r.canCreate, canEdit: r.canEdit, canDelete: r.canDelete, canExport: r.canExport } });
    }
  });
  invalidatePerms();
  await logAudit({ user, action: "permissions_update", module: "admin", details: `Updated ${rows.length} permission rows`, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
});
