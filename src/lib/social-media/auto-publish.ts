import { getAdminDb } from "@/lib/firebase-admin";
import { parseBlogPostFromFirestore } from "@/lib/blog-firestore";
import {
  blogToSocialPayload,
  guideToSocialPayload,
} from "@/lib/social-media/build-content";
import { dispatchSocialPost } from "@/lib/social-media/dispatch";
import {
  enabledPlatforms,
  getSocialMediaSettings,
} from "@/lib/social-media/settings";
import type { SocialContentType } from "@/lib/social-media/types";
import { parseSeoPageFromFirestore } from "@/lib/seo-page-firestore";

export async function autoPublishContentToSocial(
  contentType: SocialContentType,
  slug: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const social = await getSocialMediaSettings();
  const platforms = enabledPlatforms(social.automation);
  if (!platforms.length) {
    return { ok: true, skipped: true };
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, error: "Server not configured" };
  }

  if (contentType === "blog") {
    const snap = await db.collection("blogPosts").doc(slug).get();
    if (!snap.exists) return { ok: false, error: "Blog post not found" };
    const post = parseBlogPostFromFirestore(slug, snap.data() as Record<string, unknown>, {
      requirePublished: false,
    });
    if (!post?.published) return { ok: false, error: "Blog is not published" };
    await dispatchSocialPost(blogToSocialPayload(post), platforms, "auto");
    return { ok: true };
  }

  const snap = await db.collection("seoPages").doc(slug).get();
  if (!snap.exists) return { ok: false, error: "Guide not found" };
  const page = parseSeoPageFromFirestore(slug, snap.data() as Record<string, unknown>, {
    requirePublished: false,
  });
  if (!page?.published) return { ok: false, error: "Guide is not published" };
  await dispatchSocialPost(guideToSocialPayload(page), platforms, "auto");
  return { ok: true };
}
