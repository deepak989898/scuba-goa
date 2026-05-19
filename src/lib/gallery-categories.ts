/** Categories for `/gallery` filter chips and admin labels. */
export const GALLERY_CATEGORIES = [
  { id: "underwater", label: "Underwater gallery" },
  { id: "customer-videos", label: "Customer videos" },
  { id: "reels", label: "Reels" },
  { id: "packages", label: "Package images" },
  { id: "pricing", label: "Pricing" },
  { id: "blog", label: "Blog photos" },
] as const;

export type GalleryCategoryId = (typeof GALLERY_CATEGORIES)[number]["id"];

const CATEGORY_IDS = new Set<string>(GALLERY_CATEGORIES.map((c) => c.id));

export function isGalleryCategoryId(value: string): value is GalleryCategoryId {
  return CATEGORY_IDS.has(value);
}

export function normalizeGalleryCategory(
  raw: unknown,
): GalleryCategoryId | undefined {
  const s = String(raw ?? "").trim().toLowerCase();
  return isGalleryCategoryId(s) ? s : undefined;
}

export function galleryCategoryLabel(id: GalleryCategoryId): string {
  return GALLERY_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Map blog service slug to a gallery category when auto-syncing blog images. */
export function inferGalleryCategoryFromBlog(serviceSlug: string): GalleryCategoryId {
  const s = serviceSlug.toLowerCase();
  if (/scuba|dive|underwater|snorkel|freedive|sea\b|ocean/.test(s)) return "underwater";
  if (/package|combo|trip|tour|bundle/.test(s)) return "packages";
  if (/price|pricing|cost|fee|rate/.test(s)) return "pricing";
  if (/reel|short/.test(s)) return "reels";
  if (/video|customer/.test(s)) return "customer-videos";
  return "blog";
}
