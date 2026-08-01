import { getAllBlogPostsMerged } from "@/lib/blog-posts-unified";
import { getServicesForPublicSeo } from "@/lib/services-for-seo";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";
import type { SeoIntelContentType } from "./types";

export type SitePageRef = {
  id: string;
  url: string;
  path: string;
  title: string;
  pageType: SeoIntelContentType;
  tokens: string[];
  headingsHint: string;
};

function tokensFrom(...parts: string[]): string[] {
  const raw = parts.join(" ").toLowerCase();
  return [
    ...new Set(
      raw
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/[\s-]+/)
        .filter((t) => t.length >= 3),
    ),
  ];
}

/**
 * Build a lightweight corpus of public pages for keyword → page matching.
 */
export async function buildSitePageCorpus(): Promise<SitePageRef[]> {
  const [services, blogs, guides] = await Promise.all([
    getServicesForPublicSeo().catch(() => []),
    getAllBlogPostsMerged().catch(() => []),
    listPublishedSeoPagesServer().catch(() => []),
  ]);

  const pages: SitePageRef[] = [];

  for (const s of services) {
    const path = `/services/${s.slug}`;
    pages.push({
      id: `service:${s.slug}`,
      url: path,
      path,
      title: s.title,
      pageType: "service_page",
      tokens: tokensFrom(s.title, s.slug, s.short ?? ""),
      headingsHint: s.title,
    });
    for (const sub of s.subServices ?? []) {
      const title = String(sub.title ?? "").trim();
      if (!title) continue;
      const subSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!subSlug) continue;
      const subPath = `/services/${s.slug}/${subSlug}`;
      pages.push({
        id: `service:${s.slug}:${subSlug}`,
        url: subPath,
        path: subPath,
        title,
        pageType: "service_page",
        tokens: tokensFrom(title, s.title, s.slug),
        headingsHint: title,
      });
    }
  }

  for (const b of blogs) {
    const path = `/blog/${b.slug}`;
    pages.push({
      id: `blog:${b.slug}`,
      url: path,
      path,
      title: b.title,
      pageType: "blog",
      tokens: tokensFrom(
        b.title,
        b.slug,
        b.excerpt ?? "",
        ...(b.keywords ?? []).slice(0, 8),
      ),
      headingsHint: b.title,
    });
  }

  for (const g of guides) {
    const path = `/guides/${g.slug}`;
    pages.push({
      id: `guide:${g.slug}`,
      url: path,
      path,
      title: g.headline || g.slug,
      pageType: "guide",
      tokens: tokensFrom(
        g.headline || "",
        g.slug,
        g.metaDescription || "",
        ...(g.keywords ?? []).slice(0, 8),
      ),
      headingsHint: g.headline || g.slug,
    });
  }

  return pages;
}
