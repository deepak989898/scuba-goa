import { blogPosts } from "@/data/blog-posts";
import { fallbackServices } from "@/data/services";
import { BLOG_PERMANENT_REDIRECTS } from "@/lib/blog-redirects";
import { listPublishedBlogPostsServer } from "@/lib/blog-posts-server";
import { getAllPackagesServer } from "@/lib/get-packages-server";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";
import { SITE_URL } from "@/lib/constants";

type Entry = { loc: string; lastmod?: string };

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderUrlset(entries: Entry[]): string {
  const body = entries
    .map((e) => {
      const lm = e.lastmod
        ? `<lastmod>${escapeXml(e.lastmod.slice(0, 10))}</lastmod>`
        : "";
      return `<url><loc>${escapeXml(e.loc)}</loc>${lm}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export async function buildSegmentEntries(
  segment: "blog" | "services" | "static",
): Promise<Entry[]> {
  const base = SITE_URL.replace(/\/$/, "");
  const redirected = new Set(BLOG_PERMANENT_REDIRECTS.map((r) => r.source));

  if (segment === "static") {
    const paths = [
      "/",
      "/about",
      "/contact",
      "/booking",
      "/services",
      "/blog",
      "/guides",
      "/offers",
      "/gallery",
      "/privacy-policy",
      "/terms-and-conditions",
      "/refund-cancellation",
    ];
    return paths.map((p) => ({ loc: `${base}${p === "/" ? "" : p}` || `${base}/` }));
  }

  if (segment === "services") {
    const entries: Entry[] = fallbackServices.map((s) => ({
      loc: `${base}/services/${s.slug}`,
      lastmod: "2026-04-03",
    }));
    const packages = await getAllPackagesServer();
    for (const p of packages) {
      entries.push({ loc: `${base}/packages/${p.id}`, lastmod: "2026-06-12" });
    }
    return entries;
  }

  // blog + guides
  const entries: Entry[] = [];
  for (const p of blogPosts) {
    if (redirected.has(`/blog/${p.slug}`)) continue;
    entries.push({
      loc: `${base}/blog/${p.slug}`,
      lastmod: p.updatedAt ?? p.date,
    });
  }
  const staticSlugs = new Set(blogPosts.map((p) => p.slug));
  const fsBlogs = await listPublishedBlogPostsServer();
  for (const p of fsBlogs) {
    if (staticSlugs.has(p.slug)) continue;
    if (redirected.has(`/blog/${p.slug}`)) continue;
    entries.push({ loc: `${base}/blog/${p.slug}`, lastmod: p.updatedAt });
  }
  const guides = await listPublishedSeoPagesServer();
  for (const g of guides) {
    entries.push({ loc: `${base}/guides/${g.slug}`, lastmod: g.updatedAt });
  }
  return entries;
}
