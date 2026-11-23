import { NextResponse } from "next/server";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { globalSearch } from "@/server/insights";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ hits: await globalSearch(user, q) });
});
