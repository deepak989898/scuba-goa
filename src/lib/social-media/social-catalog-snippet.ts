import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import {
  CONTACT_PHONE_LABEL,
  OFFICE_ADDRESS_LINES,
  SITE_URL,
} from "@/lib/constants";
import type { ServiceItem } from "@/data/services";
import type { PackageDoc } from "@/lib/types";
import type { SocialContentPayload } from "@/lib/social-media/types";

export type SocialPriceLine = {
  label: string;
  price: string;
  kind: "package" | "service";
};

export type SocialCatalogSnippet = {
  theme: string;
  priceLines: SocialPriceLine[];
  locationLine: string;
  bookingUrl: string;
  phoneLabel: string;
  trustLine: string;
  /** Compact block for AI prompt */
  contextBlock: string;
};

const THEME_KEYWORDS: Record<string, string[]> = {
  scuba: ["scuba", "diving", "underwater", "snorkel", "island", "grande"],
  nightlife: ["club", "night", "party", "pub", "bar", "ruskii", "tito"],
  casino: ["casino", "poker", "cruise", "deltin", "majestic", "big daddy"],
  hotel: ["hotel", "resort", "stay", "hostel", "homestay", "villa"],
  beach: ["beach", "baga", "calangute", "anjuna", "vagator", "arambol"],
  adventure: [
    "adventure",
    "parasail",
    "jet",
    "banana",
    "bungee",
    "yacht",
    "boat",
    "watersport",
  ],
  general: ["goa", "trip", "tour", "travel", "package"],
};

function detectThemeKey(payload: SocialContentPayload): string {
  if (payload.contentType === "reel") return "nightlife";
  if (payload.contentType === "video") return "scuba";
  const blob = `${payload.title} ${payload.slug} ${payload.excerpt}`.toLowerCase();
  for (const [theme, words] of Object.entries(THEME_KEYWORDS)) {
    if (theme === "general") continue;
    if (words.some((w) => blob.includes(w))) return theme;
  }
  return "general";
}

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const k of keywords) {
    if (lower.includes(k)) score += 2;
  }
  return score;
}

function pickRelevantPrices(
  services: ServiceItem[],
  packages: PackageDoc[],
  keywords: string[],
  limit = 3,
): SocialPriceLine[] {
  const scored: { line: SocialPriceLine; score: number }[] = [];

  for (const s of services.filter((x) => x.priceFrom > 0 && x.active !== false)) {
    const label = s.title.trim();
    scored.push({
      line: { label, price: `from ₹${s.priceFrom}`, kind: "service" },
      score: scoreText(`${label} ${s.slug} ${s.short}`, keywords) + (s.mostBooked ? 1 : 0),
    });
    for (const sub of s.subServices ?? []) {
      if (!sub.priceFrom || sub.priceFrom <= 0) continue;
      scored.push({
        line: { label: sub.title.trim(), price: `from ₹${sub.priceFrom}`, kind: "service" },
        score: scoreText(sub.title, keywords),
      });
    }
  }

  for (const p of packages.filter((x) => x.price > 0 && x.active !== false)) {
    const label = p.name.trim();
    scored.push({
      line: { label, price: `₹${p.price}`, kind: "package" },
      score: scoreText(`${label} ${p.category ?? ""}`, keywords) + (p.isCombo ? 0.5 : 0),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: SocialPriceLine[] = [];
  for (const { line } of scored) {
    const key = line.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= limit) break;
  }

  if (out.length < 2) {
    for (const p of packages.filter((x) => x.price > 0).slice(0, 3)) {
      const key = p.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: p.name, price: `₹${p.price}`, kind: "package" });
      if (out.length >= limit) break;
    }
  }

  return out.slice(0, limit);
}

function formatPriceBullets(lines: SocialPriceLine[], style: "short" | "emoji"): string {
  if (!lines.length) return "";
  if (style === "short") {
    return lines.map((l) => `• ${l.label} — ${l.price}`).join("\n");
  }
  return lines.map((l) => `💰 ${l.label} — ${l.price}`).join("\n");
}

export function buildSnippetContextBlock(snippet: SocialCatalogSnippet): string {
  const prices = snippet.priceLines
    .map((l) => `- ${l.label}: ${l.price}`)
    .join("\n");
  return `LOCATION: ${snippet.locationLine}
PHONE: ${snippet.phoneLabel}
BOOKING: ${snippet.bookingUrl}
TRUST: ${snippet.trustLine}

RELEVANT PRICES (use ONLY these exact amounts, max 3 in post):
${prices || "(use catalog — no prices loaded)"}`;
}

export async function buildSocialCatalogSnippet(
  payload: SocialContentPayload,
): Promise<SocialCatalogSnippet> {
  const site = SITE_URL.replace(/\/$/, "");
  const theme = detectThemeKey(payload);
  const keywords = [
    ...THEME_KEYWORDS[theme],
    ...payload.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
    ...payload.slug.split("-").filter((w) => w.length > 2),
  ];

  let priceLines: SocialPriceLine[] = [];
  try {
    const catalog = await buildBlogCatalogContext();
    priceLines = pickRelevantPrices(catalog.services, catalog.packages, keywords, 3);
  } catch {
    priceLines = [];
  }

  const locationLine = `📍 Baga, North Goa (${OFFICE_ADDRESS_LINES[1]})`;
  const bookingUrl = `${site}/booking`;
  const phoneLabel = CONTACT_PHONE_LABEL;
  const trustLine = "Hotel pickup • Certified instructors • Instant online booking";

  const snippet: SocialCatalogSnippet = {
    theme,
    priceLines,
    locationLine,
    bookingUrl,
    phoneLabel,
    trustLine,
    contextBlock: "",
  };
  snippet.contextBlock = buildSnippetContextBlock(snippet);
  return snippet;
}

export function formatSocialValueBlock(
  snippet: SocialCatalogSnippet,
  platform: "facebook" | "instagram" | "googleBusiness" | "youtube",
): string {
  const prices = formatPriceBullets(
    snippet.priceLines,
    platform === "googleBusiness" ? "short" : "emoji",
  );

  if (platform === "facebook") {
    return [
      prices,
      snippet.locationLine,
      `📞 ${snippet.phoneLabel} | Book: ${snippet.bookingUrl}`,
      `✅ ${snippet.trustLine}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (platform === "instagram") {
    return [
      prices,
      snippet.locationLine,
      `📞 Call/WhatsApp: ${snippet.phoneLabel}`,
      `🎫 Book: ${snippet.bookingUrl}`,
      `✅ ${snippet.trustLine}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (platform === "googleBusiness") {
    return [
      prices,
      `Location: Baga, Calangute, North Goa`,
      `Call ${snippet.phoneLabel} or book online: ${snippet.bookingUrl}`,
      snippet.trustLine,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    prices,
    snippet.locationLine,
    `📞 ${snippet.phoneLabel} | ${snippet.bookingUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
