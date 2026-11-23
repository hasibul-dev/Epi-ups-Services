import { NextResponse } from "next/server";
import { apiHandler, clientIp } from "@/server/api";
import { COOKIE_NAME, destroyCurrentSession, getCurrentUser } from "@/server/auth";
import { logAudit } from "@/server/audit";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (req: Request) => {
  const user = await getCurrentUser();
  await destroyCurrentSession();
  if (user) await logAudit({ user, action: "logout", module: "auth", ip: clientIp(req) });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", expires: new Date(0) });
  return res;
});
