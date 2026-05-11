import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/blog/scuba-diving-cost-in-goa",
        destination: "/blog/scuba-diving-price-guide-2026",
        permanent: true,
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
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
