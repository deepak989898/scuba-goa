/**
 * Hosts listed in next.config `images.remotePatterns` — safe to pass through next/image
 * for compression, responsive srcset, and modern formats.
 */
const OPTIMIZABLE_HOSTS = new Set([
  "images.unsplash.com",
  "res.cloudinary.com",
  "firebasestorage.googleapis.com",
]);

export function isRemoteUrlOptimizableByNext(src: string): boolean {
  const t = src?.trim() ?? "";
  if (!t || t.startsWith("/")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:" && OPTIMIZABLE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}
