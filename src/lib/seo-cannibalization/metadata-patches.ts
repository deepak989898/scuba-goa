/**
 * Render-time SEO metadata patches for Phase 1 intent separation.
 * Does not modify Firestore — applied in resolveEnhancedSeoFields and blog/guide pages.
 */

export type SeoMetadataPatch = {
  metaTitle?: string;
  headline?: string;
  metaDescription?: string;
};

/** Guide slugs (`/guides/[slug]`) */
const GUIDE_PATCHES: Record<string, SeoMetadataPatch> = {
  "best-scuba-diving-goa": {
    metaTitle:
      "Beginner Scuba Diving in Goa: What First-Time Divers Should Know | Book Scuba Goa",
    headline: "Beginner Scuba Diving in Goa: What First-Time Divers Should Know",
    metaDescription:
      "First-time scuba in Goa: what beginners should expect, how to prepare, typical packages, and how to book with clear pricing from Baga.",
  },
  "russian-night-club-goa": {
    metaTitle:
      "Russian Night Club Goa 2026: Nightlife Guide & Booking | Book Scuba Goa",
    headline: "Russian Night Club Goa: Nightlife Guide & How to Book",
    metaDescription:
      "Plan Russian nightlife in Goa — clubs, entry packages, areas near Baga & Calangute, and how to book guest list or table packages online.",
  },
};

/** Blog slugs (`/blog/[slug]`) */
const BLOG_PATCHES: Record<string, SeoMetadataPatch> = {
  "best-scuba-diving-in-goa": {
    metaTitle:
      "How to Choose the Best Scuba Diving in Goa (Operators & Packages) | Book Scuba Goa",
    headline: "How to Choose the Best Scuba Diving Experience in Goa",
    metaDescription:
      "Compare scuba operators in Goa: safety briefings, inclusions, boat transfers, photos, and fair pricing — before you pay an advance online.",
  },
  "scuba-diving-safety-tips-for-beginners-2": {
    metaTitle:
      "Scuba Diving Safety Tips for Beginners in Goa (Checklist) | Book Scuba Goa",
    headline: "Scuba Diving Safety Tips for Beginners in Goa (Checklist)",
    metaDescription:
      "A practical beginner checklist for scuba in Goa — equalizing, briefing, gear checks, and what to ask before you book. See also our full safety guide.",
  },
  "goa-scuba-diving-price-under-5000": {
    metaTitle:
      "Scuba Diving in Goa Under ₹5,000: What's Included | Book Scuba Goa",
    headline: "Scuba Diving in Goa Under ₹5,000: What You Actually Get",
    metaDescription:
      "Budget scuba packages in Goa under ₹5,000 — what's usually included, common exclusions, and when to upgrade. Full 2026 price guide linked inside.",
  },
  "russian-night-club-in-goa-goa-same-day-booking": {
    metaTitle:
      "Russian Night Club Goa: Same-Day Entry & Booking | Book Scuba Goa",
    headline: "Russian Night Club Goa: Same-Day Booking Guide",
    metaDescription:
      "Need a Russian nightclub in Goa tonight? How same-day entry, guest lists, and WhatsApp confirmation work — with links to live packages.",
  },
  "russian-night-club-in-goa-in-goa-with-hotel-pickup": {
    metaTitle:
      "Russian Night Club Goa with Hotel Pickup | Book Scuba Goa",
    headline: "Russian Night Club Goa: Hotel Pickup & Entry Packages",
    metaDescription:
      "Club packages with hotel pickup in North Goa — what's included, pickup zones near Baga/Calangute, and how to confirm your slot before payment.",
  },
  "russian-night-club-near-baga-calangute-itinerary-cost-honest-review": {
    metaTitle:
      "Russian Night Club Near Baga & Calangute: Itinerary & Costs | Book Scuba Goa",
    headline:
      "Russian Night Club Near Baga & Calangute: Itinerary, Costs & Review",
    metaDescription:
      "Honest evening plan for Russian nightlife near Baga and Calangute — typical costs, timing, transport, and booking tips for groups and couples.",
  },
  "best-russian-night-club-in-goa-package-vs-cheap-option-goa": {
    metaTitle:
      "Russian Night Club Goa: Premium vs Budget Packages Compared | Book Scuba Goa",
    headline: "Russian Night Club Goa: Premium vs Budget Packages",
    metaDescription:
      "Compare premium and budget Russian nightclub packages in Goa — drinks, entry, table service, and what is worth paying extra for.",
  },
  "nightlife-in-baga": {
    metaTitle:
      "Nightlife in Baga Goa 2026: Clubs, Bars & Planning Tips | Book Scuba Goa",
    headline: "Nightlife in Baga Goa: Clubs, Bars & Planning Tips",
    metaDescription:
      "Plan a night out in Baga — popular areas, transport after midnight, and how to pair beach-day activities with a safe nightlife evening.",
  },
  "rusian-beach-club-disco-calangute": {
    metaTitle:
      "Russian Beach Club Disco Calangute: Entry & Night Out Guide | Book Scuba Goa",
    headline: "Russian Beach Club Disco Calangute: Entry & Night Out Guide",
    metaDescription:
      "Calangute Russian beach club / disco — entry expectations, dress code, timing, and how to book packages without last-minute surprises.",
  },
  "majestic-pride-casino-in-goa-in-palolem": {
    metaTitle:
      "Majestic Pride Casino Goa: Location, Season & Visitor Guide | Book Scuba Goa",
    headline: "Majestic Pride Casino Goa: Location, Season & Visitor Guide",
    metaDescription:
      "Majestic Pride Casino in Goa — where it operates, best season to visit, entry basics, and how to book casino packages with clear inclusions.",
  },
  "scuba-diving-price-guide-2026": {
    metaTitle:
      "Scuba Diving Price Guide 2026 (Goa Rates & Fees) | Book Scuba Goa",
    headline: "Scuba Diving Price Guide 2026 for Goa",
    metaDescription:
      "Scuba diving price Goa (2026): package ranges, what drives rates, fair inclusions, and how to book online with Razorpay from Baga.",
  },
};

export function getGuideMetadataPatch(slug: string): SeoMetadataPatch | null {
  return GUIDE_PATCHES[slug] ?? null;
}

export function getBlogMetadataPatch(slug: string): SeoMetadataPatch | null {
  return BLOG_PATCHES[slug] ?? null;
}

export function applySeoMetadataPatch(
  slug: string,
  kind: "guide" | "blog",
  fields: {
    metaTitle: string;
    headline: string;
    metaDescription: string;
  },
): { metaTitle: string; headline: string; metaDescription: string } {
  const patch =
    kind === "guide"
      ? getGuideMetadataPatch(slug)
      : getBlogMetadataPatch(slug);
  if (!patch) return fields;
  return {
    metaTitle: patch.metaTitle ?? fields.metaTitle,
    headline: patch.headline ?? fields.headline,
    metaDescription: patch.metaDescription ?? fields.metaDescription,
  };
}
