import { NextResponse } from "next/server";
import { apiHandler } from "@/server/api";
import { requireUser } from "@/server/auth";
import { refOptions } from "@/server/resources";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (_req: Request, ctx: { params: Promise<{ ref: string }> }) => {
  await requireUser();
  return NextResponse.json({ options: await refOptions((await ctx.params).ref) });
});
