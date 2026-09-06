import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { dispatchSocialPost } from "@/lib/social-media/dispatch";
import { resolveSocialContentPayload } from "@/lib/social-media/resolve-payload";
import type { SocialContentType, SocialPlatform } from "@/lib/social-media/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const PLATFORMS: SocialPlatform[] = [
  "googleBusiness",
  "facebook",
  "instagram",
  "youtube",
];

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    contentType?: SocialContentType;
    slug?: string;
    platforms?: SocialPlatform[];
  };

  const contentType = body.contentType;
  const slug = String(body.slug ?? "").trim();
  if (!contentType || !slug) {
    return NextResponse.json(
      { error: "contentType and slug required" },
      { status: 400 },
    );
  }

  if (
    contentType !== "blog" &&
    contentType !== "guide" &&
    contentType !== "video" &&
    contentType !== "reel"
  ) {
    return NextResponse.json({ error: "Invalid contentType" }, { status: 400 });
  }

  const platforms = (body.platforms ?? []).filter((p) => PLATFORMS.includes(p));
  if (!platforms.length) {
    return NextResponse.json(
      { error: "Select at least one platform" },
      { status: 400 },
    );
  }

  const payload = await resolveSocialContentPayload(contentType, slug);
  if (!payload) {
    const label =
      contentType === "blog"
        ? "Blog post not found"
        : contentType === "guide"
          ? "Guide not found"
          : "Gallery video not found";
    return NextResponse.json({ error: label }, { status: 404 });
  }
  if (contentType === "reel" && payload.contentType !== "reel") {
    return NextResponse.json(
      { error: "Selected item is not a reel (category must be reels in Gallery admin)" },
      { status: 400 },
    );
  }
  if (contentType === "video" && payload.contentType !== "video") {
    return NextResponse.json(
      { error: "Selected item is a reel — choose Reel as content type" },
      { status: 400 },
    );
  }

  const log = await dispatchSocialPost(payload, platforms, "manual");
  return NextResponse.json({ ok: true, log });
}
