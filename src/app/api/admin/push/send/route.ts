import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  isWebPushConfigured,
  sendPushCampaign,
} from "@/lib/web-push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      {
        error:
          "Web push is not configured. Add VAPID keys to environment variables and redeploy.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title : "";
    const description =
      typeof body.description === "string"
        ? body.description
        : typeof body.body === "string"
          ? body.body
          : "";
    const url = typeof body.url === "string" ? body.url : undefined;

    const result = await sendPushCampaign({
      title,
      body: description,
      url,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[admin/push/send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 },
    );
  }
}
