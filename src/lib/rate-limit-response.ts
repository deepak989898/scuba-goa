import { NextResponse } from "next/server";

export function rateLimitResponse(opts: {
  limit: number;
  retryAfterSec: number;
  remaining?: number;
}): NextResponse {
  const remaining = opts.remaining ?? 0;
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, opts.retryAfterSec)),
        "X-RateLimit-Limit": String(opts.limit),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
        "Cache-Control": "no-store",
      },
    },
  );
}
