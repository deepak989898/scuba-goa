import { NextResponse } from "next/server";
import { upsertPushSubscription } from "@/lib/web-push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.trim() : undefined;
    const sub = body.subscription as Record<string, unknown> | undefined;
    const endpoint =
      typeof sub?.endpoint === "string" ? sub.endpoint.trim() : "";
    const keys = sub?.keys as Record<string, unknown> | undefined;
    const p256dh =
      typeof keys?.p256dh === "string" ? keys.p256dh.trim() : "";
    const auth = typeof keys?.auth === "string" ? keys.auth.trim() : "";

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Invalid push subscription payload" },
        { status: 400 },
      );
    }

    await upsertPushSubscription({
      sessionId,
      visitorId,
      userAgent: req.headers.get("user-agent") ?? undefined,
      subscription: {
        endpoint,
        keys: { p256dh, auth },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push/subscribe]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Subscribe failed" },
      { status: 500 },
    );
  }
}
