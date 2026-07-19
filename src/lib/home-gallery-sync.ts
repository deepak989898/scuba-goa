import { getAdminDb } from "@/lib/firebase-admin";
import {
  inferGalleryCategoryFromBlog,
  type GalleryCategoryId,
} from "@/lib/gallery-categories";
import { galleryMediaDedupeKey } from "@/lib/home-gallery-dedupe";

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

  const mediaKey = galleryMediaDedupeKey(mediaUrl);
  const existing = await db.collection("homeGallery").get();
  const alreadyElsewhere = existing.docs.some((docSnap) => {
    if (docSnap.id === docId) return false;
    const data = docSnap.data();
    const url = String(data.mediaUrl ?? data.imageUrl ?? "").trim();
    return url ? galleryMediaDedupeKey(url) === mediaKey : false;
  });
  // Same file already listed under another gallery entry — keep one copy.
  if (alreadyElsewhere) {
    try {
      await ref.delete();
    } catch {
      /* may not exist */
    }
    return;
  }

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

  const gallerySnap = await db.collection("homeGallery").get();
  const seenMedia = new Set<string>();
  for (const g of gallerySnap.docs) {
    const url = String(g.data().mediaUrl ?? g.data().imageUrl ?? "").trim();
    if (!url) continue;
    // Ignore blog-* docs during seed — they will be re-synced uniquely below
    if (String(g.id).startsWith(BLOG_DOC_PREFIX)) continue;
    seenMedia.add(galleryMediaDedupeKey(url));
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const url = String(data.featuredImageUrl ?? "").trim();
    if (!url) {
      skipped += 1;
      continue;
    }
    const key = galleryMediaDedupeKey(url);
    if (seenMedia.has(key)) {
      // Drop duplicate blog gallery row if it exists
      try {
        await db.collection("homeGallery").doc(blogHomeGalleryDocId(doc.id)).delete();
      } catch {
        /* ignore */
      }
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
    seenMedia.add(key);
    synced += 1;
  }

  return { synced, skipped };
}
