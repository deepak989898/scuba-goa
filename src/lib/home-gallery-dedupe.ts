import type { HomeGalleryItem } from "@/lib/home-gallery-default";

/**
 * Normalize media URLs so the same file with different query params
 * (size, cache bust, Unsplash transforms) counts as one gallery item.
 */
export function galleryMediaDedupeKey(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname.replace(/\/+$/, "") || "/";
    // Firebase / GCS often encode the object path; decode for stable compare
    try {
      path = decodeURIComponent(path);
    } catch {
      /* keep encoded path */
    }
    return `${host}${path}`.toLowerCase();
  } catch {
    return raw.split("?")[0].split("#")[0].trim().toLowerCase();
  }
}

/** Keep first occurrence of each media file (caller should sort first). */
export function dedupeHomeGalleryItems<T extends HomeGalleryItem>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = galleryMediaDedupeKey(item.mediaUrl);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
