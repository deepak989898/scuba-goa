import type { ServiceItem } from "@/data/services";
import {
  cmsImageOrPlaceholder,
  sanitizePublicImageUrl,
} from "@/lib/cms-image";

/** Ordered list for the detail hero: primary image first, then extras (deduped). */
export function serviceDetailImages(s: ServiceItem): string[] {
  const main = sanitizePublicImageUrl(s.image);
  const extras =
    s.galleryUrls
      ?.map((u) => sanitizePublicImageUrl(u))
      .filter((u) => u.length > 0) ?? [];
  const out: string[] = [];
  if (main) out.push(main);
  for (const u of extras) {
    if (!out.includes(u)) out.push(u);
  }
  return out.length ? out : [cmsImageOrPlaceholder()];
}
