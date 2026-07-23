import type { ContentType, KeywordIntent } from "@/lib/seo-blog-center/types";
import type { ClassifiedKeyword, RawKeywordIdea } from "./providers/types";

const BLOCKED =
  /\b(porn|xxx|escort|casino cheat|hack|torrent|pirate|weapon)\b/i;

export function normalizeKeywordKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|in|of|for|to|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyIntent(keyword: string): KeywordIntent {
  const l = keyword.toLowerCase();
  if (/\b(price|cost|charges|fee|how much)\b/.test(l)) return "price";
  if (/\b(safe|safety|danger|risk)\b/.test(l)) return "safety";
  if (/\b(beginner|first time|non.?swimmer|kids|child)\b/.test(l)) return "beginner";
  if (/\b(best time|month|season|monsoon|winter)\b/.test(l)) return "seasonal";
  if (/\b(vs|versus|or|compare|comparison)\b/.test(l)) return "comparison";
  if (/^(how|what|when|where|why|is|can|do|does)\b/.test(l) || l.includes("?")) {
    return "faq";
  }
  if (/\b(book|booking|package|deal|offer)\b/.test(l)) return "transactional";
  if (
    /\b(near me|nearby|near my|from my location|how far|how much far|distance from|hotel pickup|baga|calangute|anjuna|vagator|candolim|panjim|panaji|palolem|colva|grande island|grand island|north goa|south goa|morjim|arambol|agonda)\b/.test(
      l,
    )
  ) {
    return "local";
  }
  if (/\b(best|top|review)\b/.test(l)) return "commercial";
  return "informational";
}

export function classifyContentType(intent: KeywordIntent, keyword: string): ContentType {
  const l = keyword.toLowerCase();
  if (intent === "price") return "price_guide";
  if (intent === "safety") return "safety_guide";
  if (intent === "beginner") return "beginner_guide";
  if (intent === "seasonal") return "seasonal_guide";
  if (intent === "comparison") return "comparison";
  if (intent === "faq") return "faq_article";
  if (intent === "transactional") return "booking_guide";
  if (/\b(top \d+|best \d+)\b/.test(l)) return "best_of";
  if (
    /\b(grande island|grand island|baga|calangute|anjuna|vagator|palolem|colva|location|near me|north goa|south goa)\b/.test(
      l,
    )
  ) {
    return "location_guide";
  }
  if (/\b(official|login|website)\b/.test(l)) return "optimize_service_page";
  return "complete_guide";
}

export function normalizeAndClassifyIdeas(
  ideas: RawKeywordIdea[],
): ClassifiedKeyword[] {
  const map = new Map<string, ClassifiedKeyword>();
  for (const idea of ideas) {
    const display = idea.keyword.replace(/\s+/g, " ").trim();
    if (display.length < 3 || display.length > 120) continue;
    if (BLOCKED.test(display)) continue;
    const normalized = normalizeKeywordKey(display);
    if (normalized.length < 3) continue;
    const intent = classifyIntent(display);
    const contentType = classifyContentType(intent, display);
    const existing = map.get(normalized);
    if (existing) {
      if (
        (idea.monthlySearches ?? 0) > (existing.monthlySearches ?? 0) ||
        (idea.gscImpressions ?? 0) > (existing.gscImpressions ?? 0)
      ) {
        map.set(normalized, {
          ...existing,
          ...idea,
          keyword: display,
          displayKeyword: display,
          normalizedKeyword: normalized,
          intent,
          contentType,
          monthlySearches: idea.monthlySearches ?? existing.monthlySearches,
          gscImpressions: idea.gscImpressions ?? existing.gscImpressions,
          gscClicks: idea.gscClicks ?? existing.gscClicks,
          gscCtr: idea.gscCtr ?? existing.gscCtr,
          gscPosition: idea.gscPosition ?? existing.gscPosition,
        });
      }
      continue;
    }
    map.set(normalized, {
      ...idea,
      keyword: display,
      displayKeyword: display,
      normalizedKeyword: normalized,
      intent,
      contentType,
    });
  }
  return [...map.values()];
}
