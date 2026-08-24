import { blogImageVarietySeed } from "@/lib/blog-automation/blog-image-topic";

export type PexelsPhoto = {
  id: number;
  url: string;
  photographer: string;
  alt: string;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "about",
  "guide",
  "complete",
  "tips",
  "best",
  "book",
  "booking",
  "price",
  "prices",
  "2024",
  "2025",
  "2026",
  "2027",
  "goa",
  "india",
  "how",
  "what",
  "when",
  "where",
  "why",
]);

/** Topic-specific Pexels queries — title keywords checked first. */
function queriesForTopic(text: string): string[] | null {
  const t = text.toLowerCase();
  if (/casino|gambling|poker|roulette|blackjack|baccarat/.test(t)) {
    return ["casino goa", "casino interior night", "poker chips table"];
  }
  if (/night.?club|nightclub|disco\b|pub\b|nightlife|party/.test(t)) {
    return ["goa nightclub", "disco party lights", "goa nightlife beach"];
  }
  if (/dudhsagar|waterfall/.test(t)) {
    return ["dudhsagar waterfall goa", "waterfall india monsoon"];
  }
  if (/north goa|fort aguada|anjuna|vagator/.test(t)) {
    return ["north goa beach", "goa fort coastline", "goa beach sunset"];
  }
  if (/south goa|palolem|colva|benaulim/.test(t)) {
    return ["south goa beach", "palolem beach goa", "goa tropical beach"];
  }
  if (/dolphin/.test(t)) {
    return ["dolphin boat goa", "dolphins ocean india", "boat trip dolphins"];
  }
  if (/parasail|jet.?ski|banana boat|water sport|watersport/.test(t)) {
    return ["water sports goa beach", "parasailing goa", "jet ski beach"];
  }
  if (/flyboard|fly board/.test(t)) {
    return ["flyboarding water sport", "flyboard beach"];
  }
  if (/bungee/.test(t)) {
    return ["bungee jumping india", "bungee jump bridge"];
  }
  if (/island|grande island|boat trip/.test(t)) {
    return ["grande island goa boat", "goa island boat trip", "tropical island boat"];
  }
  if (/scuba|diving|underwater|snorkel/.test(t)) {
    return ["scuba diving goa", "underwater diving india", "scuba diver ocean"];
  }
  if (/trek|hiking|adventure trip/.test(t)) {
    return ["goa trekking", "india adventure travel", "jungle trek"];
  }
  if (/hotel|resort|stay/.test(t)) {
    return ["goa beach resort", "luxury hotel pool goa"];
  }
  if (/food|restaurant|seafood/.test(t)) {
    return ["goa seafood beach", "goa restaurant food"];
  }
  return null;
}

const SLUG_QUERIES: Record<string, string[]> = {
  "casino-bookings": ["casino goa", "casino games night"],
  "night-club": ["goa nightclub", "club party lights"],
  pubs: ["goa pub nightlife", "beach bar goa"],
  disco: ["disco party goa", "nightclub dance floor"],
  "scuba-diving": ["scuba diving goa", "underwater diving"],
  "water-sports": ["water sports goa beach", "parasailing goa"],
  "dolphin-trip": ["dolphin watching boat", "dolphins ocean"],
  "dudhsagar-trip": ["dudhsagar waterfall goa"],
  "north-goa-tour": ["north goa beach fort"],
  "south-goa-tour": ["south goa palolem beach"],
  flyboarding: ["flyboarding water sport"],
  "bungee-jumping": ["bungee jumping india"],
};

function queriesFromTitleWords(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  const unique = [...new Set(words)].slice(0, 4);
  if (unique.length === 0) return "goa travel tourism";
  return `${unique.join(" ")} goa india`;
}

export function buildPexelsQueries(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
}): string[] {
  const title = input.title.trim();
  const fromTitle = queriesForTopic(title);
  if (fromTitle) return fromTitle;

  const fromSlug = SLUG_QUERIES[input.serviceSlug];
  if (fromSlug) return [...fromSlug];

  const fromService = queriesForTopic(
    `${input.serviceSlug} ${input.serviceName}`.replace(/-/g, " "),
  );
  if (fromService) return fromService;

  const derived = queriesFromTitleWords(title);
  return [derived, "goa tourism beach"];
}

export async function searchPexelsPhoto(
  query: string,
  pickSeed = "",
): Promise<PexelsPhoto | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return null;

  const q = encodeURIComponent(query.slice(0, 80));
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${q}&per_page=15&orientation=landscape`,
    {
      headers: { Authorization: key },
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    photos?: Array<{
      id: number;
      alt?: string;
      photographer?: string;
      src?: { large2x?: string; large?: string; original?: string };
    }>;
  };
  const photos = data.photos ?? [];
  if (!photos.length) return null;
  const idx = blogImageVarietySeed(`${pickSeed}:${query}`) % photos.length;
  const photo = photos[idx] ?? photos[0];
  if (!photo?.src) return null;
  const url =
    photo.src.large2x ?? photo.src.large ?? photo.src.original ?? "";
  if (!url) return null;
  return {
    id: photo.id,
    url,
    photographer: photo.photographer ?? "Pexels",
    alt: photo.alt ?? query,
  };
}

/** Try multiple queries until a relevant photo is found. */
export async function searchPexelsPhotoForPost(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
}): Promise<PexelsPhoto | null> {
  const queries = buildPexelsQueries(input);
  for (const query of queries) {
    const photo = await searchPexelsPhoto(query, `${input.title}:${input.serviceSlug}`);
    if (photo) return { ...photo, alt: `${input.title} (${query})` };
  }
  return null;
}
