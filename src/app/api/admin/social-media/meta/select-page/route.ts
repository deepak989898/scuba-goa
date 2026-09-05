import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { saveMetaSettings } from "@/lib/social-media/meta/settings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    pageId?: string;
    pageName?: string;
    pageAccessToken?: string;
    instagramBusinessId?: string;
    instagramUsername?: string;
  };

  const pageId = String(body.pageId ?? "").trim();
  const pageAccessToken = String(body.pageAccessToken ?? "").trim();
  if (!pageId || !pageAccessToken) {
    return NextResponse.json({ error: "pageId and pageAccessToken required" }, { status: 400 });
  }

  const next = await saveMetaSettings({
    pageId,
    pageName: String(body.pageName ?? "").trim(),
    pageAccessToken,
    instagramBusinessId: String(body.instagramBusinessId ?? "").trim(),
    instagramUsername: String(body.instagramUsername ?? "").trim(),
    lastPostError: null,
  });

  return NextResponse.json({
    ok: true,
    settings: {
      pageId: next.pageId,
      pageName: next.pageName,
      instagramBusinessId: next.instagramBusinessId,
      instagramUsername: next.instagramUsername,
    },
  });
}

export async function DELETE(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await saveMetaSettings({
    userAccessToken: "",
    tokenExpiresAt: null,
    pageId: "",
    pageName: "",
    pageAccessToken: "",
    instagramBusinessId: "",
    instagramUsername: "",
    connectedAt: null,
    lastPostAt: null,
    lastPostError: null,
  });

  return NextResponse.json({ ok: true });
}
