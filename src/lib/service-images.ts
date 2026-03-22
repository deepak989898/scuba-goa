import type { ServiceItem } from "@/data/services";

/** Ordered list for the detail hero: primary image first, then extras (deduped). */
export function serviceDetailImages(s: ServiceItem): string[] {
  const main = s.image?.trim();
  const extras =
    s.galleryUrls
      ?.map((u) => String(u).trim())
      .filter((u) => u.length > 0) ?? [];
  const out: string[] = [];
  if (main) out.push(main);
  for (const u of extras) {
    if (!out.includes(u)) out.push(u);
  }
  return out.length ? out : [""];
}
