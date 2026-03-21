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
    "/admin/login",
  ];
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "/blog" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.8,
  }));
  for (const s of fallbackServices) {
    entries.push({
      url: `${base}/services/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }
  for (const p of blogPosts) {
    entries.push({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }
  return entries;
}
