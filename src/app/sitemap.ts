import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog-posts";
import { fallbackServices } from "@/data/services";
import { SITE_URL } from "@/lib/constants";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";
import { listPublishedBlogPostsServer } from "@/lib/blog-posts-server";
import { getAllPackagesServer } from "@/lib/get-packages-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");
  const staticPaths = [
    "",
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
  const staticLastMod: Record<string, string> = {
    "": "2026-06-06",
    "/about": "2026-03-26",
    "/contact": "2026-03-26",
    "/booking": "2026-06-06",
    "/services": "2026-04-03",
    "/blog": "2026-04-09",
    "/guides": "2026-04-11",
    "/offers": "2026-04-11",
    "/gallery": "2026-05-13",
    "/privacy-policy": "2026-04-11",
    "/terms-and-conditions": "2026-04-11",
    "/refund-cancellation": "2026-04-11",
  };
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(staticLastMod[path] ?? "2026-04-01"),
    changeFrequency:
      path === "/blog" || path === "/guides" ? "weekly" : "daily",
    priority: path === "" ? 1 : path === "/guides" ? 0.78 : 0.8,
  }));
  for (const s of fallbackServices) {
    entries.push({
      url: `${base}/services/${s.slug}`,
      lastModified: new Date("2026-04-03"),
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }
  const packages = await getAllPackagesServer();
  for (const p of packages) {
    entries.push({
      url: `${base}/packages/${p.id}`,
      lastModified: new Date("2026-06-12"),
      changeFrequency: "weekly",
      priority: 0.84,
    });
  }
  const staticBlogSlugs = new Set(blogPosts.map((p) => p.slug));
  for (const p of blogPosts) {
    const modified = p.updatedAt ?? p.date;
    entries.push({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(modified),
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }
  const fsBlogs = await listPublishedBlogPostsServer();
  for (const p of fsBlogs) {
    if (staticBlogSlugs.has(p.slug)) continue;
    entries.push({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.76,
    });
  }
  const guides = await listPublishedSeoPagesServer();
  for (const g of guides) {
    entries.push({
      url: `${base}/guides/${g.slug}`,
      lastModified: new Date(g.updatedAt),
      changeFrequency: "weekly",
      priority: 0.82,
    });
  }
  return entries;
}
