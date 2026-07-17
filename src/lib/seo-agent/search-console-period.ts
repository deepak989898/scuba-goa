import { getGoogleApiAccessToken } from "@/lib/ai-analytics/connectors/google-auth";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscResponse = {
  rows?: Partial<GscRow>[];
  error?: { message?: string };
};

function siteUrlFromEnv(): string {
  return (
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com").replace(/\/$/, "")}/`
  );
}

export async function fetchGscRows(input: {
  startDate: string;
  endDate: string;
  dimensions: ("query" | "page")[];
  rowLimit: number;
}): Promise<{ ok: true; siteUrl: string; rows: GscRow[] } | { ok: false; error: string }> {
  const siteUrl = siteUrlFromEnv();
  try {
    const token = await getGoogleApiAccessToken(SCOPES, "search-console");
    if (!token) return { ok: false, error: "Could not obtain Google API token" };

    const encodedSite = encodeURIComponent(siteUrl);
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: input.startDate,
          endDate: input.endDate,
          dimensions: input.dimensions,
          rowLimit: Math.min(2500, Math.max(1, Math.floor(input.rowLimit))),
        }),
      },
    );

    const json = (await res.json().catch(() => ({}))) as GscResponse;
    if (!res.ok) {
      return {
        ok: false,
        error:
          json.error?.message ??
          `${res.status} ${res.statusText}. Add service account to Search Console property.`,
      };
    }

    const rows: GscRow[] = (json.rows ?? [])
      .map((r) => ({
        keys: Array.isArray(r.keys) ? (r.keys as string[]).map((x) => String(x)) : [],
        clicks: Number(r.clicks ?? 0) || 0,
        impressions: Number(r.impressions ?? 0) || 0,
        ctr: Number(r.ctr ?? 0) || 0,
        position: Number(r.position ?? 0) || 0,
      }))
      .filter((r) => r.keys.length === input.dimensions.length);

    return { ok: true, siteUrl, rows };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Search Console request failed",
    };
  }
}

