/**
 * On-demand image resize via `/api/image` — replaces Vercel `/_next/image`
 * when the hosted optimizer returns 402 on this project.
 */

const MAX_WIDTH = 2000;
const MIN_WIDTH = 16;
const DEFAULT_QUALITY = 75;

export function clampImageWidth(width: number): number {
  if (!Number.isFinite(width)) return 640;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}

export function clampImageQuality(quality: number): number {
  if (!Number.isFinite(quality)) return DEFAULT_QUALITY;
  return Math.min(90, Math.max(40, Math.round(quality)));
}

/** Build `/api/image` URL used by next/image custom loader and raw `<img>` srcset. */
export function buildOptimizedImageUrl(
  src: string,
  width: number,
  quality = DEFAULT_QUALITY,
): string {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) return "";
  const w = clampImageWidth(width);
  const q = clampImageQuality(quality);
  const params = new URLSearchParams({
    src: trimmed,
    w: String(w),
    q: String(q),
  });
  return `/api/image?${params.toString()}`;
}

/** Responsive widths aligned with next.config `deviceSizes` + `imageSizes`. */
export const RESPONSIVE_WIDTHS = [
  96, 128, 200, 256, 360, 384, 480, 640, 768, 1024, 1200, 1600,
] as const;

export function buildSrcSet(
  src: string,
  widths: readonly number[] = RESPONSIVE_WIDTHS,
  quality = DEFAULT_QUALITY,
): string {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) return "";
  return widths
    .map((w) => `${buildOptimizedImageUrl(trimmed, w, quality)} ${w}w`)
    .join(", ");
}

/** Hosts we allow the image proxy to fetch (SSRF guard). */
export function isRemoteImageFetchAllowed(url: string): boolean {
  const t = url?.trim() ?? "";
  if (!t) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.endsWith(".local")
    ) {
      return false;
    }
    if (host.includes("firebasestorage")) return true;
    if (host === "storage.googleapis.com") return true;
    if (host.endsWith(".storage.googleapis.com")) return true;
    if (host.includes("googleapis.com")) return true;
    if (host.includes("b-cdn.net")) return true;
    if (host.includes("wikimedia.org")) return true;
    if (host.includes("wikipedia.org")) return true;
    if (host.includes("unsplash.com")) return true;
    if (host.includes("pexels.com")) return true;
    if (host.includes("pixabay.com")) return true;
    if (host.includes("tripadvisor")) return true;
    if (host.includes("cloudinary")) return true;
    if (host.includes("imgix.net")) return true;
    // Any other public HTTPS image URL admins may paste in CMS.
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Safe read of a `/public` asset path (no traversal). */
export function resolvePublicFilePath(srcPath: string): string | null {
  const raw = srcPath.trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  const normalized = raw.replace(/\\/g, "/");
  if (normalized.includes("..")) return null;
  const rel = normalized.replace(/^\/+/, "");
  if (!rel || rel.includes("\0")) return null;
  return rel;
}
