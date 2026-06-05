import { getGoogleApiAccessToken } from "@/lib/ai-analytics/connectors/google-auth";
import type { Ga4DailySnapshot } from "@/lib/ai-analytics/types";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

export async function fetchGa4DailySnapshot(
  dateIst: string,
): Promise<{
  data: Ga4DailySnapshot | null;
  status: "ok" | "skipped" | "error";
  message: string;
}> {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.trim();
  if (!propertyId) {
    return {
      data: null,
      status: "skipped",
      message: "Set GOOGLE_ANALYTICS_PROPERTY_ID (numeric GA4 property ID)",
    };
  }

  const token = await getGoogleApiAccessToken(SCOPES);
  if (!token) {
    return {
      data: null,
      status: "error",
      message: "Could not obtain Google API token — check service account JSON",
    };
  }

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: dateIst, endDate: dateIst }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      }),
    },
  );

  const json = (await res.json().catch(() => ({}))) as {
    rows?: { metricValues?: { value?: string }[] }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      data: null,
      status: "error",
      message: `${json.error?.message ?? res.statusText}. Add service account email as Viewer on GA4 property.`,
    };
  }

  const vals = json.rows?.[0]?.metricValues ?? [];
  const num = (i: number) => Number(vals[i]?.value ?? 0);

  return {
    data: {
      propertyId,
      activeUsers: Math.round(num(0)),
      sessions: Math.round(num(1)),
      screenPageViews: Math.round(num(2)),
      bounceRate: num(3),
      averageSessionDuration: num(4),
    },
    status: "ok",
    message: "GA4 Data API",
  };
}
