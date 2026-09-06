/**
 * Non-destructive content supplements appended at render time to primary hub pages.
 * Marker comments prevent duplicate sections on re-render.
 */

const MARKER_PREFIX = "<!-- seo-phase1-supplement:";

function hasMarker(body: string, id: string): boolean {
  return body.includes(`${MARKER_PREFIX}${id}-->`);
}

const SCUBA_HUB_SUPPLEMENT = `<!-- seo-phase1-supplement:scuba-hub -->

## Practical planning tips (from our team in Baga)

Before you book scuba diving in Goa, confirm these details in writing — they separate a smooth morning boat trip from a rushed beach deal:

- **Reporting time and pickup** — North Goa traffic near Baga/Calangute can add 20–40 minutes; build buffer before your boat slot.
- **What's included** — boat transfer, gear, instructor time, underwater photos/video, and GST should be listed before you pay an advance.
- **Weather policy** — reputable operators reschedule when sea state is unsafe; ask how refunds or rebooking work.
- **Medical disclosure** — share asthma, ear/sinus issues, or recent illness honestly during briefing; it protects you underwater.
- **One anchor activity per day** — avoid stacking a late-night party before an early harbour reporting time.

For prices, see our [2026 scuba diving price guide](/blog/scuba-diving-price-guide-2026). For seasonality, read [best time for scuba diving in Goa](/blog/best-time-for-scuba-diving-in-goa). For safety fundamentals, start with [is scuba diving safe in Goa](/blog/is-scuba-diving-safe).
`;

const PRICE_PILLAR_SUPPLEMENT = `<!-- seo-phase1-supplement:price-pillar -->

## Quick links

- [Scuba diving hub guide](/guides/scuba-diving-in-goa) — packages, tips, and what to expect
- [Book scuba online](/booking) — live packages with Razorpay advance
- [Scuba diving service page](/services/scuba-diving) — current starting prices
- Budget long-tail: [scuba under ₹5,000](/blog/goa-scuba-diving-price-under-5000)
`;

const SAFETY_TIPS_SUPPLEMENT = `<!-- seo-phase1-supplement:safety-tips -->

> **Full safety guide:** For a complete beginner safety overview, read [Is scuba diving safe in Goa?](/blog/is-scuba-diving-safe) before your first dive.
`;

const UNDER_5000_SUPPLEMENT = `<!-- seo-phase1-supplement:under-5000 -->

> **Full price breakdown:** For all package tiers and what moves the price, see our [scuba diving price guide 2026](/blog/scuba-diving-price-guide-2026).
`;

const GUIDE_SUPPLEMENTS: Record<string, string> = {
  "scuba-diving-in-goa": SCUBA_HUB_SUPPLEMENT,
};

const BLOG_SUPPLEMENTS: Record<string, string> = {
  "scuba-diving-price-guide-2026": PRICE_PILLAR_SUPPLEMENT,
  "scuba-diving-safety-tips-for-beginners-2": SAFETY_TIPS_SUPPLEMENT,
  "goa-scuba-diving-price-under-5000": UNDER_5000_SUPPLEMENT,
};

export function appendContentSupplement(
  slug: string,
  kind: "guide" | "blog",
  body: string,
): string {
  const trimmed = body.trim();
  const supplement =
    kind === "guide"
      ? GUIDE_SUPPLEMENTS[slug]
      : BLOG_SUPPLEMENTS[slug];
  if (!supplement) return body;
  const id = supplement.match(/seo-phase1-supplement:([\w-]+)/)?.[1];
  if (id && hasMarker(trimmed, id)) return body;
  if (!trimmed) return supplement.trim();
  return `${trimmed}\n\n${supplement.trim()}`;
}
