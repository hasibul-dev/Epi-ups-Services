import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, apiHandler, clientIp } from "@/server/api";
import { requireUser } from "@/server/auth";
import { can, isAdminRole } from "@/server/permissions";
import { getSettings, saveSettings } from "@/server/settings";
import { DEPT_SETTINGS, SETTINGS_DEFAULTS, type DeptCode } from "@/lib/constants";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
  await requireUser();
  return NextResponse.json({ settings: await getSettings() });
});

export const PUT = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const body = z.record(z.string(), z.string().max(700_000)).parse(await req.json());
  for (const k of Object.keys(body)) if (!(k in SETTINGS_DEFAULTS)) throw new AppError(400, `Unknown setting ${k}`);
  if (!isAdminRole(user) || !(await can(user, "admin", "edit"))) {
    // department managers may only change their own department's settings
    for (const k of Object.keys(body)) {
      let allowed = false;
      for (const [dept, fields] of Object.entries(DEPT_SETTINGS)) {
        if (fields?.some((f) => f.key === k) && (await can(user, dept as DeptCode, "edit"))) allowed = true;
      }
      if (!allowed) throw new AppError(403, "You do not have permission to change these settings");
    }
  }
  if (body["format.timezone"]) {
    try { new Intl.DateTimeFormat("en", { timeZone: body["format.timezone"] }); } catch { throw new AppError(400, "Invalid time zone"); }
  }
  if (body["company.logo"] && !body["company.logo"].startsWith("data:image/")) throw new AppError(400, "Logo must be an image");
  await saveSettings(body);
  await logAudit({ user, action: "settings_update", module: "admin", details: `Updated: ${Object.keys(body).join(", ").slice(0, 200)}`, ip: clientIp(req) });
  return NextResponse.json({ settings: await getSettings() });
});
