import { getGscAccessToken } from "./connection";
import { getSeoSettings } from "./settings";
import type { IndexStatusCode } from "./types";

function encodeSite(siteUrl: string): string {
  return encodeURIComponent(siteUrl);
}

export async function listGscSites(): Promise<
  { ok: true; sites: { siteUrl: string; permissionLevel?: string }[] } | { ok: false; error: string }
> {
  const auth = await getGscAccessToken({ requireWrite: false });
  if (!auth.ok) return auth;
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    siteEntry?: { siteUrl?: string; permissionLevel?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `List sites failed (${res.status})` };
  }
  const sites = (data.siteEntry ?? [])
    .filter((s) => s.siteUrl)
    .map((s) => ({ siteUrl: s.siteUrl!, permissionLevel: s.permissionLevel }));
  return { ok: true, sites };
}

export async function submitGscSitemap(sitemapUrl: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const settings = await getSeoSettings();
  const auth = await getGscAccessToken({ requireWrite: true });
  if (!auth.ok) return auth;
  const feedpath = encodeURIComponent(sitemapUrl);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeSite(settings.propertyUri)}/sitemaps/${feedpath}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${auth.token}` },
    },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    return { ok: false, error: data.error?.message ?? `Sitemap submit failed (${res.status})` };
  }
  return { ok: true };
}

export async function getGscSitemapStatus(sitemapUrl: string): Promise<
  | { ok: true; status: string; errors?: number; warnings?: number }
  | { ok: false; error: string }
> {
  const settings = await getSeoSettings();
  const auth = await getGscAccessToken({ requireWrite: false });
  if (!auth.ok) return auth;
  const feedpath = encodeURIComponent(sitemapUrl);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeSite(settings.propertyUri)}/sitemaps/${feedpath}`,
    { headers: { Authorization: `Bearer ${auth.token}` } },
  );
  const data = (await res.json().catch(() => ({}))) as {
    errors?: string;
    warnings?: string;
    isPending?: boolean;
    isSitemapsIndex?: boolean;
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `Sitemap status failed (${res.status})` };
  }
  return {
    ok: true,
    status: data.isPending ? "pending" : "submitted",
    errors: Number(data.errors ?? 0) || 0,
    warnings: Number(data.warnings ?? 0) || 0,
  };
}

export type UrlInspectionResult = {
  indexStatus: IndexStatusCode;
  coverageState: string | null;
  crawlState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawlTime: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  rawVerdict: string | null;
};

export function mapInspectionToStatus(result: {
  indexingState?: string;
  pageFetchState?: string;
  robotsTxtState?: string;
  verdict?: string;
  coverageState?: string;
}): IndexStatusCode {
  const indexing = (result.indexingState || "").toUpperCase();
  const fetch = (result.pageFetchState || "").toUpperCase();
  const robots = (result.robotsTxtState || "").toUpperCase();
  const coverage = (result.coverageState || "").toUpperCase();
  const verdict = (result.verdict || "").toUpperCase();

  if (robots.includes("DISALLOWED")) return "BLOCKED_BY_ROBOTS";
  if (fetch.includes("NOT_FOUND") || fetch.includes("SOFT_404")) {
    return fetch.includes("SOFT") ? "SOFT_404" : "NOT_FOUND";
  }
  if (fetch.includes("SERVER_ERROR") || fetch.includes("ACCESS_DENIED")) {
    return "SERVER_ERROR";
  }
  if (fetch.includes("REDIRECT")) return "REDIRECT_ERROR";

  // GSC UI "URL is on Google" → verdict PASS and/or coverage mentions indexed.
  // Check INDEXED before CRAWLED — "Crawled - currently indexed" contains both.
  if (verdict === "PASS" || coverage.includes("INDEXED")) {
    if (coverage.includes("DUPLICATE")) return "DUPLICATE_GOOGLE_CANONICAL";
    if (coverage.includes("ALTERNATE")) return "ALTERNATE_WITH_CANONICAL";
    return "INDEXED";
  }

  if (indexing.includes("INDEXING_ALLOWED")) {
    if (coverage.includes("DUPLICATE")) return "DUPLICATE_GOOGLE_CANONICAL";
    if (coverage.includes("ALTERNATE")) return "ALTERNATE_WITH_CANONICAL";
    if (coverage.includes("NOT INDEXED") || coverage.includes("NOT_INDEXED")) {
      if (coverage.includes("DISCOVERED")) return "DISCOVERED_NOT_INDEXED";
      if (coverage.includes("CRAWLED")) return "CRAWLED_NOT_INDEXED";
    }
    if (coverage.includes("SUBMITTED")) return "INDEXED";
    return "INDEXED";
  }

  if (coverage.includes("CRAWLED")) return "CRAWLED_NOT_INDEXED";
  if (coverage.includes("DISCOVERED")) return "DISCOVERED_NOT_INDEXED";
  if (coverage.includes("NOINDEX")) return "BLOCKED_BY_NOINDEX";
  if (!indexing && !coverage && !fetch) return "UNKNOWN";
  return "NOT_ON_GOOGLE";
}

