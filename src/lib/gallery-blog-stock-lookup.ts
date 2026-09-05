import {
  collection,
  documentId,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import type { BlogFeaturedImageMeta } from "@/lib/cms-image";
import {
  hasEditorialBlogFeaturedImage,
  isBlogStockImageMeta,
  isFreeStockImageUrl,
} from "@/lib/cms-image";

const CHUNK = 30;

const EDITORIAL_SOURCES = new Set(["openai", "upload", "manual", "generated"]);

/**
 * Stricter than blog hero display — gallery only shows AI-generated or admin uploads,
 * never free stock (even when re-hosted on Firebase).
 */
export function isBlogGalleryEligible(
  featuredImageUrl?: string | null,
  ogImageUrl?: string | null,
  imageMeta?: BlogFeaturedImageMeta | null,
): boolean {
  if (isBlogStockImageMeta(imageMeta)) return false;

  const featured = String(featuredImageUrl ?? "").trim();
  const og = String(ogImageUrl ?? "").trim();
  if (isFreeStockImageUrl(featured) || isFreeStockImageUrl(og)) return false;
  if (featured.includes("wikimedia.org") || og.includes("wikimedia.org")) {
    return false;
  }

  const source = String(imageMeta?.source ?? "").trim().toLowerCase();
  if (EDITORIAL_SOURCES.has(source)) return true;
  if (imageMeta?.imageStatus === "generated") return true;

  // Legacy posts without imageMeta — use broader editorial check as fallback.
  return hasEditorialBlogFeaturedImage(featured, og, imageMeta);
}

/** Slugs of published blogs whose featured image is free stock (not gallery-worthy). */
export async function fetchStockBlogSlugSet(
  db: Firestore,
  slugs: string[],
): Promise<Set<string>> {
  const stock = new Set<string>();
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const q = query(
      collection(db, "blogPosts"),
      where(documentId(), "in", chunk),
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const meta = data.imageMeta as BlogFeaturedImageMeta | undefined;
      if (
        !isBlogGalleryEligible(
          String(data.featuredImageUrl ?? ""),
          String(data.ogImageUrl ?? ""),
          meta,
        )
      ) {
        stock.add(d.id);
      }
    }
  }
  return stock;
}
