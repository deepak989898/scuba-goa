import { getAdminDb } from "@/lib/firebase-admin";
import {
  inferGalleryCategoryFromBlog,
  type GalleryCategoryId,
} from "@/lib/gallery-categories";

const BLOG_DOC_PREFIX = "blog-";

export function blogHomeGalleryDocId(blogSlug: string): string {
  return `${BLOG_DOC_PREFIX}${blogSlug}`;
}

export type SyncBlogToGalleryInput = {
  blogSlug: string;
  title: string;
  featuredImageUrl: string;
  serviceSlug?: string;
  published?: boolean;
  category?: GalleryCategoryId;
};

/** Upsert or remove a blog featured image in `homeGallery` (public /gallery). */
export async function syncBlogImageToHomeGallery(
  input: SyncBlogToGalleryInput,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const slug = input.blogSlug.trim();
  if (!slug) return;

  const docId = blogHomeGalleryDocId(slug);
  const ref = db.collection("homeGallery").doc(docId);

  if (input.published === false) {
    try {
      await ref.delete();
    } catch {
      /* doc may not exist */
    }
    return;
  }

  const mediaUrl = input.featuredImageUrl.trim();
  if (!mediaUrl) return;

  const category =
    input.category ??
    inferGalleryCategoryFromBlog(String(input.serviceSlug ?? "").trim());

  const sortOrder = -Math.floor(Date.now() / 1000);

  await ref.set(
    {
      type: "image",
      mediaUrl,
      posterUrl: "",
      alt: String(input.title ?? "").trim() || "Blog photo",
      category,
      source: "blog",
      sourceSlug: slug,
      sortOrder,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/** Backfill all published blog posts that have a featured image. */
export async function backfillBlogImagesToHomeGallery(): Promise<{
  synced: number;
  skipped: number;
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");

  const snap = await db
    .collection("blogPosts")
    .where("published", "==", true)
    .get();

  let synced = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const url = String(data.featuredImageUrl ?? "").trim();
    if (!url) {
      skipped += 1;
      continue;
    }
    await syncBlogImageToHomeGallery({
      blogSlug: doc.id,
      title: String(data.title ?? doc.id),
      featuredImageUrl: url,
      serviceSlug: String(data.serviceSlug ?? ""),
      published: true,
    });
    synced += 1;
  }

  return { synced, skipped };
}
