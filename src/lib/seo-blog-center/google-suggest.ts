const SUGGEST_URL = "https://suggestqueries.google.com/complete/search";

const GOA_SCUBA_DESTINATIONS = [
  "Goa",
  "Grande Island",
  "Baga",
  "Calangute",
  "Palolem",
  "North Goa",
  "South Goa",
];

export function buildScubaSeedQueries(): string[] {
  const seeds = new Set<string>();
  for (const dest of GOA_SCUBA_DESTINATIONS) {
    seeds.add(`scuba diving ${dest}`);
    seeds.add(`scuba diving price ${dest}`);
    seeds.add(`best scuba diving ${dest}`);
    seeds.add(`snorkeling ${dest}`);
    seeds.add(`water sports ${dest}`);
    seeds.add(`grande island scuba`);
    seeds.add(`book scuba ${dest}`);
  }
  seeds.add("scuba diving goa price");
  seeds.add("scuba diving goa booking");
  seeds.add("is scuba diving safe in goa");
  seeds.add("best time scuba diving goa");
  seeds.add("padi scuba goa");
  seeds.add("underwater diving goa");
  return [...seeds];
}

export async function fetchGoogleSuggestQueries(query: string): Promise<string[]> {
  const url = `${SUGGEST_URL}?client=firefox&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BookScubaGoaBot/1.0)",
        Accept: "application/json,text/plain,*/*",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const text = await res.text();
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    return (data[1] as unknown[])
      .filter((item): item is string => typeof item === "string" && item.trim().length > 2)
      .map((s) => s.trim());
  } catch {
    return [];
  }
}

export async function fetchSerpRelatedSearches(query: string): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim() || process.env.SERP_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "in", hl: "en", num: 10 }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      relatedSearches?: { query?: string }[];
      peopleAlsoAsk?: { question?: string }[];
    };
    return [
      ...(data.relatedSearches?.map((r) => r.query).filter(Boolean) ?? []),
      ...(data.peopleAlsoAsk?.map((r) => r.question).filter(Boolean) ?? []),
    ].map((s) => String(s).trim()).filter((s) => s.length > 2);
  } catch {
    return [];
  }
}
