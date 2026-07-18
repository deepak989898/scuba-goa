import type { CompetitorPriceSnapshot, PricingTarget } from "@/lib/pricing-agent/types";
import { buildSearchQueries } from "@/lib/pricing-agent/catalog";

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

function extractPricesFromText(text: string): number[] {
  const out: number[] = [];
  const re =
    /(?:₹|Rs\.?\s*|INR\s*)(\d{1,3}(?:,\d{2,3})+|\d{3,6})|\b(\d{3,5})\s*(?:\/|-)?\s*(?:pp|per person)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = (m[1] || m[2] || "").replace(/,/g, "");
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 199 && n <= 100000) out.push(n);
  }
  return out;
}

function domainFromUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Collect competitor price candidates from public Google SERP snippets (Serper).
 * Does not scrape private pages or bypass access controls.
 */
export async function researchMarketPrices(opts: {
  target: PricingTarget;
  maxSources: number;
  suggestionId: string;
}): Promise<CompetitorPriceSnapshot[]> {
  const key =
    process.env.SERPER_API_KEY?.trim() || process.env.SERP_API_KEY?.trim();
  if (!key) return [];

  const queries = buildSearchQueries(opts.target);
  const snapshots: CompetitorPriceSnapshot[] = [];
  const seenUrls = new Set<string>();
  const now = new Date().toISOString();

  for (const q of queries) {
    if (snapshots.length >= opts.maxSources) break;
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q, gl: "in", hl: "en", num: 8 }),
      });
      if (!res.ok) continue;
      const json = (await res.json().catch(() => ({}))) as {
        organic?: SerperOrganic[];
      };

      for (const row of json.organic ?? []) {
        if (snapshots.length >= opts.maxSources) break;
        const url = String(row.link ?? "").trim();
        if (!url || seenUrls.has(url)) continue;
        const host = domainFromUrl(url);
        if (!host || host.includes("bookscubagoa.com")) continue;
        seenUrls.add(url);

        const blob = `${row.title ?? ""} ${row.snippet ?? ""}`;
        const prices = extractPricesFromText(blob);
        if (!prices.length) continue;

        // Prefer mid prices from snippet; skip obvious deposit-like mins when higher exists
        const price =
          prices.length > 1
            ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]!
            : prices[0]!;

        if (price < 199 || price === 1 || price === 99) continue;

        const title = String(row.title ?? "Listing").slice(0, 200);
        const nameLower = opts.target.name.toLowerCase();
        const titleLower = title.toLowerCase();
        let similarity = 40;
        for (const token of nameLower.split(/\s+/).filter((t) => t.length > 3)) {
          if (titleLower.includes(token) || blob.toLowerCase().includes(token)) {
            similarity += 8;
          }
        }
        if (/goa/i.test(blob)) similarity += 5;
        similarity = Math.min(95, similarity);

        snapshots.push({
          id: `${opts.suggestionId}_${snapshots.length}`,
          suggestionId: opts.suggestionId,
          targetId: opts.target.id,
          providerName: host,
          packageTitle: title,
          price,
          originalPrice: null,
          priceType: /per\s*person|\/\s*pp/i.test(blob) ? "per_person" : "unknown",
          location: "Goa",
          duration: "",
          inclusions: [],
          sourceUrl: url,
          similarityScore: similarity,
          reliabilityScore: Math.min(90, 50 + Math.round(similarity / 3)),
          snippet: String(row.snippet ?? "").slice(0, 400),
          checkedAt: now,
        });
      }
    } catch {
      // continue other queries
    }
  }

  return snapshots;
}
