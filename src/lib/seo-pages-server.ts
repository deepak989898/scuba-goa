import { getAdminDb } from "@/lib/firebase-admin";
import {
  isValidSeoSlug,
  normalizeSeoSlugInput,
  parseSeoPageFromFirestore,
  type SeoPageFirestore,
} from "@/lib/seo-page-firestore";

/** Published page for public `/guides/[slug]` (requires Admin SDK + `published == true`). */
export async function getPublishedSeoPageBySlug(
  slug: string,
): Promise<SeoPageFirestore | null> {
  const key = normalizeSeoSlugInput(slug);
  if (!isValidSeoSlug(key)) return null;
  const db = getAdminDb();
  if (!db) return null;
  try {
    const ref = await db.collection("seoPages").doc(key).get();
    if (!ref.exists) return null;
    return parseSeoPageFromFirestore(ref.id, ref.data() as Record<string, unknown>, {
      requirePublished: true,
    });
  } catch {
    return null;
  }
}

export type SeoPageListItem = { slug: string; headline: string; updatedAt: string };

/** All published guides for `/guides` index and sitemap. */
export async function listPublishedSeoPagesServer(): Promise<SeoPageListItem[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection("seoPages").get();
    const out: SeoPageListItem[] = [];
    for (const d of snap.docs) {
      const p = parseSeoPageFromFirestore(d.id, d.data() as Record<string, unknown>, {
        requirePublished: true,
      });
      if (!p) continue;
      out.push({ slug: p.slug, headline: p.headline, updatedAt: p.updatedAt });
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  } catch {
    return [];
  }
}
