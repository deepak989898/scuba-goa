import {
  classifyContent,
  scoreClusterRelevance,
  type ClusterContentItem,
} from "@/lib/content-clusters";
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

export type SeoPageListItem = {
  slug: string;
  headline: string;
  updatedAt: string;
  metaDescription?: string;
  imageUrl?: string;
  heroImageUrl?: string;
  ogImageUrl?: string;
  keywords?: string[];
};

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
      const imageUrl = (p.heroImageUrl || p.ogImageUrl).trim() || undefined;
      out.push({
        slug: p.slug,
        headline: p.headline,
        updatedAt: p.updatedAt,
        metaDescription: p.metaDescription,
        imageUrl,
        heroImageUrl: p.heroImageUrl,
        ogImageUrl: p.ogImageUrl,
        keywords: p.keywords,
      });
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  } catch {
    return [];
  }
}

function toGuideClusterItem(g: SeoPageListItem): ClusterContentItem {
  return {
    kind: "guide",
    slug: g.slug,
    title: g.headline,
    description: g.metaDescription ?? "",
    keywords: g.keywords ?? [],
    imageUrl: g.imageUrl,
    updatedAt: g.updatedAt,
    href: `/guides/${g.slug}`,
    topic: classifyContent({
      title: g.headline,
      keywords: g.keywords ?? [],
      slug: g.slug,
    }),
  };
}

/** Related published guides for a guide detail page (topic-cluster aware). */
export async function getRelatedSeoGuides(
  currentSlug: string,
  limit = 4,
): Promise<SeoPageListItem[]> {
  const all = await listPublishedSeoPagesServer();
  const current = all.find((g) => g.slug === currentSlug);
  if (!current) {
    return all.filter((g) => g.slug !== currentSlug).slice(0, limit);
  }

  const currentMeta = {
    kind: "guide" as const,
    slug: currentSlug,
    title: current.headline,
    description: current.metaDescription ?? "",
    keywords: current.keywords ?? [],
    topic: classifyContent({
      title: current.headline,
      keywords: current.keywords ?? [],
      slug: currentSlug,
    }),
  };

  return all
    .filter((g) => g.slug !== currentSlug)
    .map((g) => ({
      g,
      score: scoreClusterRelevance(currentMeta, toGuideClusterItem(g)),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.g.updatedAt.localeCompare(a.g.updatedAt),
    )
    .slice(0, limit)
    .map(({ g }) => g);
}
