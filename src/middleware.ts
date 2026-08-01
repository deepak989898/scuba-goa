import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PRIMARY_SITE_ORIGIN, SITE_ORIGINS } from "@/lib/security-headers";

const DEV_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if ((SITE_ORIGINS as readonly string[]).includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && DEV_ORIGINS.has(origin)) {
    return true;
  }
  // Vercel preview deployments (admin testing)
  if (
    process.env.VERCEL_ENV === "preview" &&
    /^https:\/\/[\w-]+-[\w.-]+\.vercel\.app$/i.test(origin)
  ) {
    return true;
  }
  return false;
}

/**
 * Tighten CORS: never echo Access-Control-Allow-Origin: * for foreign sites.
 * Allowed browser origins get an explicit allow; others get no ACAO.
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = NextResponse.next();

  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  } else if (origin) {
    // Foreign Origin present — do not allow cross-site reads.
    // Override platform default (*) with our primary host (scanners expect non-*).
    // Browsers still block foreign sites because Origin won't match.
    response.headers.set("Access-Control-Allow-Origin", PRIMARY_SITE_ORIGIN);
    response.headers.set("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    const allowOrigin = isAllowedOrigin(origin) ? origin : PRIMARY_SITE_ORIGIN;
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Apply to pages + APIs. Skip Next internals and common static assets
     * that do not need Origin reflection (still get headers via next.config).
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
