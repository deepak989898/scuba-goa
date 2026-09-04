import type { ServiceItem } from "@/data/services";
import type { ContentTopicId } from "@/lib/content-topic";
import { detectContentTopic } from "@/lib/content-topic";
import { classifyContent, type ContentMeta } from "@/lib/content-clusters";
import { whatsappLink } from "@/lib/constants";

export type QuickFactRow = {
  label: string;
  value: string;
  icon?: string;
};

export type EntryPriceRow = {
  package: string;
  priceFrom: number;
  includes: string;
};

export type DrinksInclusionRow = {
  included: string;
  verify: string;
};

export type ContentSeoEnhancement = {
  metaTitle?: string;
  headline?: string;
  metaDescription?: string;
  introParagraphs: string[];
  quickFacts: QuickFactRow[];
  entryPricing: EntryPriceRow[];
  drinksInclusions: DrinksInclusionRow[];
  location: {
    venueName: string;
    address: string;
    nearby: string;
    mapsSearchUrl: string;
  } | null;
  timings: string;
  bookingNote: string;
  bookingHref: string;
  serviceHref: string;
  whatsappHref: string;
  internalLinks: { label: string; href: string }[];
};

type VenueSeed = {
  match: RegExp;
  metaTitle: string;
  headline: string;
  metaDescription: string;
  venueName: string;
  address: string;
  nearby: string;
  mapsQuery: string;
  timings: string;
  dressCode: string;
  music: string;
  entertainment: string;
  bestFor: string;
};

const CLUB_RUSKII: VenueSeed = {
  match: /ruskii|ruski|club[\s-]?ruskii/i,
  metaTitle:
    "Club Ruskii Goa Review 2026: Entry Fee, Timings, Location & Booking",
  headline:
    "Club Ruskii Goa Review 2026: Entry Fee, Timings, Location & Booking",
  metaDescription:
    "Club Ruskii Goa review 2026 — entry from ₹2,000+, location on Calangute–Anjuna Road in Arpora, opening hours, drinks packages, dress code, and how to book online or on WhatsApp.",
  venueName: "Club Ruskii",
  address: "Calangute–Anjuna Road, Arpora, Goa 403509",
  nearby: "Baga, Calangute, Anjuna, Candolim",
  mapsQuery: "Club Ruskii Arpora Goa",
  timings: "Usually evening to late night — verify for your date before you go",
  dressCode: "Smart casual recommended",
  music: "DJ / international / event-based",
  entertainment: "Dance floors & Russian-themed performances",
  bestFor: "Couples, groups & nightlife lovers",
};

const VENUE_SEEDS: VenueSeed[] = [CLUB_RUSKII];

