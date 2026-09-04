import type { ContentTopicId } from "@/lib/content-topic";
import { detectContentTopic } from "@/lib/content-topic";

export type { ContentTopicId };

export type ClusterContentKind = "guide" | "blog";

export type ClusterContentItem = {
  kind: ClusterContentKind;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  imageUrl?: string;
  updatedAt?: string;
  href: string;
  topic: ContentTopicId;
  /** True when hero image is AI-generated or admin-uploaded (not free stock). */
  editorialImage?: boolean;
};

export type ContentMeta = {
  title: string;
  keywords: string[];
  slug?: string;
  description?: string;
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter((t) => t.length >= 3),
  );
}

export function classifyContent(meta: ContentMeta): ContentTopicId {
  return detectContentTopic({
    title: meta.title,
    keywords: meta.keywords,
  });
}

/** +50 same cluster, shared keyword tokens, slug overlap. */
export function scoreClusterRelevance(
  current: ContentMeta & { topic?: ContentTopicId },
  candidate: ClusterContentItem,
): number {
  const currentTopic =
    current.topic ?? classifyContent(current);
  let score = 0;

  if (candidate.topic === currentTopic) score += 50;

  const a = tokenize(
    `${current.title} ${current.description ?? ""} ${current.keywords.join(" ")} ${current.slug ?? ""}`,
  );
  const b = tokenize(
    `${candidate.title} ${candidate.description} ${candidate.keywords.join(" ")} ${candidate.slug}`,
  );

  for (const t of a) {
    if (b.has(t)) score += 2;
  }

  if (current.slug && candidate.slug) {
    const curParts = current.slug.split("-").filter((p) => p.length >= 4);
    for (const part of curParts) {
      if (candidate.slug.includes(part) || candidate.title.toLowerCase().includes(part)) {
        score += 3;
      }
    }
  }

  if (currentTopic === "nightlife") {
    if (/russian|night|club|pub|disco|ruskii|ruski/.test(candidate.slug)) score += 8;
    if (/scuba|diving|dolphin/.test(candidate.slug)) score -= 30;
  }
  if (currentTopic === "scuba") {
    if (/scuba|diving|snorkel|island/.test(candidate.slug)) score += 8;
    if (/night|club|casino/.test(candidate.slug)) score -= 25;
  }
  if (currentTopic === "casino") {
    if (/casino/.test(candidate.slug)) score += 10;
    if (/scuba|night|dolphin/.test(candidate.slug)) score -= 25;
  }
  if (currentTopic === "watersports") {
    if (/water|flyboard|bungee|parasail|jet/.test(candidate.slug)) score += 8;
  }
  if (currentTopic === "dolphin" || currentTopic === "tour") {
    if (/dolphin|island|goa-tour|dudhsagar/.test(candidate.slug)) score += 8;
  }

  return score;
}

