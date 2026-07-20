import type { ServiceItem } from "@/data/services";

const SCUBA_PRIORITY = [
  "scuba-diving",
  "scuba-diving-with-island-trip",
  "island-trip",
  "grande-island",
  "water-sports",
];

function priorityBoost(slug: string): number {
  const idx = SCUBA_PRIORITY.findIndex(
    (s) => slug === s || slug.includes(s) || s.includes(slug),
  );
  if (idx < 0) return 0;
  return (SCUBA_PRIORITY.length - idx) * 8;
}

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
  const scubaTopic =
    tokens.has("scuba") ||
    tokens.has("diving") ||
    tokens.has("dive") ||
    (focusSlug?.includes("scuba") ?? false);

  return [...services]
    .map((service) => {
      const text = `${service.slug} ${service.title} ${service.short}`.toLowerCase();
      let score = service.slug === focusSlug ? 100 : 0;
      for (const token of tokens) {
        if (text.includes(token)) score += 1;
      }
      if (scubaTopic) {
        score += priorityBoost(service.slug);
        // Deprioritize nightlife / club pages inside scuba guides
        if (
          text.includes("night") ||
          text.includes("club") ||
          text.includes("casino") ||
          text.includes("party")
        ) {
          score -= 20;
        }
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
