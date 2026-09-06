import { SITE_URL } from "@/lib/constants";
import type { SocialContentPayload, SocialPlatform } from "@/lib/social-media/types";
import {
  buildSocialCatalogSnippet,
  formatSocialValueBlock,
  type SocialCatalogSnippet,
} from "@/lib/social-media/social-catalog-snippet";

export type PlatformCaptions = Record<SocialPlatform, string>;

type ContentTheme =
  | "scuba"
  | "nightlife"
  | "casino"
  | "hotel"
  | "beach"
  | "adventure"
  | "general";

const BRAND = "Book Scuba Goa";

const THEME_HASHTAGS: Record<ContentTheme, string[]> = {
  scuba: [
    "#ScubaDiving",
    "#ScubaGoa",
    "#GoaScuba",
    "#Underwater",
    "#AdventureGoa",
    "#WaterSports",
    "#BagaBeach",
    "#NorthGoa",
    "#GoaTrip",
    "#TravelGoa",
  ],
  nightlife: [
    "#GoaNightlife",
    "#ClubGoa",
    "#PartyInGoa",
    "#GoaParties",
    "#NightlifeGoa",
    "#GoaVibes",
    "#TravelGoa",
    "#GoaTrip",
    "#WeekendVibes",
    "#IncredibleIndia",
  ],
  casino: [
    "#GoaCasino",
    "#CasinoGoa",
    "#GoaNightlife",
    "#TravelGoa",
    "#GoaTrip",
    "#LuxuryGoa",
    "#HolidayGoa",
    "#IncredibleIndia",
  ],
  hotel: [
    "#GoaHotels",
    "#GoaStay",
    "#TravelGoa",
    "#GoaTrip",
    "#BeachHoliday",
    "#NorthGoa",
    "#GoaTourism",
    "#VacationGoa",
  ],
  beach: [
    "#GoaBeaches",
    "#BeachGoa",
    "#BagaBeach",
    "#NorthGoa",
    "#GoaTrip",
    "#TravelGoa",
    "#SunsetGoa",
    "#GoaDiaries",
  ],
  adventure: [
    "#AdventureGoa",
    "#GoaAdventure",
    "#WaterSports",
    "#TravelGoa",
    "#GoaTrip",
    "#ThrillGoa",
    "#ExploreGoa",
    "#IncredibleIndia",
  ],
  general: [
    "#Goa",
    "#GoaTourism",
    "#TravelGoa",
    "#GoaTrip",
    "#VisitGoa",
    "#GoaDiaries",
    "#IncredibleIndia",
    "#HolidayGoa",
    "#ExploreGoa",
    "#GoaVibes",
  ],
};

const EXTRA_IG_HASHTAGS = [
  "#ReelsGoa",
  "#Wanderlust",
  "#TravelReels",
  "#IndiaTravel",
  "#BeachLife",
  "#TravelGram",
  "#Goa2026",
  "#TripToGoa",
  "#GoaGuide",
  "#BookScubaGoa",
];

function detectTheme(payload: SocialContentPayload): ContentTheme {
  if (payload.contentType === "reel") return "nightlife";
  if (payload.contentType === "video") return "scuba";
  const blob = `${payload.title} ${payload.slug} ${payload.excerpt}`.toLowerCase();
  if (/scuba|diving|underwater|snorkel/.test(blob)) return "scuba";
  if (/club|nightlife|party|ruskii|tito|mambo|pub/.test(blob)) return "nightlife";
  if (/casino|cruise|poker|deltin|majestic/.test(blob)) return "casino";
  if (/hotel|resort|stay|hostel|homestay/.test(blob)) return "hotel";
  if (/beach|calangute|baga|anjuna|vagator|arambol/.test(blob)) return "beach";
  if (/adventure|parasail|jet\s*ski|banana|watersport/.test(blob)) return "adventure";
  return "general";
}

