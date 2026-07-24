/**
 * Detect hero posters/thumbnails already stored as our optimized WebP
 * (uploaded via /api/admin/hero-media-upload → hero/posters|thumbnails/*.webp).
 */
export function isHeroOptimizedWebpUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return false;
  const looksWebp = u.includes(".webp");
  if (!looksWebp) return false;
  return (
    u.includes("hero/posters") ||
    u.includes("hero/thumbnails") ||
    u.includes("hero%2fposters") ||
    u.includes("hero%2fthumbnails")
  );
}
