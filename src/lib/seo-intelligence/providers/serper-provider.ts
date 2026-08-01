import { normaliseDomain } from "../domain";
import type {
  SerpKeywordMetrics,
  SerpOrganicResult,
  SerpProvider,
  SerpSearchResult,
} from "./serp-types";

function apiKey(): string {
  return (
    process.env.SERPER_API_KEY?.trim() ||
    process.env.SERP_API_KEY?.trim() ||
    ""
  );
}

function domainFromUrl(u: string): string {
  return normaliseDomain(u) ?? "";
}

export function createSerperProvider(): SerpProvider {
  return {
    name: "serper",
    isConfigured() {
      return Boolean(apiKey());
    },
    async searchKeyword(keyword, opts) {
      const key = apiKey();
      if (!key) {
        return {
          keyword,
          organic: [],
          relatedSearches: [],
          peopleAlsoAsk: [],
          configured: false,
          provider: "serper",
          error: "SERPER_API_KEY / SERP_API_KEY not configured",
        };
      }

      const gl = (process.env.SERP_COUNTRY?.trim() || "in").toLowerCase();
      const hl = process.env.SERP_LANGUAGE?.trim() || "en";
      const location = process.env.SERP_LOCATION?.trim() || "Goa, India";

      try {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: keyword,
            gl,
            hl,
            location,
            num: opts?.num ?? 10,
          }),
        });
        if (!res.ok) {
          return {
            keyword,
            organic: [],
            relatedSearches: [],
            peopleAlsoAsk: [],
            configured: true,
            provider: "serper",
            error: `Serper HTTP ${res.status}`,
          };
        }
        const json = (await res.json()) as {
          organic?: { position?: number; title?: string; link?: string; snippet?: string }[];
          relatedSearches?: { query?: string }[];
          peopleAlsoAsk?: { question?: string }[];
        };
        const organic: SerpOrganicResult[] = (json.organic ?? [])
          .map((r, i) => ({
            position: Number(r.position ?? i + 1),
            title: String(r.title ?? ""),
            url: String(r.link ?? ""),
            domain: domainFromUrl(String(r.link ?? "")),
            snippet: r.snippet ? String(r.snippet) : undefined,
          }))
          .filter((r) => r.url && r.domain);

        return {
          keyword,
          organic,
          relatedSearches: (json.relatedSearches ?? [])
            .map((r) => String(r.query ?? "").trim())
            .filter(Boolean),
          peopleAlsoAsk: (json.peopleAlsoAsk ?? [])
            .map((r) => String(r.question ?? "").trim())
            .filter(Boolean),
          configured: true,
          provider: "serper",
        };
      } catch (e) {
        return {
          keyword,
          organic: [],
          relatedSearches: [],
          peopleAlsoAsk: [],
          configured: true,
          provider: "serper",
          error: e instanceof Error ? e.message : "Serper request failed",
        };
      }
    },
    async getTopResults(keyword, opts) {
      const result = await this.searchKeyword(keyword, opts);
      return result.organic;
    },
    async getKeywordMetrics(keyword): Promise<SerpKeywordMetrics> {
      // Serper free search does not return volume/difficulty; keep null until Ads/DataForSEO wired.
      return {
        keyword,
        searchVolume: null,
        difficulty: null,
        configured: this.isConfigured(),
        provider: "serper",
        error: this.isConfigured()
          ? "Volume/difficulty not available from Serper search endpoint"
          : "SERPER_API_KEY not configured",
      };
    },
    async getCompetitorRankings(keyword, competitorDomains) {
      const organic = await this.getTopResults(keyword, { num: 20 });
      const wanted = new Set(
        competitorDomains
          .map((d) => normaliseDomain(d))
          .filter((d): d is string => Boolean(d)),
      );
      return [...wanted].map((domain) => {
        const hit = organic.find(
          (o) => o.domain === domain || o.domain.endsWith(`.${domain}`),
        );
        return {
          domain,
          position: hit?.position ?? null,
          url: hit?.url ?? null,
        };
      });
    },
  };
}