function matchVenue(slug: string, title: string): VenueSeed | null {
  const hay = `${slug} ${title}`;
  return VENUE_SEEDS.find((v) => v.match.test(hay)) ?? null;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function buildEntryPricingRows(
  service: ServiceItem | null | undefined,
): EntryPriceRow[] {
  if (!service) return [];

  const rows: EntryPriceRow[] = [];

  for (const sub of service.subServices ?? []) {
    if (sub.priceFrom == null || sub.priceFrom <= 0) continue;
    const includes =
      sub.includes?.filter(Boolean).join(", ") ||
      sub.description?.trim() ||
      "Entry + inclusions — confirm at booking";
    rows.push({
      package: sub.title,
      priceFrom: sub.priceFrom,
      includes,
    });
  }

  if (rows.length === 0 && service.priceFrom > 0) {
    rows.push({
      package: `${service.title} — entry package`,
      priceFrom: service.priceFrom,
      includes:
        service.includes.slice(0, 5).join(", ") ||
        "Entry + inclusions — confirm at booking",
    });
  }

  return rows;
}

function buildDrinksInclusions(
  service: ServiceItem | null | undefined,
  topic: ContentTopicId,
): DrinksInclusionRow[] {
  if (topic !== "nightlife" || !service) return [];

  const includes = service.includes ?? [];
  const included: string[] = [];
  const verify: string[] = [
    "Premium spirits & imported brands",
    "Premium cocktails",
    "Special-event upgrades",
  ];

  for (const item of includes) {
    const t = item.trim();
    if (!t) continue;
    if (/unlimited|beer|drink|mocktail|soft|water|hookah/i.test(t)) {
      included.push(t);
    }
  }

  if (included.length === 0) {
    included.push(
      "Beer & selected drinks (package-dependent)",
      "Water / soft drinks (where listed in your package)",
    );
  }

  return [
    {
      included: included.join(" · "),
      verify: verify.join(" · "),
    },
    {
      included: "Confirm start & end time for unlimited service",
      verify: "Food inclusions — ask before paying",
    },
  ];
}

function topicQuickFacts(
  topic: ContentTopicId,
  service: ServiceItem | null | undefined,
  venue: VenueSeed | null,
  priceFrom: number,
): QuickFactRow[] {
  if (venue) {
    return [
      { label: "Location", value: venue.address, icon: "📍" },
      { label: "Timing", value: venue.timings, icon: "🕐" },
      {
        label: "Price",
        value: priceFrom > 0 ? `From ${formatInr(priceFrom)}` : "Check live rates",
        icon: "💰",
      },
      { label: "Music", value: venue.music, icon: "🎵" },
      { label: "Entertainment", value: venue.entertainment, icon: "💃" },
      { label: "Dress code", value: venue.dressCode, icon: "👗" },
      { label: "Best for", value: venue.bestFor, icon: "👥" },
      { label: "Advance booking", value: "Recommended on busy nights", icon: "📅" },
      { label: "Booking", value: "WhatsApp / Online", icon: "📞" },
    ];
  }

  const serviceTitle = service?.title ?? "Activity";
  const base: QuickFactRow[] = [
    {
      label: "Activity",
      value: serviceTitle,
      icon: "🎯",
    },
    {
      label: "Price",
      value: priceFrom > 0 ? `From ${formatInr(priceFrom)}` : "See live rates below",
      icon: "💰",
    },
    {
      label: "Duration",
      value: service?.duration ?? "Varies by package",
      icon: "🕐",
    },
    {
      label: "Booking",
      value: "Online / WhatsApp",
      icon: "📞",
    },
  ];

  if (topic === "scuba") {
    base.unshift({
      label: "Location",
      value: "North Goa boat trips (Grande Island area)",
      icon: "📍",
    });
  }
  if (topic === "nightlife") {
    base.unshift({
      label: "Location",
      value: "North Goa nightlife hubs",
      icon: "📍",
    });
    base.push({
      label: "Best for",
      value: "Couples, groups & party nights",
      icon: "👥",
    });
  }
  if (topic === "casino") {
    base.unshift({
      label: "Location",
      value: "Casino cruise / onshore venues — confirm on booking",
      icon: "📍",
    });
  }

  return base;
}

function buildIntroParagraphs(
  venue: VenueSeed | null,
  topic: ContentTopicId,
  service: ServiceItem | null | undefined,
  title: string,
  priceFrom: number,
): string[] {
  if (venue) {
    const priceLine =
      priceFrom > 0
        ? `Starting price: ${formatInr(priceFrom)}+ per person (check today's package before booking).`
        : "Starting price: check today's package before booking.";
    return [
      `Planning to visit ${venue.venueName} in Goa? This 2026 guide covers the ${venue.venueName} Goa review, current entry price, location, opening hours, drinks and dinner packages, dress code, entertainment, and booking options.`,
      `${venue.venueName} is located on ${venue.address}, making it convenient for visitors staying around ${venue.nearby}.`,
      `Best for: travellers looking for a high-energy nightclub experience, DJs, dancing and Russian-themed entertainment.`,
      priceLine,
      "Want to reserve your night? Check the available package below and confirm what's included before paying.",
    ];
  }

  const topicIntros: Partial<Record<ContentTopicId, string[]>> = {
    nightlife: [
      `Planning a night out in Goa? This guide covers ${title}, entry prices, location context, timings, and how to book with clear inclusions.`,
      "Best for: couples, groups and travellers who want a high-energy club night with DJs and live entertainment.",
      priceFrom > 0
        ? `Packages on Book Scuba Goa start from ${formatInr(priceFrom)}+ — confirm today's rate before checkout.`
        : "Check live starting prices below before you book.",
    ],
    scuba: [
      `Planning scuba diving in Goa? This article covers ${title}, pricing, what's included, and how to book with instant confirmation.`,
      "Best for: first-time divers, couples and groups who want a clear price before paying an advance online.",
      priceFrom > 0
        ? `Scuba packages start from ${formatInr(priceFrom)} on our booking page.`
        : "See live scuba prices in the table below.",
    ],
    casino: [
      `Looking for casino options in Goa? ${title} — entry packages, timings, and how to book securely online.`,
      priceFrom > 0
        ? `Casino packages start from ${formatInr(priceFrom)}.`
        : "Check live casino package rates below.",
    ],
    watersports: [
      `${title} — compare activity prices, duration, safety inclusions, and how to book online.`,
      priceFrom > 0
        ? `Activities start from ${formatInr(priceFrom)}.`
        : "See starting prices in the table below.",
    ],
    dolphin: [
      `${title} — boat timings, pickup options, starting prices, and how to book your sea trip.`,
      priceFrom > 0
        ? `Trips start from ${formatInr(priceFrom)}.`
        : "Check live trip prices below.",
    ],
    tour: [
      `${title} — itinerary highlights, duration, starting price, and how to book your Goa tour.`,
      priceFrom > 0
        ? `Tours start from ${formatInr(priceFrom)}.`
        : "See tour starting prices below.",
    ],
  };

  return (
    topicIntros[topic] ?? [
      `${title} — prices, what's included, and how to book on Book Scuba Goa.`,
      priceFrom > 0
        ? `Starting from ${formatInr(priceFrom)}.`
        : "Check live rates before checkout.",
    ]
  );
}

function buildInternalLinks(
  topic: ContentTopicId,
  slug: string,
  focusServiceSlug?: string,
): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];

  if (topic === "nightlife") {
    if (!/ruskii|ruski/.test(slug)) {
      links.push({
        label: "Club Ruskii Goa review",
        href: "/guides/club-ruskii-reviews",
      });
    }
    links.push({
      label: "Russian Night Club packages",
      href: focusServiceSlug
        ? `/services/${focusServiceSlug}`
        : "/services/night-club",
    });
    links.push({ label: "Book nightlife online", href: "/booking" });
    links.push({ label: "All Goa guides", href: "/guides" });
  } else if (topic === "scuba") {
    links.push({ label: "Scuba diving packages", href: "/booking" });
    links.push({ label: "All scuba services", href: "/services" });
    links.push({ label: "Goa guides", href: "/guides" });
  } else {
    links.push({ label: "Book online", href: "/booking" });
    links.push({ label: "All services", href: "/services" });
    links.push({ label: "Guides", href: "/guides" });
  }

  return links.slice(0, 5);
}

