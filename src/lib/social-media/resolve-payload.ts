import { getAdminDb } from "@/lib/firebase-admin";
import { parseBlogPostFromFirestore } from "@/lib/blog-firestore";
import {
  blogToSocialPayload,
  guideToSocialPayload,
} from "@/lib/social-media/build-content";
import {
  galleryToSocialPayload,
  getGalleryMediaById,
} from "@/lib/social-media/gallery-media";
import type { SocialContentPayload, SocialContentType } from "@/lib/social-media/types";
import { parseSeoPageFromFirestore } from "@/lib/seo-page-firestore";

export async function resolveSocialContentPayload(
  contentType: SocialContentType,
  refId: string,
): Promise<SocialContentPayload | null> {
  const db = getAdminDb();
  if (!db) return null;
  const slug = refId.trim();
  if (!slug) return null;

  if (contentType === "blog") {
    const snap = await db.collection("blogPosts").doc(slug).get();
    if (!snap.exists) return null;
    const post = parseBlogPostFromFirestore(slug, snap.data() as Record<string, unknown>, {
      requirePublished: false,
    });
    if (!post) return null;
    return blogToSocialPayload(post);
  }

  if (contentType === "guide") {
    const snap = await db.collection("seoPages").doc(slug).get();
    if (!snap.exists) return null;
    const page = parseSeoPageFromFirestore(slug, snap.data() as Record<string, unknown>, {
      requirePublished: false,
    });
    if (!page) return null;
    return guideToSocialPayload(page);
  }

  const row = await getGalleryMediaById(slug);
  if (!row) return null;
  if (contentType === "reel" && row.contentType !== "reel") return null;
  if (contentType === "video" && row.contentType !== "video") return null;
  return galleryToSocialPayload(row);
}
