import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseBlogPostFromFirestore } from "@/lib/blog-firestore";
import {
  blogToSocialPayload,
  guideToSocialPayload,
} from "@/lib/social-media/build-content";
import { dispatchSocialPost } from "@/lib/social-media/dispatch";
import type { SocialContentType, SocialPlatform } from "@/lib/social-media/types";
import { parseSeoPageFromFirestore } from "@/lib/seo-page-firestore";

export const runtime = "nodejs";

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

  const platforms = (body.platforms ?? []).filter((p) => PLATFORMS.includes(p));
  if (!platforms.length) {
    return NextResponse.json(
      { error: "Select at least one platform" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  let payload;
  if (contentType === "blog") {
    const snap = await db.collection("blogPosts").doc(slug).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }
    const post = parseBlogPostFromFirestore(slug, snap.data() as Record<string, unknown>, {
      requirePublished: false,
    });
    if (!post) {
      return NextResponse.json({ error: "Invalid blog post" }, { status: 400 });
    }
    payload = blogToSocialPayload(post);
  } else {
    const snap = await db.collection("seoPages").doc(slug).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }
    const page = parseSeoPageFromFirestore(slug, snap.data() as Record<string, unknown>, {
      requirePublished: false,
    });
    if (!page) {
      return NextResponse.json({ error: "Invalid guide" }, { status: 400 });
    }
    payload = guideToSocialPayload(page);
  }

  const log = await dispatchSocialPost(payload, platforms, "manual");
  return NextResponse.json({ ok: true, log });
}
