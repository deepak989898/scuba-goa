import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { autoPublishContentToSocial } from "@/lib/social-media/auto-publish";
import type { SocialContentType } from "@/lib/social-media/types";

export const runtime = "nodejs";

/** Trigger automation when a guide (or blog) is newly published. */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    contentType?: SocialContentType;
    slug?: string;
  };

  const contentType = body.contentType;
  const slug = String(body.slug ?? "").trim();
  if (!contentType || !slug) {
    return NextResponse.json(
      { error: "contentType and slug required" },
      { status: 400 },
    );
  }

  const result = await autoPublishContentToSocial(contentType, slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Auto publish failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, skipped: result.skipped === true });
}
