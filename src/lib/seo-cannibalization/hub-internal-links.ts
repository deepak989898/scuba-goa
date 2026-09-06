/**
 * Curated internal links for SEO hub pages (Phase 1).
 * Merged into content-seo-enhancements buildInternalLinks — natural anchor variety.
 */

export type HubLink = { label: string; href: string };

const GUIDE_HUB_LINKS: Record<string, HubLink[]> = {
  "scuba-diving-in-goa": [
    { label: "Scuba packages & live prices", href: "/services/scuba-diving" },
    { label: "2026 scuba price guide", href: "/blog/scuba-diving-price-guide-2026" },
    { label: "Best time to dive in Goa", href: "/blog/best-time-for-scuba-diving-in-goa" },
    { label: "Is scuba diving safe?", href: "/blog/is-scuba-diving-safe" },
    { label: "Top dive sites in Goa", href: "/blog/top-5-scuba-diving-spots-in-goa" },
    { label: "Scuba diving in Baga", href: "/guides/scuba-diving-in-baga-goa" },
  ],
  "russian-night-club-goa": [
    { label: "Club Ruskii review", href: "/guides/club-ruskii-reviews" },
    { label: "Russian club entry prices", href: "/guides/russian-club-goa-price" },
    { label: "Book nightlife packages", href: "/services/night-club" },
    { label: "Pay advance online", href: "/booking" },
  ],
  "water-sports-goa": [
    { label: "Water sports packages", href: "/services/water-sports" },
    { label: "Budget water sports tips", href: "/blog/cheap-water-sports-goa" },
  ],
  "russian-club-goa-price": [
    { label: "Russian nightlife hub", href: "/guides/russian-night-club-goa" },
    { label: "Club Ruskii review", href: "/guides/club-ruskii-reviews" },
    { label: "Book nightclub entry", href: "/services/night-club" },
  ],
  "scuba-diving-in-baga-goa": [
    { label: "Main scuba diving guide", href: "/guides/scuba-diving-in-goa" },
    { label: "Book scuba from Baga", href: "/booking" },
    { label: "Scuba service page", href: "/services/scuba-diving" },
  ],
};

const BLOG_HUB_LINKS: Record<string, HubLink[]> = {
  "scuba-diving-price-guide-2026": [
    { label: "Scuba diving guide", href: "/guides/scuba-diving-in-goa" },
    { label: "Book online", href: "/booking" },
    { label: "Scuba packages", href: "/services/scuba-diving" },
  ],
};

export function getHubInternalLinks(
  slug: string,
  kind: "guide" | "blog",
): HubLink[] {
  if (kind === "guide") return GUIDE_HUB_LINKS[slug] ?? [];
  return BLOG_HUB_LINKS[slug] ?? [];
}

export function mergeHubLinks(
  slug: string,
  kind: "guide" | "blog",
  existing: HubLink[],
  max = 6,
): HubLink[] {
  const hub = getHubInternalLinks(slug, kind);
  if (hub.length === 0) return existing.slice(0, max);
  const seen = new Set<string>();
  const out: HubLink[] = [];
  for (const link of [...hub, ...existing]) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    out.push(link);
    if (out.length >= max) break;
  }
  return out;
}
