import type { SeoIssue, SeoPageAudit, SeoPageRow, SeoQueryRow } from "@/lib/seo-agent/types";

function toAbsUrl(siteUrl: string, page: string): string {
  if (!page) return siteUrl.replace(/\/$/, "") + "/";
  if (page.startsWith("http://") || page.startsWith("https://")) return page;
  const base = siteUrl.replace(/\/$/, "");
  return `${base}${page.startsWith("/") ? "" : "/"}${page}`;
}

export function detectSeoIssues(input: {
  siteUrl: string;
  pages: SeoPageRow[];
  queries: SeoQueryRow[];
  audits: SeoPageAudit[];
}): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const auditByPath = new Map(input.audits.map((a) => [a.path, a]));

  const lowCtr = input.pages
    .filter((p) => p.impressions >= 200 && p.ctr <= 0.008)
    .slice(0, 8);
  if (lowCtr.length) {
    issues.push({
      id: "low_ctr_pages",
      severity: "high",
      category: "ctr",
      title: "Low CTR pages (many impressions, few clicks)",
      detail:
        "These pages appear in Google but people are not clicking. Improve meta title + description using the main keyword and a clear benefit (price, safety, location).",
      affectedUrls: lowCtr.map((p) => toAbsUrl(input.siteUrl, p.page)),
    });
  }

  const declining = input.pages
    .filter((p) => p.impressions >= 100 && (p.clicksDelta < -10 || p.positionDelta > 1.2))
    .slice(0, 8);
  if (declining.length) {
    issues.push({
      id: "declining_pages",
      severity: "high",
      category: "ranking",
      title: "Declining rankings / traffic",
      detail:
        "These pages dropped compared to the previous week. Update content, add FAQs, and strengthen internal links from your top pages.",
      affectedUrls: declining.map((p) => toAbsUrl(input.siteUrl, p.page)),
    });
  }

  const missingSchema = input.pages
    .filter((p) => p.impressions >= 80)
    .map((p) => ({ p, a: auditByPath.get(new URL(toAbsUrl(input.siteUrl, p.page)).pathname) }))
    .filter((x) => x.a && !x.a.hasJsonLdSchema)
    .slice(0, 10);
  if (missingSchema.length) {
    issues.push({
      id: "missing_schema",
      severity: "medium",
      category: "schema",
      title: "Missing JSON-LD schema on important pages",
      detail:
        "Add JSON-LD schema (Service / Product + Offer, FAQ, Breadcrumb). This helps rich results and trust.",
      affectedUrls: missingSchema.map((x) => x.a!.url),
    });
  }

  const thin = input.pages
    .filter((p) => p.impressions >= 80)
    .map((p) => ({ p, a: auditByPath.get(new URL(toAbsUrl(input.siteUrl, p.page)).pathname) }))
    .filter((x) => x.a && x.a.wordCount > 0 && x.a.wordCount < 350)
    .slice(0, 10);
  if (thin.length) {
    issues.push({
      id: "thin_content",
      severity: "medium",
      category: "content",
      title: "Thin content pages",
      detail:
        "These pages have low word count. Add pricing clarity, itinerary, inclusions/exclusions, safety notes, and FAQs to rank better.",
      affectedUrls: thin.map((x) => x.a!.url),
    });
  }

  const weakMeta = input.pages
    .filter((p) => p.impressions >= 120)
    .map((p) => ({ p, a: auditByPath.get(new URL(toAbsUrl(input.siteUrl, p.page)).pathname) }))
    .filter((x) => x.a)
    .filter((x) => {
      const t = x.a!.title?.trim() ?? "";
      return t.length < 22 || t.length > 70;
    })
    .slice(0, 10);
  if (weakMeta.length) {
    issues.push({
      id: "weak_meta_titles",
      severity: "medium",
      category: "meta",
      title: "Weak meta titles (too short/too long)",
      detail:
        "Meta titles should be ~35–60 characters and include the main keyword + Goa + a benefit (price/safety/instant booking).",
      affectedUrls: weakMeta.map((x) => x.a!.url),
    });
  }

  const keywordOpp = input.queries
    .filter((q) => q.impressions >= 200 && q.position >= 8 && q.position <= 20)
    .slice(0, 12);
  if (keywordOpp.length) {
    issues.push({
      id: "missing_keywords",
      severity: "medium",
      category: "keywords",
      title: "Keyword opportunities (high impressions, mid rankings)",
      detail:
        "Create dedicated sections or blog posts for these keywords and link them to your booking page and related service pages.",
      affectedUrls: keywordOpp.flatMap((q) => q.topPages.slice(0, 1).map((p) => toAbsUrl(input.siteUrl, p.page))),
    });
  }

  if (!issues.length) {
    issues.push({
      id: "no_major_seo_issues",
      severity: "low",
      category: "content",
      title: "No critical SEO blockers detected this week",
      detail:
        "Keep publishing and improving internal linking. Watch low-CTR pages and ranking drops weekly.",
      affectedUrls: [],
    });
  }

  return issues.slice(0, 12);
}

