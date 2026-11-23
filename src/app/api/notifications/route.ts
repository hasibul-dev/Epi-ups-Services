import { NextResponse } from "next/server";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { getNotifications } from "@/server/insights";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  return NextResponse.json({ items: await getNotifications(user) });
});