export function resolveEnhancedSeoFields(input: {
  slug: string;
  title: string;
  metaTitle?: string;
  headline?: string;
  metaDescription: string;
  keywords: string[];
}): {
  metaTitle: string;
  headline: string;
  metaDescription: string;
} {
  const venue = matchVenue(input.slug, input.title);

  if (venue) {
    return {
      metaTitle: venue.metaTitle,
      headline: venue.headline,
      metaDescription: venue.metaDescription,
    };
  }

  return {
    metaTitle: input.metaTitle?.trim() || input.title,
    headline: input.headline?.trim() || input.title,
    metaDescription: input.metaDescription.trim(),
  };
}

export function buildContentSeoEnhancement(input: {
  slug: string;
  meta: ContentMeta;
  focusService?: ServiceItem | null;
  focusServiceSlug?: string;
  whatsappMessage?: string;
}): ContentSeoEnhancement | null {
  const topic = classifyContent(input.meta);
  const venue = matchVenue(input.slug, input.meta.title);
  const service = input.focusService ?? null;
  const priceFrom = service?.priceFrom ?? 0;

  const bookingHref = input.focusServiceSlug
    ? `/booking?service=${encodeURIComponent(input.focusServiceSlug)}`
    : "/booking";
  const serviceHref = input.focusServiceSlug
    ? `/services/${input.focusServiceSlug}`
    : "/services";

  const enhancement: ContentSeoEnhancement = {
    introParagraphs: buildIntroParagraphs(
      venue,
      topic,
      service,
      input.meta.title,
      priceFrom,
    ),
    quickFacts: topicQuickFacts(topic, service, venue, priceFrom),
    entryPricing: buildEntryPricingRows(service),
    drinksInclusions: buildDrinksInclusions(service, topic),
    location: venue
      ? {
          venueName: venue.venueName,
          address: venue.address,
          nearby: venue.nearby,
          mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.mapsQuery)}`,
        }
      : topic === "nightlife" && service
        ? {
            venueName: service.title,
            address: "North Goa — exact venue confirmed on booking",
            nearby: "Baga, Calangute, Anjuna, Candolim",
            mapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${service.title} Goa`)}`,
          }
        : null,
    timings: venue?.timings ?? "Check availability for your date before visiting",
    bookingNote:
      venue
        ? `Pre-book ${venue.venueName} entry on busy weekends. Pay online for instant confirmation, or WhatsApp us to confirm inclusions before payment.`
        : "Book online for instant confirmation or WhatsApp us to confirm package inclusions before paying.",
    bookingHref,
    serviceHref,
    whatsappHref: whatsappLink(
      input.whatsappMessage ??
        `Hi, I am reading "${input.meta.title}" on Book Scuba Goa. Please share today's package, price and inclusions.`,
    ),
    internalLinks: buildInternalLinks(
      topic,
      input.slug,
      input.focusServiceSlug,
    ),
  };

  const seo = resolveEnhancedSeoFields({
    slug: input.slug,
    title: input.meta.title,
    metaDescription: input.meta.description ?? "",
    keywords: input.meta.keywords,
  });
  if (seo.metaTitle !== input.meta.title) enhancement.metaTitle = seo.metaTitle;
  if (seo.headline !== input.meta.title) enhancement.headline = seo.headline;
  if (venue) enhancement.metaDescription = seo.metaDescription;

  const hasUsefulBlocks =
    venue != null ||
    topic !== "general" ||
    enhancement.entryPricing.length > 0;

  return hasUsefulBlocks ? enhancement : null;
}
