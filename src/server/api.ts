import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type PgLikeError = { code?: string; constraint?: string; cause?: unknown; detail?: string };

function pgCode(e: unknown): PgLikeError | null {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    const c = cur as PgLikeError;
    if (typeof c.code === "string" && /^\d{5}$/.test(c.code)) return c;
    cur = c.cause;
  }
  return null;
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) return NextResponse.json({ error: e.message, fieldErrors: e.fieldErrors }, { status: e.status });
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const i of e.issues) fieldErrors[i.path.join(".") || "_"] = i.message;
    const first = e.issues[0];
    return NextResponse.json({ error: first ? first.message : "Validation failed", fieldErrors }, { status: 400 });
  }
  const pg = pgCode(e);
  if (pg?.code === "23503") {
    return NextResponse.json({ error: "This record is linked to other records and cannot be deleted or changed this way. Remove or reassign the linked records first." }, { status: 409 });
  }
  if (pg?.code === "23505") {
    return NextResponse.json({ error: "A record with the same unique value (such as a number, username or email) already exists." }, { status: 409 });
  }
  console.error("[api-error]", e);
  return NextResponse.json({ error: "Unexpected server error. Please try again." }, { status: 500 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiHandler<A extends any[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
