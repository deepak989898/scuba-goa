import type { NextConfig } from "next";
import { getAllPermanentRedirects } from "./src/lib/blog-redirects";

const nextConfig: NextConfig = {
  // Tree-shake heavy packages so homepage bundles pull fewer unused modules.
  experimental: {
    optimizePackageImports: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
    ],
  },
  async redirects() {
    return getAllPermanentRedirects().map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    // Prefer AVIF (smallest) and fall back to WebP — both are dramatically
    // smaller than JPEG/PNG and cut the "Improve image delivery" payload.
    formats: ["image/avif", "image/webp"],
    // Cache optimized variants for 30 days at the edge so repeat visitors and
    // CDN nodes do not re-encode on every request.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Tight responsive width set — we only render up to ~1600 px wide hero,
    // so generating 3840 px variants just bloats the cache and wastes bytes.
    deviceSizes: [360, 480, 640, 768, 1024, 1200, 1600],
    imageSizes: [16, 32, 64, 96, 128, 200, 256, 384, 480, 640],
    /**
     * Admins paste image URLs from many external CDNs (tour-aggregator sites,
     * destination marketing portals, TripAdvisor, etc.). When a hostname is
     * NOT listed here, `CmsRemoteImage` is forced to render a raw <img> and
     * the original (often 1–4 MB) file is served unmodified. Routing every
     * HTTPS host through next/image lets the Vercel image optimizer resize,
     * re-encode to AVIF/WebP, and cache the variants — typically cutting
     * those payloads by 80–90% on mobile.
     */
    remotePatterns: [
      { protocol: "https", hostname: "**", pathname: "/**" },
      { protocol: "http", hostname: "**", pathname: "/**" },
    ],
  },
};

export default nextConfig;
