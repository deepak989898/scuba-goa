import type { BlogRedirect } from "@/lib/blog-redirects";

/**
 * Phase 1 SEO cannibalization fixes — permanent 301 sources.
 * Firestore documents are NOT deleted; HTTP redirects prevent duplicate indexing.
 */
export const SEO_CANNIBALIZATION_REDIRECTS: BlogRedirect[] = [
  // 1. Russian nightlife duplicate guides
  {
    source: "/guides/russian-club-goa",
    destination: "/guides/russian-night-club-goa",
  },

  // 2. Scuba "ultimate guide" blogs → hub guide
  {
    source: "/blog/complete-guide-scuba-diving-goa",
    destination: "/guides/scuba-diving-in-goa",
  },
  {
    source: "/blog/complete-guide-to-scuba-diving-in-goa-1",
    destination: "/guides/scuba-diving-in-goa",
  },
  {
    source: "/blog/a-complete-guide-to-scuba-diving-in-goa",
    destination: "/guides/scuba-diving-in-goa",
  },

  // 3. Scuba price guides → price pillar blog
  {
    source: "/guides/scuba-diving-in-goa-price",
    destination: "/blog/scuba-diving-price-guide-2026",
  },
  {
    source: "/guides/scuba-diving-goa-price",
    destination: "/blog/scuba-diving-price-guide-2026",
  },
  {
    source: "/guides/scuba-diving-goa-price-booking",
    destination: "/blog/scuba-diving-price-guide-2026",
  },

  // 6. Baga scuba duplicate
  {
    source: "/blog/scuba-diving-booking-baga",
    destination: "/guides/scuba-diving-in-baga-goa",
  },

  // 7. Water sports duplicates
  {
    source: "/blog/exploring-goa-best-water-sports-activities",
    destination: "/guides/water-sports-goa",
  },
  {
    source: "/blog/why-goa-is-the-ultimate-destination-for-water-sports",
    destination: "/guides/water-sports-goa",
  },

  // 8. Russian nightlife blog cluster (redirects)
  {
    source: "/blog/russian-night-club-in-goa-complete-guide",
    destination: "/guides/russian-night-club-goa",
  },
  {
    source: "/blog/russian-club-goa-entry-fee",
    destination: "/guides/russian-club-goa-price",
  },
  {
    source: "/blog/russian-night-club-in-goa-price-in-grande-island",
    destination: "/guides/russian-night-club-goa",
  },
  {
    source: "/blog/discount-tire",
    destination: "/guides/russian-night-club-goa",
  },

  // 9. Majestic Pride casino consolidation
  {
    source: "/blog/season-for-majestic-pride-casino-in-goa-in-goa",
    destination: "/blog/majestic-pride-casino-in-goa-in-palolem",
  },
  {
    source: "/blog/where-to-do-majestic-pride-casino-in-goa-in-goa",
    destination: "/blog/majestic-pride-casino-in-goa-in-palolem",
  },
];

const REDIRECT_MAP = new Map(
  SEO_CANNIBALIZATION_REDIRECTS.map((r) => [r.source, r.destination]),
);

export function findCannibalizationRedirect(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return REDIRECT_MAP.get(normalized) ?? null;
}

export function isCannibalizationRedirectSource(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return REDIRECT_MAP.has(normalized);
}

export function getCannibalizationRedirectSources(): Set<string> {
  return new Set(REDIRECT_MAP.keys());
}
