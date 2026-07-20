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
];

/** Extra non-blog permanent redirects used by next.config. */
export const SITE_PERMANENT_REDIRECTS: BlogRedirect[] = [
  {
    source: "/sitemap/xml",
    destination: "/sitemap.xml",
  },
];

export function getAllPermanentRedirects(): BlogRedirect[] {
  return [...BLOG_PERMANENT_REDIRECTS, ...SITE_PERMANENT_REDIRECTS];
}

export function findBlogRedirectDestination(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const hit = BLOG_PERMANENT_REDIRECTS.find((r) => r.source === normalized);
  return hit?.destination ?? null;
}
