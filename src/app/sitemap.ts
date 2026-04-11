import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog-posts";
import { fallbackServices } from "@/data/services";
import { SITE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, "");
  const staticPaths = [
    "",
    "/about",
    "/contact",
    "/booking",
    "/services",
    "/blog",
    "/offers",
    "/admin/login",
  ];
  const staticLastMod: Record<string, string> = {
    "": "2026-04-09",
    "/about": "2026-03-26",
    "/contact": "2026-03-26",
    "/booking": "2026-04-09",
    "/services": "2026-04-03",
    "/blog": "2026-04-09",
    "/offers": "2026-04-11",
    "/admin/login": "2026-03-26",
  };
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(staticLastMod[path] ?? "2026-04-01"),
    changeFrequency: path === "/blog" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.8,
  }));
  for (const s of fallbackServices) {
    entries.push({
      url: `${base}/services/${s.slug}`,
      lastModified: new Date("2026-04-03"),
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }
  for (const p of blogPosts) {
    const modified = p.updatedAt ?? p.date;
    entries.push({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(modified),
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }
  return entries;
}
