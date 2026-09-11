import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionValue,
} from "@/lib/admin-session-cookie";

export const runtime = "nodejs";

/** Exchange Firebase ID token for HttpOnly admin session cookie. */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const value = await createAdminSessionValue(auth.uid);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, value, adminSessionCookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Session failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Clear admin session cookie on sign-out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });
  return res;
}