/** Read-only URL Inspection — does NOT request indexing. */
export async function inspectUrlInGsc(inspectionUrl: string): Promise<
  { ok: true; result: UrlInspectionResult } | { ok: false; error: string }
> {
  const settings = await getSeoSettings();
  const auth = await getGscAccessToken({ requireWrite: true });
  if (!auth.ok) {
    // Try readonly token — Inspection API often needs full webmasters; document failure clearly
    const ro = await getGscAccessToken({ requireWrite: false });
    if (!ro.ok) return ro;
    return inspectWithToken(ro.token, settings.propertyUri, inspectionUrl);
  }
  return inspectWithToken(auth.token, settings.propertyUri, inspectionUrl);
}

async function inspectWithToken(
  token: string,
  siteUrl: string,
  inspectionUrl: string,
): Promise<{ ok: true; result: UrlInspectionResult } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const res = await fetch(
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inspectionUrl,
          siteUrl,
          languageCode: "en-US",
        }),
        signal: controller.signal,
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      inspectionResult?: {
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
          robotsTxtState?: string;
          indexingState?: string;
          lastCrawlTime?: string;
          pageFetchState?: string;
          googleCanonical?: string;
          userCanonical?: string;
        };
      };
    };

    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message ?? `URL Inspection failed (${res.status})`,
      };
    }

    const idx = data.inspectionResult?.indexStatusResult;
    if (!idx) {
      return {
        ok: true,
        result: {
          indexStatus: "UNKNOWN",
          coverageState: null,
          crawlState: null,
          googleCanonical: null,
          userCanonical: null,
          lastCrawlTime: null,
          robotsTxtState: null,
          indexingState: null,
          pageFetchState: null,
          rawVerdict: null,
        },
      };
    }

    const indexStatus = mapInspectionToStatus({
      indexingState: idx.indexingState,
      pageFetchState: idx.pageFetchState,
      robotsTxtState: idx.robotsTxtState,
      verdict: idx.verdict,
      coverageState: idx.coverageState,
    });

    return {
      ok: true,
      result: {
        indexStatus,
        coverageState: idx.coverageState ?? null,
        crawlState: idx.pageFetchState ?? null,
        googleCanonical: idx.googleCanonical ?? null,
        userCanonical: idx.userCanonical ?? null,
        lastCrawlTime: idx.lastCrawlTime ?? null,
        robotsTxtState: idx.robotsTxtState ?? null,
        indexingState: idx.indexingState ?? null,
        pageFetchState: idx.pageFetchState ?? null,
        rawVerdict: idx.verdict ?? null,
      },
    };
  } catch (e) {
    const aborted =
      e instanceof Error &&
      (e.name === "AbortError" || e.message.includes("aborted"));
    return {
      ok: false,
      error: aborted
        ? "GSC URL Inspection timed out (22s) — try again"
        : e instanceof Error
          ? e.message
          : "URL Inspection failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function querySearchAnalytics(input: {
  startDate: string;
  endDate: string;
  dimensions: ("query" | "page" | "country" | "device")[];
  rowLimit?: number;
}): Promise<
  | {
      ok: true;
      rows: {
        keys: string[];
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }[];
    }
  | { ok: false; error: string }
> {
  const settings = await getSeoSettings();
  const auth = await getGscAccessToken({ requireWrite: false });
  if (!auth.ok) return auth;

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeSite(settings.propertyUri)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: input.startDate,
        endDate: input.endDate,
        dimensions: input.dimensions,
        rowLimit: Math.min(2500, input.rowLimit ?? 1000),
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    rows?: {
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: data.error?.message ?? `Search Analytics failed (${res.status})` };
  }
  return {
    ok: true,
    rows: (data.rows ?? []).map((r) => ({
      keys: r.keys ?? [],
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    })),
  };
}
