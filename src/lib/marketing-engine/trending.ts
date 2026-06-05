export type TrendingScanResult = {
  configured: boolean;
  queries: string[];
  snippets: { query: string; titles: string[] }[];
};

const DEFAULT_QUERIES = [
  "Goa tourism trends 2026",
  "scuba diving Goa",
  "Goa monsoon travel",
  "best water sports Goa",
  "Grand Island scuba diving",
];

export async function scanTourismTrends(
  extraQueries: string[] = [],
): Promise<TrendingScanResult> {
  const key = process.env.SERPER_API_KEY?.trim();
  const queries = [...new Set([...DEFAULT_QUERIES, ...extraQueries])].slice(0, 8);

  if (!key) {
    return {
      configured: false,
      queries,
      snippets: queries.map((q) => ({ query: q, titles: [] })),
    };
  }

  const snippets: { query: string; titles: string[] }[] = [];
  for (const q of queries) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q, gl: "in", hl: "en", num: 5 }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        organic?: { title?: string }[];
        news?: { title?: string }[];
      };
      const titles = [
        ...(json.organic ?? []).map((r) => String(r.title ?? "")),
        ...(json.news ?? []).map((r) => String(r.title ?? "")),
      ]
        .filter(Boolean)
        .slice(0, 5);
      snippets.push({ query: q, titles });
    } catch {
      snippets.push({ query: q, titles: [] });
    }
  }

  return { configured: true, queries, snippets };
}
