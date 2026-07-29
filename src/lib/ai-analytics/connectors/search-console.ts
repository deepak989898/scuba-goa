import {
  getGoogleApiAccessToken,
  getGoogleServiceAccountEmail,
} from "@/lib/ai-analytics/connectors/google-auth";
import type { SearchConsoleDailySnapshot } from "@/lib/ai-analytics/types";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

export async function fetchSearchConsoleDailySnapshot(
  dateIst: string,
): Promise<{
  data: SearchConsoleDailySnapshot | null;
  status: "ok" | "skipped" | "error";
  message: string;
}> {
  const siteUrl =
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bookscubagoa.com").replace(/\/$/, "")}/`;

  const token = await getGoogleApiAccessToken(SCOPES, "search-console");
  const clientEmail = getGoogleServiceAccountEmail("search-console");
  if (!token) {
    return {
      data: null,
      status: "error",
      message: `Could not obtain Google API token${clientEmail ? ` for ${clientEmail}` : ""}`,
    };
  }

  const encodedSite = encodeURIComponent(siteUrl);

  const summaryRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateIst,
        endDate: dateIst,
        dimensions: [],
        rowLimit: 1,
      }),
    },
  );

  const summaryJson = (await summaryRes.json().catch(() => ({}))) as {
    rows?: { clicks?: number; impressions?: number; ctr?: number; position?: number }[];
    error?: { message?: string };
  };

  if (!summaryRes.ok) {
    return {
      data: null,
      status: "error",
      message: `${summaryJson.error?.message ?? summaryRes.statusText}. Property: ${siteUrl}. Service account used: ${clientEmail ?? "unknown"}. Add this exact email as a Full user on this exact Search Console property.`,
    };
  }

  const row = summaryJson.rows?.[0] ?? {};

  const queryRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateIst,
        endDate: dateIst,
        dimensions: ["query"],
        rowLimit: 10,
      }),
    },
  );

  const queryJson = (await queryRes.json().catch(() => ({}))) as {
    rows?: { keys?: string[]; clicks?: number; impressions?: number }[];
  };

  const topQueries = (queryJson.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
  }));

  return {
    data: {
      siteUrl,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
      topQueries,
    },
    status: "ok",
    message: "Search Console API",
  };
}
