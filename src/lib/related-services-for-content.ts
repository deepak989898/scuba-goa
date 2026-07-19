import type { ServiceItem } from "@/data/services";

/** Score catalog services against page title/keywords for sidebar cards. */
export function relatedServicesForContent(
  services: ServiceItem[],
  content: { title: string; keywords: string[] },
  focusSlug?: string,
  limit = 4,
): ServiceItem[] {
  const tokens = new Set(
    `${content.title} ${content.keywords.join(" ")}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
  return [...services]
    .map((service) => {
      const text = `${service.slug} ${service.title} ${service.short}`.toLowerCase();
      let score = service.slug === focusSlug ? 100 : 0;
      for (const token of tokens) {
        if (text.includes(token)) score += 1;
      }
      return { service, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.service.sortOrder ?? 999) - (b.service.sortOrder ?? 999),
    )
    .slice(0, limit)
    .map(({ service }) => service);
}
