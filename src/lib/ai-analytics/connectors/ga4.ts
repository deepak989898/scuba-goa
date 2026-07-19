import { getGoogleApiAccessToken, getGoogleServiceAccountEmail } from "@/lib/ai-analytics/connectors/google-auth";
import type { Ga4DailySnapshot } from "@/lib/ai-analytics/types";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

function propertyIdHint(): string {
  const id = process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.trim();
  if (!id) {
    return "Set GOOGLE_ANALYTICS_PROPERTY_ID to the numeric ID (e.g. 529273353 from GA4 Admin URL …/p529273353/…).";
  }
  return `Property ID in use: ${id}`;
}

function saHint(): string {
  const email = getGoogleServiceAccountEmail("analytics");
  return email
    ? `Service account: ${email}`
    : "No service account JSON found (FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON).";
}

export async function fetchGa4DailySnapshot(
  dateIst: string,
): Promise<{
  data: Ga4DailySnapshot | null;
  status: "ok" | "skipped" | "error";
  message: string;
}> {
  return fetchGa4DateRange(dateIst, dateIst);
}

/** Inclusive GA4 date range (YYYY-MM-DD). */
export async function fetchGa4DateRange(
  startDateIst: string,
  endDateIst: string,
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
      message: `Set GOOGLE_ANALYTICS_PROPERTY_ID (numeric GA4 property ID). ${saHint()}`,
    };
  }

  const token = await getGoogleApiAccessToken(SCOPES, "analytics");
  if (!token) {
    return {
      data: null,
      status: "error",
      message: `Could not obtain Google API token with analytics.readonly scope. Check FIREBASE_SERVICE_ACCOUNT_KEY JSON. ${saHint()}`,
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
        dateRanges: [{ startDate: startDateIst, endDate: endDateIst }],
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
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    const apiMsg = json.error?.message ?? res.statusText;
    const lower = apiMsg.toLowerCase();
    let fix = "";
    if (lower.includes("insufficient") && lower.includes("scope")) {
      fix =
        " Enable Google Analytics Data API on the same GCP project as the service account (APIs & Services → Library → “Google Analytics Data API” → Enable), then redeploy. Scope used: analytics.readonly.";
    } else if (lower.includes("permission") || lower.includes("denied")) {
      fix =
        " In GA4 Admin → Property access management, add the service account email as Viewer (or Analyst), wait a few minutes, re-run.";
    } else {
      fix = " Confirm property ID and Viewer access for the service account.";
    }
    return {
      data: null,
      status: "error",
      message: `${apiMsg}. ${saHint()}. ${propertyIdHint()}.${fix}`,
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
    message: `GA4 Data API OK · ${saHint()} · ${startDateIst} → ${endDateIst}`,
  };
}