export function pickClusterRelated(
  current: ContentMeta & { slug: string; kind: ClusterContentKind },
  catalog: ClusterContentItem[],
  limit = 2,
): ClusterContentItem[] {
  const currentTopic = classifyContent(current);
  const scored = catalog
    .filter(
      (item) =>
        !(item.kind === current.kind && item.slug === current.slug) &&
        item.editorialImage === true,
    )
    .map((item) => ({
      item,
      score: scoreClusterRelevance({ ...current, topic: currentTopic }, item),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.item.updatedAt ?? "").localeCompare(a.item.updatedAt ?? ""),
    );

  const picked: ClusterContentItem[] = [];
  const seen = new Set<string>();
  for (const row of scored) {
    if (picked.length >= limit) break;
    const key = `${row.item.kind}:${row.item.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(row.item);
  }

  if (picked.length < limit) {
    for (const row of scored) {
      if (picked.length >= limit) break;
      const key = `${row.item.kind}:${row.item.slug}`;
      if (seen.has(key)) continue;
      if (row.item.topic !== currentTopic) continue;
      seen.add(key);
      picked.push(row.item);
    }
  }

  return picked;
}

export function getMoreLikeThisHeading(topic: ContentTopicId): string {
  const map: Record<ContentTopicId, string> = {
    nightlife: "Explore More Russian Nightlife in Goa",
    scuba: "Explore More Scuba Diving Guides",
    casino: "Explore More Casino Experiences in Goa",
    watersports: "Explore More Water Sports in Goa",
    dolphin: "Explore More Dolphin & Sea Trips in Goa",
    tour: "Explore More Goa Tours & Activities",
    general: "Explore More Goa Guides & Articles",
  };
  return map[topic];
}

export function getMoreLikeThisSubheading(topic: ContentTopicId): string {
  const map: Record<ContentTopicId, string> = {
    nightlife:
      "More nightlife guides and articles — compare clubs, pubs, and entry packages.",
    scuba:
      "More scuba guides — prices, beginner tips, packages, and best dive spots.",
    casino:
      "More casino guides — cruises, entry prices, and booking tips.",
    watersports:
      "More adventure guides — parasailing, jet ski, flyboarding, and combos.",
    dolphin:
      "More sea trip guides — dolphin watching, island tours, and boat trips.",
    tour:
      "More sightseeing guides — North Goa, South Goa, Dudhsagar, and tours.",
    general:
      "More guides and articles to plan your Goa trip before booking.",
  };
  return map[topic];
}

export type TopicCtaCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  whatsappMessage: string;
};

export function getTopicCta(
  meta: ContentMeta,
  focusServiceSlug?: string,
): TopicCtaCopy {
  const topic = classifyContent(meta);
  const serviceHref = focusServiceSlug
    ? `/services/${focusServiceSlug}`
    : "/services";

  const bookingHref = focusServiceSlug
    ? `/booking?service=${encodeURIComponent(focusServiceSlug)}`
    : "/booking";

  const base: Record<ContentTopicId, Omit<TopicCtaCopy, "primaryHref" | "secondaryHref">> = {
    nightlife: {
      eyebrow: "Plan your night out",
      title: "Check tonight's nightlife options",
      description:
        "Compare Russian club entry, guest lists, and packages. Message us for today's events and availability.",
      primaryLabel: "Explore nightlife packages",
      secondaryLabel: "WhatsApp for tonight's events",
      whatsappMessage:
        "Hi, I am reading your Russian nightlife guide. Please share tonight's club options and entry prices.",
    },
    casino: {
      eyebrow: "Ready to play?",
      title: "Check casino cruise availability",
      description:
        "View casino packages, entry inclusions, and boarding times before you book.",
      primaryLabel: "View casino packages",
      secondaryLabel: "Ask about casino slots",
      whatsappMessage:
        "Hi, I want to book a casino cruise in Goa. Please share today's packages and boarding time.",
    },
    scuba: {
      eyebrow: "Ready to dive?",
      title: "Check scuba prices & packages",
      description:
        "See live scuba starting prices, inclusions, and morning boat slots before you book.",
      primaryLabel: "View scuba packages",
      secondaryLabel: "Contact for dive slots",
      whatsappMessage:
        "Hi, I want to book scuba diving in Goa. Please share available dates and package prices.",
    },
    watersports: {
      eyebrow: "Adventure day",
      title: "View water sports packages",
      description:
        "Compare parasailing, jet ski, flyboarding, and combo prices with clear inclusions.",
      primaryLabel: "Check water sports prices",
      secondaryLabel: "WhatsApp for activity slots",
      whatsappMessage:
        "Hi, I am interested in water sports in Goa. Please share packages and today's availability.",
    },
    dolphin: {
      eyebrow: "Sea morning trip",
      title: "Book a dolphin trip",
      description:
        "Check sunrise boat slots, pickup options, and starting prices for dolphin watching.",
      primaryLabel: "View dolphin trip prices",
      secondaryLabel: "Ask about morning slots",
      whatsappMessage:
        "Hi, I want to book a dolphin trip in Goa. Please share tomorrow's slots and price.",
    },
    tour: {
      eyebrow: "Explore Goa",
      title: "Browse Goa tour packages",
      description:
        "Compare North Goa, South Goa, Dudhsagar, and sightseeing tours with live starting prices.",
      primaryLabel: "View tour packages",
      secondaryLabel: "Plan my itinerary",
      whatsappMessage:
        "Hi, I am planning Goa sightseeing. Please suggest tour packages and prices.",
    },
    general: {
      eyebrow: "Ready to plan?",
      title: "Book your Goa experience",
      description:
        "Check available packages, current prices, and booking options before you choose.",
      primaryLabel: "Book now",
      secondaryLabel: "Browse all activities",
      whatsappMessage:
        "Hi, I am planning activities in Goa. Please help me choose packages and prices.",
    },
  };

  const copy = base[topic];
  return {
    ...copy,
    primaryHref: topic === "general" ? bookingHref : serviceHref,
    secondaryHref: "/contact",
  };
}
