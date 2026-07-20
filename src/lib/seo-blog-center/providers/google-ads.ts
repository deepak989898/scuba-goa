/**
 * Google Ads KeywordPlanIdeaService adapter (REST).
 * Activates only when GOOGLE_ADS_* env vars are present.
 * Never fabricates search volume when not configured.
 */

import type { ProviderResult, RawKeywordIdea, ResearchInput } from "./types";

export function isGoogleAdsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() &&
      process.env.GOOGLE_ADS_CLIENT_ID?.trim() &&
      process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() &&
      process.env.GOOGLE_ADS_CUSTOMER_ID?.trim(),
  );
}

async function getAdsAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!.trim();
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN!.trim();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || "Google Ads OAuth token failed");
  }
  return data.access_token;
}

/** India geo target constant (Google Ads). */
const GEO_INDIA = "geoTargetConstants/2356";

export async function fetchGoogleAdsKeywordIdeas(
  input: ResearchInput,
): Promise<ProviderResult> {
  if (!isGoogleAdsConfigured()) {
    return {
      configured: false,
      ideas: [],
      provider: "google_ads",
      error: "Google Ads API not configured",
    };
  }

  try {
    const token = await getAdsAccessToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, "");
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(
      /-/g,
      "",
    );
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim();
    const seed = input.seedKeyword.trim() || input.serviceName;
    const url = `https://googleads.googleapis.com/v17/customers/${customerId}:generateKeywordIdeas`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };
    if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        language: "languageConstants/1000",
        geoTargetConstants: [GEO_INDIA],
        includeAdultKeywords: false,
        keywordPlanNetwork: "GOOGLE_SEARCH",
        keywordSeed: { keywords: [seed, `${seed} Goa`, input.serviceName] },
      }),
    });

    const data = (await res.json()) as {
      error?: { message?: string };
      results?: Array<{
        text?: string;
        keywordIdeaMetrics?: {
          avgMonthlySearches?: string | number;
          competition?: string;
          competitionIndex?: string | number;
          lowTopOfPageBidMicros?: string | number;
          highTopOfPageBidMicros?: string | number;
        };
      }>;
    };

    if (!res.ok) {
      return {
        configured: true,
        ideas: [],
        provider: "google_ads",
        error: data.error?.message || `Google Ads HTTP ${res.status}`,
      };
    }

    const ideas: RawKeywordIdea[] = [];
    for (const row of data.results ?? []) {
      const text = String(row.text ?? "").trim();
      if (!text) continue;
      const m = row.keywordIdeaMetrics;
      const searches = m?.avgMonthlySearches != null ? Number(m.avgMonthlySearches) : null;
      const compRaw = String(m?.competition ?? "").toUpperCase();
      const competition =
        compRaw.includes("LOW") ? "low" : compRaw.includes("HIGH") ? "high" : "medium";
      const lowMicros = m?.lowTopOfPageBidMicros != null ? Number(m.lowTopOfPageBidMicros) : null;
      const highMicros =
        m?.highTopOfPageBidMicros != null ? Number(m.highTopOfPageBidMicros) : null;
      ideas.push({
        keyword: text,
        source: "google_ads",
        monthlySearches: searches,
        competition,
        competitionIndex:
          m?.competitionIndex != null ? Number(m.competitionIndex) : null,
        cpcLow: lowMicros != null ? lowMicros / 1_000_000 : null,
        cpcHigh: highMicros != null ? highMicros / 1_000_000 : null,
        serviceSlug: input.serviceSlug,
      });
    }

    return { configured: true, ideas, provider: "google_ads" };
  } catch (e) {
    return {
      configured: true,
      ideas: [],
      provider: "google_ads",
      error: e instanceof Error ? e.message : "Google Ads request failed",
    };
  }
}