function uniqueHashtags(tags: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const t = tag.startsWith("#") ? tag : `#${tag}`;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

function excerptLine(payload: SocialContentPayload, max = 180): string {
  const e = payload.excerpt.trim().replace(/\s+/g, " ");
  if (!e) return "";
  return e.length <= max ? e : `${e.slice(0, max - 1)}…`;
}

function buildFallbackCaptions(
  payload: SocialContentPayload,
  snippet: SocialCatalogSnippet,
): PlatformCaptions {
  const theme = detectTheme(payload);
  const hook = payload.title.trim();
  const detail = excerptLine(payload, 120);
  const url = payload.url.trim();
  const fbTags = uniqueHashtags(THEME_HASHTAGS[theme], 5).join(" ");
  const igTags = uniqueHashtags(
    [...THEME_HASHTAGS[theme], ...EXTRA_IG_HASHTAGS],
    22,
  ).join(" ");

  const valueFb = formatSocialValueBlock(snippet, "facebook");
  const valueIg = formatSocialValueBlock(snippet, "instagram");
  const valueGbp = formatSocialValueBlock(snippet, "googleBusiness");
  const valueYt = formatSocialValueBlock(snippet, "youtube");

  const facebook = [
    `🔥 ${hook}`,
    "",
    detail,
    "",
    valueFb,
    "",
    "💬 DM us or comment GOA — we'll help you pick the best slot!",
    "",
    fbTags,
  ]
    .filter(Boolean)
    .join("\n");

  const instagram = [
    `✨ ${hook}`,
    "",
    detail,
    "",
    valueIg,
    "",
    "📌 Save this | 👇 Tag your Goa buddy",
    "",
    `🔗 ${url}`,
    "",
    igTags,
  ]
    .filter(Boolean)
    .join("\n");

  const googleBusiness = [
    hook,
    "",
    detail,
    "",
    valueGbp,
    "",
    `Full guide: ${url}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1500);

  const ytTags = uniqueHashtags(THEME_HASHTAGS[theme], 8).join(" ");
  const youtube = [
    `🎬 ${hook}`,
    "",
    detail,
    "",
    valueYt,
    "",
    `👉 ${url}`,
    "",
    "Planning Goa? Comment your dates 👇",
    "",
    ytTags,
  ]
    .filter(Boolean)
    .join("\n");

  return { facebook, instagram, googleBusiness, youtube };
}

function clampCaption(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function parseAiCaptions(
  raw: unknown,
  fallback: PlatformCaptions,
): PlatformCaptions {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const pick = (key: SocialPlatform, max: number) => {
    const v = String(o[key] ?? "").trim();
    return v ? clampCaption(v, max) : fallback[key];
  };
  return {
    facebook: pick("facebook", 1200),
    instagram: pick("instagram", 2200),
    googleBusiness: pick("googleBusiness", 1500),
    youtube: pick("youtube", 1500),
  };
}

function ensureCaptionEssentials(
  caption: string,
  snippet: SocialCatalogSnippet,
  platform: SocialPlatform,
  guideUrl: string,
): string {
  let text = caption.trim();
  const phoneDigits = snippet.phoneLabel.replace(/\D/g, "").slice(-6);
  const needsPhone = phoneDigits.length >= 6 && !text.replace(/\D/g, "").includes(phoneDigits);
  const needsBooking = !text.includes(snippet.bookingUrl);
  const needsLocation = !/baga|north goa|calangute/i.test(text);
  const needsPrice = snippet.priceLines.length > 0 && !/₹\d/.test(text);

  if (!needsPhone && !needsBooking && !needsLocation && !needsPrice) return text;

  const extras: string[] = [];
  if (needsPrice && snippet.priceLines.length) {
    extras.push(
      snippet.priceLines
        .slice(0, 3)
        .map((l) => `💰 ${l.label} — ${l.price}`)
        .join("\n"),
    );
  }
  if (needsLocation) extras.push(snippet.locationLine);
  if (needsPhone) extras.push(`📞 ${snippet.phoneLabel}`);
  if (needsBooking && platform !== "facebook") {
    extras.push(`🎫 Book: ${snippet.bookingUrl}`);
  } else if (needsBooking && platform === "facebook") {
    extras.push(`Book online: ${snippet.bookingUrl}`);
  }
  if (platform === "googleBusiness" && !text.includes(guideUrl)) {
    extras.push(`Guide: ${guideUrl}`);
  }

  if (!extras.length) return text;
  return `${text}\n\n${extras.join("\n")}`.trim();
}

export async function generatePlatformCaptions(
  payload: SocialContentPayload,
): Promise<PlatformCaptions> {
  const snippet = await buildSocialCatalogSnippet(payload);
  const fallback = buildFallbackCaptions(payload, snippet);
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return fallback;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const theme = detectTheme(payload);
  const site = SITE_URL.replace(/\/$/, "");

  const system = `You write short, high-converting social media copy for ${BRAND} (${site}), a scuba & Goa activities booking business based in Baga, North Goa.

Return JSON only with keys: facebook, instagram, googleBusiness, youtube.

CRITICAL — keep posts SHORT (people scroll fast):
- Max 2-3 price lines from CATALOG only (exact ₹ amounts). Never invent prices.
- Always mention: Baga/North Goa location, phone ${snippet.phoneLabel}, booking link ${snippet.bookingUrl}
- One trust line: hotel pickup, certified crew, instant booking (pick 1-2 points, not a paragraph)
- Strong CTA: visit website, call, or book online

Platform rules:
- facebook: Hook (1 line) + 1 line teaser + 2-3 price bullets + location + phone + book link text + engagement question. 3-5 hashtags. NO URL in text (link attached separately). Max 750 chars total.
- instagram: Hook + teaser + price bullets + location + phone + book URL + save/tag CTA + 18-22 hashtags. Max 1800 chars.
- googleBusiness: Professional, local SEO. Title hook + brief value + 2-3 prices + Baga location + phone + booking URL + guide URL. Max 2 hashtags. Max 1300 chars.
- youtube: Hook + teaser + prices + location + phone + guide URL + comment question + 6-8 hashtags. Max 1000 chars.

Topic theme: ${theme}. Content type: ${payload.contentType}.
Indian tourists — simple English; light Hinglish ok on Instagram only.`;

  const user = `POST TOPIC:
Title: ${payload.title}
Excerpt: ${payload.excerpt.slice(0, 400)}
Guide URL: ${payload.url}
Slug: ${payload.slug}

${snippet.contextBlock}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.55,
        max_tokens: 1600,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    if (!res.ok) return fallback;

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return fallback;

    const parsed = JSON.parse(content) as unknown;
    const captions = parseAiCaptions(parsed, fallback);

    const platforms: SocialPlatform[] = [
      "facebook",
      "instagram",
      "googleBusiness",
      "youtube",
    ];
    for (const p of platforms) {
      captions[p] = ensureCaptionEssentials(
        captions[p],
        snippet,
        p,
        payload.url,
      );
      captions[p] = clampCaption(
        captions[p],
        p === "instagram" ? 2200 : p === "googleBusiness" ? 1500 : 1200,
      );
    }

    if (!captions.instagram.includes(payload.url)) {
      captions.instagram = `${captions.instagram}\n\n🔗 ${payload.url}`.slice(0, 2200);
    }

    return captions;
  } catch {
    return fallback;
  }
}

/** Legacy single caption — prefer generatePlatformCaptions. */
export async function buildSocialCaption(payload: SocialContentPayload): Promise<string> {
  const snippet = await buildSocialCatalogSnippet(payload);
  return buildFallbackCaptions(payload, snippet).facebook;
}
