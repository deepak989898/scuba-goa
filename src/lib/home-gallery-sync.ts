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
  sha256?: string;
  perceptualHash?: string;
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
  const sha = input.sha256?.trim().toLowerCase() || "";
  const ph = input.perceptualHash?.trim().toLowerCase() || "";
  const existing = await db.collection("homeGallery").get();
  const alreadyElsewhere = existing.docs.some((docSnap) => {
    if (docSnap.id === docId) return false;
    const data = docSnap.data();
    const url = String(data.mediaUrl ?? data.imageUrl ?? "").trim();
    if (url && galleryMediaDedupeKey(url) === mediaKey) return true;
    const otherSha = String(data.sha256 ?? "").trim().toLowerCase();
    if (sha && otherSha && sha === otherSha) return true;
    const otherPh = String(data.perceptualHash ?? "").trim().toLowerCase();
    if (ph && otherPh && ph === otherPh) return true;
    return false;
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
      ...(sha ? { sha256: sha } : {}),
      ...(ph ? { perceptualHash: ph } : {}),
    },
    { merge: true },
  );
}

/** Delete Firestore gallery docs that share the same media file (keep first by sortOrder). */
export async function purgeDuplicateHomeGalleryDocs(): Promise<{
  kept: number;
  deleted: number;
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");

  const snap = await db.collection("homeGallery").get();
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      mediaUrl: String(data.mediaUrl ?? data.imageUrl ?? "").trim(),
      sha256: String(data.sha256 ?? "").trim().toLowerCase(),
      perceptualHash: String(data.perceptualHash ?? "").trim().toLowerCase(),
      sortOrder: Number(data.sortOrder ?? 0),
    };
  });
  rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  const seenUrl = new Set<string>();
  const seenSha = new Set<string>();
  const seenPh = new Set<string>();
  const keep = new Set<string>();

  for (const row of rows) {
    const urlKey = galleryMediaDedupeKey(row.mediaUrl);
    const sha = row.sha256;
    const ph = row.perceptualHash;
    const dup =
      (Boolean(urlKey) && seenUrl.has(urlKey)) ||
      (Boolean(sha) && seenSha.has(sha)) ||
      (Boolean(ph) && seenPh.has(ph));
    if (dup || (!urlKey && !sha && !ph)) {
      continue;
    }
    if (urlKey) seenUrl.add(urlKey);
    if (sha) seenSha.add(sha);
    if (ph) seenPh.add(ph);
    keep.add(row.id);
  }

  let deleted = 0;
  for (const row of rows) {
    if (keep.has(row.id)) continue;
    await db.collection("homeGallery").doc(row.id).delete();
    deleted += 1;
  }
  return { kept: keep.size, deleted };
}

/** Backfill all published blog posts that have a featured image. */
export async function backfillBlogImagesToHomeGallery(): Promise<{
  synced: number;
  skipped: number;
  purged?: number;
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");

  // Remove existing duplicate rows first so the public gallery stays unique
  const purge = await purgeDuplicateHomeGalleryDocs();

  const snap = await db
    .collection("blogPosts")
    .where("published", "==", true)
    .get();

  let synced = 0;
  let skipped = 0;

  const gallerySnap = await db.collection("homeGallery").get();
  const seenMedia = new Set<string>();
  const seenSha = new Set<string>();
  const seenPh = new Set<string>();
  for (const g of gallerySnap.docs) {
    const data = g.data();
    const url = String(data.mediaUrl ?? data.imageUrl ?? "").trim();
    if (url) seenMedia.add(galleryMediaDedupeKey(url));
    const sha = String(data.sha256 ?? "").trim().toLowerCase();
    if (sha) seenSha.add(sha);
    const ph = String(data.perceptualHash ?? "").trim().toLowerCase();
    if (ph) seenPh.add(ph);
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const url = String(data.featuredImageUrl ?? "").trim();
    if (!url) {
      skipped += 1;
      continue;
    }
    const key = galleryMediaDedupeKey(url);
    const sha = String(data.imageMeta?.sha256 ?? "").trim().toLowerCase();
    const ph = String(data.imageMeta?.perceptualHash ?? "").trim().toLowerCase();
    const dup =
      seenMedia.has(key) ||
      (sha && seenSha.has(sha)) ||
      (ph && seenPh.has(ph));
    if (dup) {
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
      sha256: sha || undefined,
      perceptualHash: ph || undefined,
    });
    seenMedia.add(key);
    if (sha) seenSha.add(sha);
    if (ph) seenPh.add(ph);
    synced += 1;
  }

  return { synced, skipped, purged: purge.deleted };
}
