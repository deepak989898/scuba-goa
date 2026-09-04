import type { BlogPost } from "@/data/blog/post-types";
import {
  type ClusterContentItem,
  classifyContent,
  pickClusterRelated,
  scoreClusterRelevance,
} from "@/lib/content-clusters";
import { getAllBlogPostsMerged } from "@/lib/blog-posts-unified";
import { listPublishedBlogPostsServer } from "@/lib/blog-posts-server";
import { hasEditorialBlogFeaturedImage } from "@/lib/cms-image";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";
import type { SeoPageListItem } from "@/lib/seo-pages-server";

/** Max cards in “More like this” on blog + guide detail pages. */
export const MORE_LIKE_THIS_LIMIT = 2;

async function buildClusterCatalog(): Promise<ClusterContentItem[]> {
  const [guides, blogPosts] = await Promise.all([
    listPublishedSeoPagesServer(),
    listPublishedBlogPostsServer(),
  ]);

  const guideItems: ClusterContentItem[] = guides.map((g) => ({
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
    editorialImage: hasEditorialBlogFeaturedImage(
      g.heroImageUrl,
      g.ogImageUrl,
    ),
  }));

  const blogItems: ClusterContentItem[] = blogPosts.map((b) => ({
    kind: "blog",
    slug: b.slug,
    title: b.title,
    description: b.excerpt,
    keywords: b.keywords,
    imageUrl: b.featuredImageUrl || b.ogImageUrl || undefined,
    updatedAt: b.updatedAt ?? b.date,
    href: `/blog/${b.slug}`,
    topic: classifyContent({
      title: b.title,
      keywords: b.keywords,
      slug: b.slug,
    }),
    editorialImage: hasEditorialBlogFeaturedImage(
      b.featuredImageUrl,
      b.ogImageUrl,
      b.imageMeta,
    ),
  }));

  return [...guideItems, ...blogItems];
}

export async function getMoreLikeThisForGuide(
  slug: string,
  limit = MORE_LIKE_THIS_LIMIT,
): Promise<ClusterContentItem[]> {
  const catalog = await buildClusterCatalog();
  const current = catalog.find((c) => c.kind === "guide" && c.slug === slug);
  if (!current) return [];
  return pickClusterRelated(
    { ...current, kind: "guide", slug },
    catalog,
    limit,
  );
}

export async function getMoreLikeThisForBlog(
  slug: string,
  limit = MORE_LIKE_THIS_LIMIT,
): Promise<ClusterContentItem[]> {
  const catalog = await buildClusterCatalog();
  const current = catalog.find((c) => c.kind === "blog" && c.slug === slug);
  if (!current) return [];
  return pickClusterRelated(
    { ...current, kind: "blog", slug },
    catalog,
    limit,
  );
}

export async function getRelatedSeoGuidesByCluster(
  currentSlug: string,
  limit = 4,
): Promise<SeoPageListItem[]> {
  const [all, catalog] = await Promise.all([
    listPublishedSeoPagesServer(),
    buildClusterCatalog(),
  ]);
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

  const guideCatalog = catalog.filter((c) => c.kind === "guide");
  const ranked = guideCatalog
    .filter((g) => g.slug !== currentSlug)
    .map((g) => ({
      g,
      score: scoreClusterRelevance(currentMeta, g),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.g.updatedAt ?? "").localeCompare(a.g.updatedAt ?? ""),
    );

  const slugs = ranked.slice(0, limit).map((r) => r.g.slug);
  return slugs
    .map((s) => all.find((g) => g.slug === s))
    .filter((g): g is SeoPageListItem => Boolean(g));
}

export async function getRelatedBlogPostsByCluster(
  currentSlug: string,
  limit = 6,
): Promise<BlogPost[]> {
  const [all, catalog] = await Promise.all([
    getAllBlogPostsMerged(),
    buildClusterCatalog(),
  ]);
  const current = all.find((p) => p.slug === currentSlug);
  if (!current) return [];

  const currentMeta = {
    kind: "blog" as const,
    slug: currentSlug,
    title: current.title,
    description: current.excerpt,
    keywords: current.keywords,
    topic: classifyContent({
      title: current.title,
      keywords: current.keywords,
      slug: currentSlug,
    }),
  };

  const blogCatalog = catalog.filter((c) => c.kind === "blog");
  const ranked = blogCatalog
    .filter((b) => b.slug !== currentSlug)
    .map((b) => ({
      b,
      score: scoreClusterRelevance(currentMeta, b),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.b.updatedAt ?? "").localeCompare(a.b.updatedAt ?? ""),
    );

  const slugs = ranked.slice(0, limit).map((r) => r.b.slug);
  return slugs
    .map((s) => all.find((p) => p.slug === s))
    .filter((p): p is BlogPost => Boolean(p));
}

export { buildClusterCatalog };
