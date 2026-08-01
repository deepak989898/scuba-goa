import { getAllServicesServer } from "@/lib/get-services-server";
import { addCompetitor, listCompetitors } from "./competitors";
import {
  isExcludedDomain,
  isOwnDomain,
  normaliseDomain,
} from "./domain";
import { getSerpProvider } from "./providers";
import { scoreCompetitorRelevance } from "./relevance";
import { getSeoIntelSettings } from "./settings";
import { appendSeoIntelLog } from "./activity-log";

const SEED_FALLBACK = [
  "scuba diving in goa",
  "bungee jumping in goa",
  "water sports in goa",
  "flyboarding in goa",
  "goa casino booking",
  "north goa tour",
  "south goa tour",
  "dudhsagar waterfall tour",
  "russian night club in goa",
  "adventure boat party goa",
  "cruise party in goa",
  "parasailing in goa",
  "jet skiing in goa",
  "banana boat ride goa",
  "bumper ride goa",
  "dolphin trip goa",
  "grand island trip goa",
  "snorkeling in goa",
  "goa tour packages",
];

async function buildSeedKeywords(limit: number): Promise<string[]> {
  const services = await getAllServicesServer().catch(() => []);
  const fromServices = services
    .map((s) => {
      const title = String(s.title ?? "").trim();
      if (!title) return "";
      const lower = title.toLowerCase();
      return lower.includes("goa") ? title : `${title} in Goa`;
    })
    .filter(Boolean);

  const seeds = [...fromServices, ...SEED_FALLBACK];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of seeds) {
    const key = s.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Discover competitor domains from SERP for seed + live service keywords.
 * New domains enter pending_review (or auto-approve if settings allow).
 */
export async function discoverCompetitors(opts?: {
  maxKeywords?: number;
  actor?: string;
}): Promise<{
  configured: boolean;
  keywordsScanned: number;
  discovered: number;
  skipped: number;
  errors: string[];
  domains: string[];
}> {
  const settings = await getSeoIntelSettings();
  const provider = getSerpProvider();
  const actor = opts?.actor ?? "system";

  if (!provider.isConfigured()) {
    await appendSeoIntelLog({
      action: "competitor.discover",
      entityType: "competitor",
      actor,
      details: "SERP provider not configured — discovery skipped",
      result: "skipped",
    });
    return {
      configured: false,
      keywordsScanned: 0,
      discovered: 0,
      skipped: 0,
      errors: ["SERP provider not configured. Set SERPER_API_KEY."],
      domains: [],
    };
  }

  const keywords = await buildSeedKeywords(opts?.maxKeywords ?? 12);
  const existing = await listCompetitors({ includeBlocked: true });
  const existingSet = new Set(existing.map((c) => c.canonicalDomain));

  type Acc = {
    hits: number;
    top10: number;
    titles: string[];
    snippets: string[];
  };
  const acc = new Map<string, Acc>();
  const errors: string[] = [];

  for (const keyword of keywords) {
    const result = await provider.searchKeyword(keyword, { num: 10 });
    if (result.error) errors.push(`${keyword}: ${result.error}`);
    for (const row of result.organic) {
      const domain = normaliseDomain(row.domain);
      if (!domain || isOwnDomain(domain) || isExcludedDomain(domain)) continue;
      const cur = acc.get(domain) ?? {
        hits: 0,
        top10: 0,
        titles: [],
        snippets: [],
      };
      cur.hits += 1;
      if (row.position <= 10) cur.top10 += 1;
      if (row.title && cur.titles.length < 3) cur.titles.push(row.title);
      if (row.snippet && cur.snippets.length < 3) cur.snippets.push(row.snippet);
      acc.set(domain, cur);
    }
  }

  let discovered = 0;
  let skipped = 0;
  const domains: string[] = [];

  for (const [domain, stats] of acc) {
    if (existingSet.has(domain)) {
      skipped += 1;
      continue;
    }
    const scored = scoreCompetitorRelevance({
      domain,
      sharedKeywordHits: stats.hits,
      top10Appearances: stats.top10,
      sampleTitles: stats.titles,
      sampleSnippets: stats.snippets,
    });
    if (scored.excluded || scored.relevanceScore < 25) {
      skipped += 1;
      continue;
    }

    let status: "pending_review" | "approved" = "pending_review";
    if (
      settings.competitorAutoApprove &&
      scored.confidence >= settings.competitorAutoApproveMinConfidence &&
      scored.relevanceScore >= 60
    ) {
      status = "approved";
    }

    const added = await addCompetitor({
      domain,
      type: scored.type,
      source: "serper",
      relevanceScore: scored.relevanceScore,
      confidence: scored.confidence,
      status,
      notes: scored.reason,
      actor,
    });
    if (added.ok) {
      discovered += 1;
      domains.push(domain);
      existingSet.add(domain);
    } else {
      skipped += 1;
    }
  }

  await appendSeoIntelLog({
    action: "competitor.discover",
    entityType: "competitor",
    actor,
    details: `Scanned ${keywords.length} keywords; discovered ${discovered}; skipped ${skipped}`,
    result: "ok",
  });

  return {
    configured: true,
    keywordsScanned: keywords.length,
    discovered,
    skipped,
    errors: errors.slice(0, 10),
    domains,
  };
}
