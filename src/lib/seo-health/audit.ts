import { getAdminDb } from "@/lib/firebase-admin";
import { fetchGa4DailySnapshot } from "@/lib/ai-analytics/connectors/ga4";
import { fetchSearchConsoleDailySnapshot } from "@/lib/ai-analytics/connectors/search-console";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import { SITE_URL } from "@/lib/constants";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import type { SeoHealthIssue, SeoHealthReportDoc } from "@/lib/seo-health/types";

/** Public routes that must have canonical URLs in metadata. */
const CANONICAL_REQUIRED = [
  "/",
  "/about",
  "/contact",
  "/booking",
  "/services",
  "/blog",
  "/guides",
  "/offers",
  "/gallery",
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-cancellation",
];

/** Routes that must NOT appear in sitemap.xml. */
const SITEMAP_BLOCKLIST = ["/admin/login", "/admin/"];

export async function runSeoHealthAudit(): Promise<SeoHealthReportDoc> {
  const siteUrl = SITE_URL.replace(/\/$/, "");
  const now = new Date().toISOString();
  const reportId = istYesterdayString();
  const issues: SeoHealthIssue[] = [];
  const recommendations: string[] = [];
  const manualSteps: string[] = [];

  let sitemapUrlCount = 0;
  try {
    const sitemapRes = await fetch(`${siteUrl}/sitemap.xml`, {
      next: { revalidate: 0 },
    });
    const xml = await sitemapRes.text();
    if (!sitemapRes.ok) {
      issues.push({
        severity: "critical",
        category: "sitemap",
        message: `sitemap.xml returned HTTP ${sitemapRes.status}`,
        fix: "Ensure /sitemap.xml is publicly accessible on production.",
      });
    } else {
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      sitemapUrlCount = locs.length;
      for (const loc of locs) {
        if (SITEMAP_BLOCKLIST.some((b) => loc.includes(b))) {
          issues.push({
            severity: "critical",
            category: "sitemap",
            message: `Admin URL in sitemap: ${loc}`,
            fix: "Remove /admin/* paths from sitemap.ts",
            path: loc,
          });
        }
      }
      if (!locs.some((u) => u === `${siteUrl}/` || u === `${siteUrl}`)) {
        issues.push({
          severity: "warning",
          category: "sitemap",
          message: "Homepage missing from sitemap",
          fix: "Add '' path to sitemap staticPaths",
        });
      }
    }
  } catch (e) {
    issues.push({
      severity: "critical",
      category: "sitemap",
      message: `Could not fetch sitemap: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  try {
    const robotsRes = await fetch(`${siteUrl}/robots.txt`, { next: { revalidate: 0 } });
    const robots = await robotsRes.text();
    if (!robotsRes.ok) {
      issues.push({
        severity: "critical",
        category: "robots",
        message: "robots.txt not reachable",
      });
    } else {
      if (!robots.includes("Sitemap:")) {
        issues.push({
          severity: "warning",
          category: "robots",
          message: "robots.txt missing Sitemap directive",
          fix: "Add sitemap URL in src/app/robots.ts",
        });
      }
      if (!robots.includes("Disallow: /admin/")) {
        issues.push({
          severity: "warning",
          category: "robots",
          message: "Admin area not disallowed in robots.txt",
        });
      }
    }
  } catch {
    issues.push({ severity: "critical", category: "robots", message: "Could not fetch robots.txt" });
  }

  const pagesMissingCanonical: string[] = [];
  for (const path of CANONICAL_REQUIRED) {
    const url = path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      const html = await res.text();
      const canonicalMatch =
        html.match(/rel="canonical"\s+href="([^"]+)"/i) ||
        html.match(/href="([^"]+)"\s+rel="canonical"/i);
      if (!canonicalMatch) {
        pagesMissingCanonical.push(path);
        issues.push({
          severity: path === "/" || path === "/booking" ? "critical" : "warning",
          category: "canonical",
          message: `Missing canonical tag on ${path}`,
          fix: "Add alternates.canonical in page metadata",
          path,
        });
      }
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      const title = titleMatch?.[1]?.trim() ?? "";
      if (title.length < 20) {
        issues.push({
          severity: "warning",
          category: "metadata",
          message: `Short or missing title on ${path} (${title.length} chars)`,
          path,
        });
      }
      if (!html.includes("application/ld+json")) {
        issues.push({
          severity: path === "/" || path === "/booking" ? "warning" : "info",
          category: "schema",
          message: `No JSON-LD schema detected on ${path}`,
          fix: "Add FAQPage or LocalBusiness schema",
          path,
        });
      }
    } catch {
      pagesMissingCanonical.push(path);
    }
  }

  const gsc7 = await fetchGscLast7Days();
  let gscStatus = gsc7.status;
  let gscMessage = gsc7.message;
  if (gsc7.status === "error") {
    issues.push({
      severity: "critical",
      category: "gsc",
      message: gsc7.message,
      fix: "Add Firebase service account email as Owner in Google Search Console → Settings → Users",
    });
    manualSteps.push(
      "Google Search Console → add property https://bookscubagoa.com → verify → add service account email with Full access",
    );
  } else if (gsc7.impressions === 0) {
    issues.push({
      severity: "warning",
      category: "indexing",
      message: "0 Google Search impressions in the last 7 days — site may not be indexed or has no ranking yet",
      fix: "Submit sitemap in GSC and request indexing for homepage + /booking",
    });
    manualSteps.push("Search Console → Sitemaps → submit https://bookscubagoa.com/sitemap.xml");
    manualSteps.push("URL Inspection → enter https://bookscubagoa.com/ → Request indexing");
    manualSteps.push("URL Inspection → enter https://bookscubagoa.com/booking → Request indexing");
  }

  const ga4 = await fetchGa4DailySnapshot(reportId);
  const ga4Status = ga4.status;
  const ga4Message = ga4.message;
  if (ga4.status === "skipped" || ga4.status === "error") {
    issues.push({
      severity: "warning",
      category: "ga4",
      message: ga4.message,
      fix: "Set GOOGLE_ANALYTICS_PROPERTY_ID and add service account as GA4 Viewer",
    });
  }

  if (!process.env.GOOGLE_SITE_VERIFICATION?.trim()) {
    issues.push({
      severity: "info",
      category: "indexing",
      message: "GOOGLE_SITE_VERIFICATION env not set (optional meta tag)",
    });
  }

  recommendations.push(
    "Post on Instagram/Facebook/WhatsApp status daily — zero traffic until Google ranks you takes weeks",
  );
  recommendations.push(
    "Create Google Business Profile for Baga office with website link bookscubagoa.com",
  );
  recommendations.push("Run SEO AI weekly at /admin/seo-agent and approve meta updates");
  recommendations.push("Publish 2–3 FAQ-rich blogs per month via Blog Automation");

  const critical = issues.filter((i) => i.severity === "critical").length;
  const warning = issues.filter((i) => i.severity === "warning").length;
  const healthScore = Math.max(0, 100 - critical * 15 - warning * 5);

  const doc: SeoHealthReportDoc = {
    reportId,
    generatedAt: now,
    siteUrl,
    healthScore,
    sitemapUrlCount,
    issues,
    pagesChecked: CANONICAL_REQUIRED.length,
    pagesMissingCanonical,
    gscStatus,
    gscMessage,
    gscClicks7d: gsc7.clicks,
    gscImpressions7d: gsc7.impressions,
    ga4Status,
    ga4Message,
    recommendations,
    manualSteps,
  };

  const db = getAdminDb();
  if (db) {
    await db.collection("seoHealthReports").doc(reportId).set(stripUndefinedDeep(doc));
  }

  return doc;
}

async function fetchGscLast7Days(): Promise<{
  status: string;
  message: string;
  clicks: number;
  impressions: number;
}> {
  const end = istYesterdayString();
  const startDate = new Date(end);
  startDate.setDate(startDate.getDate() - 6);
  const start = startDate.toISOString().slice(0, 10);

  const token = await import("@/lib/ai-analytics/connectors/google-auth").then((m) =>
    m.getGoogleApiAccessToken(
      ["https://www.googleapis.com/auth/webmasters.readonly"],
      "search-console",
    ),
  );
  if (!token) {
    return { status: "error", message: "Google API token failed — check FIREBASE_SERVICE_ACCOUNT_KEY", clicks: 0, impressions: 0 };
  }

  const siteUrl =
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() ||
    `${SITE_URL.replace(/\/$/, "")}/`;
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
        startDate: start,
        endDate: end,
        dimensions: [],
        rowLimit: 1,
      }),
    },
  );

  const json = (await res.json().catch(() => ({}))) as {
    rows?: { clicks?: number; impressions?: number }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      status: "error",
      message: json.error?.message ?? `GSC API ${res.status}`,
      clicks: 0,
      impressions: 0,
    };
  }

  const row = json.rows?.[0] ?? {};
  return {
    status: "ok",
    message: "Search Console API connected",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
  };
}
