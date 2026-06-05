export type CompetitorGapResult =
  | { configured: true; note: string; examples: { query: string; competitorDomains: string[] }[] }
  | { configured: false; note: string; examples: { query: string; competitorDomains: string[] }[] };

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

function domainFromUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Optional competitor gap lookup via Serper (Google SERP API).
 * Env: SERPER_API_KEY
 */
export async function detectCompetitorGaps(
  queries: { query: string; impressions: number; position: number }[],
): Promise<CompetitorGapResult> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) {
    return {
      configured: false,
      note: "SERPER_API_KEY not set — competitor keyword gaps skipped.",
      examples: [],
    };
  }

  const candidates = queries
    .filter((q) => q.impressions >= 150 && q.position >= 6 && q.position <= 20)
    .slice(0, 6);

  const examples: { query: string; competitorDomains: string[] }[] = [];
  for (const q of candidates) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: q.query, gl: "in", hl: "en", num: 5 }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        organic?: { link?: string }[];
      };
      const domains = uniq((json.organic ?? []).map((r) => domainFromUrl(String(r.link ?? ""))))
        .filter((d) => d && d !== "bookscubagoa.com")
        .slice(0, 5);
      if (domains.length) examples.push({ query: q.query, competitorDomains: domains });
    } catch {
      // ignore single query failures
    }
  }

  return {
    configured: true,
    note: "Serper competitor scan",
    examples,
  };
}

