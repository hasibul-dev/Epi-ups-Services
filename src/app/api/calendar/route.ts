import { NextResponse } from "next/server";
import { AppError, apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getCalendarEvents } from "@/server/insights";
import { DEPT_ORDER, type DeptCode } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const dept = sp.get("dept") as DeptCode;
  const month = sp.get("month") ?? "";
  if (!DEPT_ORDER.includes(dept) || !/^\d{4}-\d{2}$/.test(month)) throw new AppError(400, "Invalid parameters");
  return NextResponse.json({ events: await getCalendarEvents(user, dept, month) });
});
