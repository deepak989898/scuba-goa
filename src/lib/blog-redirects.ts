import { SEO_CANNIBALIZATION_REDIRECTS } from "@/lib/seo-cannibalization/redirects";

/**
 * Permanent blog URL redirects (old slug → canonical slug).
 * Consumed by next.config.ts and admin tooling.
 */
export type BlogRedirect = {
  source: string;
  destination: string;
};

export const BLOG_PERMANENT_REDIRECTS: BlogRedirect[] = [
  {
    source: "/blog/scuba-diving-cost-in-goa",
    destination: "/blog/scuba-diving-price-guide-2026",
  },
  {
    source: "/blog/top-5-scuba-diving-spots-in-goa-6",
    destination: "/blog/top-5-scuba-diving-spots-in-goa",
  },
  // GSC Not found (404) — Jul 2026: old AI slug removed / renamed
  {
    source: "/blog/exploring-goas-underwater-life-a-scuba-divers-guide",
    destination: "/blog/what-to-expect-during-your-scuba-diving-experience",
  },
];

/** Extra non-blog permanent redirects used by next.config. */
export const SITE_PERMANENT_REDIRECTS: BlogRedirect[] = [
  {
    source: "/sitemap/xml",
    destination: "/sitemap.xml",
  },
  // Retired nightlife pages (404 in GSC) → live sibling
  {
    source: "/services/pubs",
    destination: "/services/night-club",
  },
  {
    source: "/services/disco",
    destination: "/services/night-club",
  },
  // GSC Not found (404) — bare numeric junk URL crawled Jul 2026
  {
    source: "/5",
    destination: "/booking",
  },
];

export function getAllPermanentRedirects(): BlogRedirect[] {
  return [
    ...BLOG_PERMANENT_REDIRECTS,
    ...SITE_PERMANENT_REDIRECTS,
    ...SEO_CANNIBALIZATION_REDIRECTS,
  ];
}

export function findPermanentRedirectDestination(
  pathname: string,
): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const hit = getAllPermanentRedirects().find((r) => r.source === normalized);
  return hit?.destination ?? null;
}

export function findBlogRedirectDestination(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const hit = BLOG_PERMANENT_REDIRECTS.find((r) => r.source === normalized);
  if (hit) return hit.destination;
  const cannibal = SEO_CANNIBALIZATION_REDIRECTS.find(
    (r) => r.source.startsWith("/blog/") && r.source === normalized,
  );
  return cannibal?.destination ?? null;
}

export function isPermanentRedirectSource(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return getAllPermanentRedirects().some((r) => r.source === normalized);
}
