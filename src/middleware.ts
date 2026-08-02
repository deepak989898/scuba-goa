import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  firestoreReadPauseMessage,
  getFirestoreReadPauseUntilIso,
  isFirestoreReadPaused,
} from "@/lib/firestore-read-pause";
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
  if (
    process.env.VERCEL_ENV === "preview" &&
    /^https:\/\/[\w-]+-[\w.-]+\.vercel\.app$/i.test(origin)
  ) {
    return true;
  }
  return false;
}

/** Paths that burn Firestore reads — blocked during emergency pause. */
function shouldBlockForReadPause(req: NextRequest): boolean {
  if (!isFirestoreReadPaused()) return false;
  const path = req.nextUrl.pathname;
  const method = req.method.toUpperCase();

  if (path.startsWith("/api/cron")) return true;
  if (path === "/api/t" || path.startsWith("/api/analytics")) return true;

  // Admin list/dashboard GETs (heavy). Allow PATCH/POST so critical saves can still run.
  if (path.startsWith("/api/admin") && method === "GET") return true;

  return false;
}

/**
 * Tighten CORS + emergency Firestore read pause (quota protection).
 */
export function middleware(request: NextRequest) {
  if (shouldBlockForReadPause(request)) {
    return NextResponse.json(
      {
        error: firestoreReadPauseMessage(),
        paused: true,
        resumeAt: getFirestoreReadPauseUntilIso(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Firestore-Read-Pause": "1",
        },
      },
    );
  }

  const origin = request.headers.get("origin");
  const response = NextResponse.next();

  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  } else if (origin) {
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
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
