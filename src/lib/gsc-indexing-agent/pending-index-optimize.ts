/**
 * Pending Index Optimizer AI — diagnose + improve blogs that are not yet Indexed.
 *
 * Google does NOT offer Indexing API for general websites/blogs.
 * "Request indexing" here = URL Inspection refresh + crawlability fixes
 * (same hard limit as GSC Indexing Agent: read-only inspection quota).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import {
  parseBlogPostFromFirestore,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import {
  blogGscIndexLabel,
  explainIndexStatus,
} from "@/lib/admin-content-overview";
import { auditUrl, type AuditResult } from "./audit";
import {
  applyBlogRankingUpdate,
  suggestBlogRankingUpdate,
  type RankingImproveFields,
  type RankingImproveMeta,
} from "./ranking-improve";
import { enqueueInspection, processInspectionQueue } from "./inspect-queue";
import {
  normalizeSiteUrl,
  siteOrigin,
  urlIdFromNormalized,
} from "./normalize-url";
import { getSeoSettings } from "./settings";
import { getSeoUrl, listSeoUrls, logAction, upsertSeoUrl } from "./store";
import type { SeoUrlRecord } from "./types";
import { assertSafeAuditUrl } from "./ssrf";

export type PendingBlogItem = {
  slug: string;
  title: string;
  url: string;
  urlId: string;
  indexStatus: string;
  indexLabel: "pending" | "not_indexed";
  coverageState: string | null;
  why: string;
  improveHint: string;
  published: boolean;
};

export type SeoScoreBreakdown = {
  score: number;
  checks: { id: string; ok: boolean; label: string; detail?: string }[];
};

export type SchemaVerifyResult = {
  ok: boolean;
  hasJsonLd: boolean;
  hasBlogPosting: boolean;
  hasFaqPage: boolean;
  hasBreadcrumb: boolean;
  detail: string;
};

export type PendingDiagnoseResult = {
  slug: string;
  url: string;
  indexStatus: string;
  indexLabel: string;
  why: string;
  improveHint: string;
  seo: SeoScoreBreakdown;
  audit: {
    httpStatus: number | null;
    title: string | null;
    metaDescription: string | null;
    wordCount: number;
    noindex: boolean;
    issueCodes: string[];
  };
  internalLinks: {
    found: string[];
    missingSuggested: string[];
    markdownSuggestions: string[];
  };
  schema: SchemaVerifyResult;
  faqCount: number;
};

async function resolveBlogRecord(slug: string): Promise<SeoUrlRecord | null> {
  const normalized = normalizeSiteUrl(`${siteOrigin()}/blog/${slug}`);
  if (normalized) {
    const byId = await getSeoUrl(urlIdFromNormalized(normalized));
    if (byId?.pageType === "blog" && byId.contentId === slug) return byId;
  }
  const urls = await listSeoUrls({ limit: 2000, ignoreReadPause: true });
  return (
    urls.find((u) => u.pageType === "blog" && u.contentId === slug) ?? null
  );
}

async function loadBlog(slug: string): Promise<BlogPostFirestore> {
  const db = getAdminDb();
  if (!db) throw new Error("Server not configured");
  const snap = await db.collection("blogPosts").doc(slug).get();
  if (!snap.exists) throw new Error(`Blog not found: ${slug}`);
  const post = parseBlogPostFromFirestore(
    slug,
    snap.data() as Record<string, unknown>,
    { requirePublished: false },
  );
  if (!post) throw new Error(`Could not parse blog: ${slug}`);
  return post;
}

function countInternalLinks(content: string): {
  found: string[];
  missingSuggested: string[];
  markdownSuggestions: string[];
} {
  const targets = [
    { path: "/booking", label: "Book scuba diving" },
    { path: "/services", label: "All services" },
    { path: "/services/scuba-diving", label: "Scuba diving in Goa" },
    { path: "/offers", label: "Current offers" },
    { path: "/contact", label: "Contact us" },
    { path: "/gallery", label: "Dive gallery" },
  ];
  const lower = content.toLowerCase();
  const found: string[] = [];
  const missingSuggested: string[] = [];
  const markdownSuggestions: string[] = [];
  for (const t of targets) {
    if (lower.includes(`](${t.path}`) || lower.includes(`href="${t.path}`)) {
      found.push(t.path);
    } else {
      missingSuggested.push(t.path);
      markdownSuggestions.push(`[${t.label}](${t.path})`);
    }
  }
  return { found, missingSuggested, markdownSuggestions };
}

function scoreFromChecks(
  checks: SeoScoreBreakdown["checks"],
): SeoScoreBreakdown {
  const okN = checks.filter((c) => c.ok).length;
  const score = Math.round((okN / Math.max(1, checks.length)) * 100);
  return { score, checks };
}

async function verifyLiveSchema(url: string): Promise<SchemaVerifyResult> {
  const safe = assertSafeAuditUrl(url);
  if (!safe.ok) {
    return {
      ok: false,
      hasJsonLd: false,
      hasBlogPosting: false,
      hasFaqPage: false,
      hasBreadcrumb: false,
      detail: safe.error,
    };
  }
  try {
    const res = await fetch(safe.url, {
      headers: { "User-Agent": "BookScubaGoa-PendingOptimizer/1.0" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    const html = await res.text();
    const scripts = [
      ...html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      ),
    ].map((m) => m[1] ?? "");
    const blob = scripts.join("\n").toLowerCase();
    const hasJsonLd = scripts.length > 0;
    const hasBlogPosting = blob.includes("blogposting");
    const hasFaqPage = blob.includes("faqpage");
    const hasBreadcrumb = blob.includes("breadcrumblist");
    const ok = hasJsonLd && hasBlogPosting;
    return {
      ok,
      hasJsonLd,
      hasBlogPosting,
      hasFaqPage,
      hasBreadcrumb,
      detail: ok
        ? `JSON-LD ok (BlogPosting${hasFaqPage ? " + FAQPage" : ""}${hasBreadcrumb ? " + Breadcrumb" : ""}).`
        : hasJsonLd
          ? "JSON-LD found but BlogPosting type missing — publish page should emit BlogPosting."
          : "No application/ld+json found on live HTML.",
    };
  } catch (e) {
    return {
      ok: false,
      hasJsonLd: false,
      hasBlogPosting: false,
      hasFaqPage: false,
      hasBreadcrumb: false,
      detail: e instanceof Error ? e.message : "Schema fetch failed",
    };
  }
}

function buildSeoScore(input: {
  post: BlogPostFirestore;
  audit: AuditResult;
  links: ReturnType<typeof countInternalLinks>;
  schema: SchemaVerifyResult;
}): SeoScoreBreakdown {
  const metaLen = (input.audit.metaDescription || input.post.metaDescription || "")
    .length;
  const titleLen = (input.audit.title || input.post.title || "").length;
  const faqN = input.post.faqs?.length ?? 0;
  const checks: SeoScoreBreakdown["checks"] = [
    {
      id: "http",
      ok: input.audit.httpStatus === 200,
      label: "HTTP 200",
      detail: input.audit.httpStatus != null ? `Status ${input.audit.httpStatus}` : "No status",
    },
    {
      id: "noindex",
      ok: !input.audit.noindex,
      label: "Indexable (no noindex)",
    },
    {
      id: "title",
      ok: titleLen >= 20 && titleLen <= 70,
      label: "Title length ~20–70 chars",
      detail: `${titleLen} chars`,
    },
    {
      id: "meta",
      ok: metaLen >= 120 && metaLen <= 165,
      label: "Meta description ~120–160 chars",
      detail: `${metaLen} chars`,
    },
    {
      id: "words",
      ok: input.audit.wordCount >= 400 || input.post.content.split(/\s+/).length >= 400,
      label: "Body ≥ ~400 words",
      detail: `audit ${input.audit.wordCount} words`,
    },
    {
      id: "internal_links",
      ok: input.links.found.length >= 2,
      label: "≥2 key internal links",
      detail: `found ${input.links.found.join(", ") || "none"}`,
    },
    {
      id: "faq",
      ok: faqN >= 3,
      label: "≥3 FAQs",
      detail: `${faqN} FAQs`,
    },
    {
      id: "schema",
      ok: input.schema.hasBlogPosting,
      label: "BlogPosting JSON-LD on live page",
      detail: input.schema.detail,
    },
    {
      id: "published",
      ok: input.post.published === true,
      label: "Published live",
    },
  ];
  return scoreFromChecks(checks);
}

/** List blogs needing index attention (pending + not indexed). */
export async function listPendingIndexBlogs(
  limit = 40,
  options?: { includeAiFixed?: boolean },
): Promise<{
  items: PendingBlogItem[];
  inspectionQuota: { used: number; daily: number; remaining: number };
  hiddenAiFixedCount: number;
}> {
  const settings = await getSeoSettings();
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const used =
    settings.inspectionsQuotaDate === day ? settings.inspectionsUsedToday : 0;
  const remaining = Math.max(0, settings.inspectionDailyQuota - used);

  const urls = await listSeoUrls({ limit: 2000, ignoreReadPause: true });
  const blogs = urls.filter(
    (u) =>
      u.pageType === "blog" &&
      u.status === "active" &&
      u.eligibleForIndexing !== false,
  );

  const items: PendingBlogItem[] = [];
  let hiddenAiFixedCount = 0;
  for (const u of blogs) {
    const label = blogGscIndexLabel(u.indexStatus);
    if (label === "indexed") continue;
    // After AI fix+apply, hide from default queue so admin can work the next batch.
    if (!options?.includeAiFixed && u.autoFixStatus === "applied") {
      hiddenAiFixedCount += 1;
      continue;
    }
    const { why, improveHint } = explainIndexStatus(
      u.indexStatus,
      u.coverageState ?? null,
    );
    let title = u.contentId;
    try {
      const post = await loadBlog(u.contentId);
      if (!post.published) continue;
      title = post.title;
    } catch {
      /* skip missing docs */
      continue;
    }
    items.push({
      slug: u.contentId,
      title,
      url: u.url,
      urlId: u.id,
      indexStatus: u.indexStatus,
      indexLabel: label,
      coverageState: u.coverageState ?? null,
      why,
      improveHint,
      published: true,
    });
    if (items.length >= limit) break;
  }

  items.sort((a, b) => {
    if (a.indexLabel !== b.indexLabel) {
      return a.indexLabel === "not_indexed" ? -1 : 1;
    }
    return a.slug.localeCompare(b.slug);
  });

  return {
    items,
    inspectionQuota: {
      used,
      daily: settings.inspectionDailyQuota,
      remaining,
    },
    hiddenAiFixedCount,
  };
}

export async function diagnosePendingBlog(
  slug: string,
): Promise<PendingDiagnoseResult> {
  const s = slug.trim();
  const post = await loadBlog(s);
  const record = await resolveBlogRecord(s);
  const url = record?.url ?? `${siteOrigin()}/blog/${s}`;
  const indexStatus = record?.indexStatus ?? "UNKNOWN";
  const indexLabel = blogGscIndexLabel(indexStatus);
  const { why, improveHint } = explainIndexStatus(
    indexStatus,
    record?.coverageState ?? null,
  );

  let audit: AuditResult;
  if (record) {
    audit = await auditUrl(record);
  } else {
    audit = {
      httpStatus: null,
      title: post.title,
      metaDescription: post.metaDescription,
      canonical: null,
      robotsMeta: null,
      h1: null,
      wordCount: post.content.split(/\s+/).filter(Boolean).length,
      noindex: false,
      contentHash: null,
      issues: [],
    };
  }

  const links = countInternalLinks(post.content);
  const schema = await verifyLiveSchema(url);
  const seo = buildSeoScore({ post, audit, links, schema });

  return {
    slug: s,
    url,
    indexStatus,
    indexLabel,
    why,
    improveHint,
    seo,
    audit: {
      httpStatus: audit.httpStatus,
      title: audit.title,
      metaDescription: audit.metaDescription,
      wordCount: audit.wordCount,
      noindex: audit.noindex,
      issueCodes: audit.issues.map((i) => i.code),
    },
    internalLinks: links,
    schema,
    faqCount: post.faqs?.length ?? 0,
  };
}

export async function suggestPendingBlogOptimize(slug: string): Promise<{
  diagnose: PendingDiagnoseResult;
  fields: RankingImproveFields;
  current: RankingImproveFields;
  improve: RankingImproveMeta;
}> {
  const diagnose = await diagnosePendingBlog(slug);
  const suggested = await suggestBlogRankingUpdate(slug);
  return {
    diagnose,
    fields: suggested.fields,
    current: suggested.current,
    improve: suggested.improve,
  };
}

export async function applyPendingBlogOptimize(
  slug: string,
  fields: RankingImproveFields,
): Promise<{
  slug: string;
  ok: true;
  improve: RankingImproveMeta;
  diagnose: PendingDiagnoseResult;
}> {
  const applied = await applyBlogRankingUpdate(slug, fields);
  const diagnose = await diagnosePendingBlog(slug);
  return { slug, ok: true, improve: applied.improve, diagnose };
}

/**
 * Queue / run URL Inspection (NOT Google Indexing API).
 * immediate=true processes the inspection queue (uses daily quota).
 */
export async function requestIndexRecheck(
  slugs: string[],
  options?: { immediate?: boolean; maxImmediate?: number },
): Promise<{
  queued: string[];
  inspected: Array<{
    slug: string;
    indexStatus: string;
    coverageState: string | null;
  }>;
  skipped: Array<{ slug: string; reason: string }>;
  note: string;
}> {
  const note =
    "Google URL Inspection refreshes index STATUS only — it does not submit an Indexing API request (not allowed for blog pages). Strong content + sitemap + internal links still drive indexing.";

  const queued: string[] = [];
  const inspected: Array<{
    slug: string;
    indexStatus: string;
    coverageState: string | null;
  }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];

  for (const raw of slugs) {
    const slug = raw.trim();
    if (!slug) continue;
    try {
      const post = await loadBlog(slug);
      if (!post.published) {
        skipped.push({ slug, reason: "Not published" });
        continue;
      }
      let record = await resolveBlogRecord(slug);
      if (!record) {
        const absolute = `${siteOrigin()}/blog/${slug}`;
        const normalized = normalizeSiteUrl(absolute);
        if (!normalized) {
          skipped.push({ slug, reason: "Invalid URL" });
          continue;
        }
        const now = new Date().toISOString();
        const id = urlIdFromNormalized(normalized);
        record = {
          id,
          url: normalized,
          normalizedUrl: normalized,
          canonicalUrl: normalized,
          pageType: "blog",
          contentId: slug,
          locale: "en",
          status: "active",
          publishedAt: post.publishedAt ?? now,
          contentUpdatedAt: post.updatedAt ?? now,
          discoveredAt: now,
          lastSitemapIncludedAt: null,
          sitemapName: "blog",
          eligibleForIndexing: true,
          noindexDetected: false,
          robotsBlocked: false,
          httpStatus: null,
          contentHash: null,
          lastInspectionAt: null,
          nextInspectionAt: now,
          inspectionPriority: 1,
          indexStatus: "PENDING_INSPECTION",
          coverageState: null,
          crawlState: null,
          googleCanonical: null,
          userCanonical: normalized,
          lastCrawlTime: null,
          referringUrlsCount: 0,
          internalLinksIn: 0,
          internalLinksOut: 0,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          averagePosition: 0,
          rankingStatus: "UNKNOWN",
          issueCodes: [],
          recommendationCodes: [],
          autoFixStatus: "none",
          approvalStatus: "none",
          lastActionAt: null,
          retryCount: 0,
          siteId: new URL(siteOrigin()).hostname.replace(/^www\./, ""),
          createdAt: now,
          updatedAt: now,
        };
        await upsertSeoUrl(record);
      }
      await enqueueInspection(record, 1, 0);
      queued.push(slug);
      await logAction({
        urlId: record.id,
        url: record.url,
        action: "pending_optimizer_reinspect_queued",
        detail: `Queued from Pending Index Optimizer for /blog/${slug}`,
        ok: true,
      });
    } catch (e) {
      skipped.push({
        slug,
        reason: e instanceof Error ? e.message : "Failed",
      });
    }
  }

  if (options?.immediate && queued.length > 0) {
    const max = Math.min(options.maxImmediate ?? 5, queued.length, 8);
    await processInspectionQueue(max);
    for (const slug of queued.slice(0, max)) {
      const record = await resolveBlogRecord(slug);
      if (!record) continue;
      inspected.push({
        slug,
        indexStatus: record.indexStatus,
        coverageState: record.coverageState ?? null,
      });
    }
  }

  return { queued, inspected, skipped, note };
}

/**
 * Full auto pass for one pending blog: diagnose → AI suggest → apply → reinspect queue.
 * Use sparingly (OpenAI + GSC quota).
 */
export async function autoOptimizePendingBlog(
  slug: string,
  options?: { inspect?: boolean },
): Promise<{
  diagnoseBefore: PendingDiagnoseResult;
  diagnoseAfter: PendingDiagnoseResult;
  improve: RankingImproveMeta;
  reinspect: Awaited<ReturnType<typeof requestIndexRecheck>> | null;
  published: boolean;
}> {
  return aiFixPendingBlog(slug, { inspect: options?.inspect !== false });
}

/**
 * AI fix + save/update live blog (keeps published). Optional URL Inspection.
 * Prefer inspect:false for bulk runs — then inspect separately within daily quota.
 */
export async function aiFixPendingBlog(
  slug: string,
  options?: { inspect?: boolean },
): Promise<{
  diagnoseBefore: PendingDiagnoseResult;
  diagnoseAfter: PendingDiagnoseResult;
  improve: RankingImproveMeta;
  reinspect: Awaited<ReturnType<typeof requestIndexRecheck>> | null;
  published: boolean;
}> {
  const diagnoseBefore = await diagnosePendingBlog(slug);
  const suggested = await suggestBlogRankingUpdate(slug);
  const applied = await applyBlogRankingUpdate(slug, suggested.fields);

  // Ensure the updated post stays live on the site.
  const db = getAdminDb();
  if (!db) throw new Error("Server not configured");
  const ref = db.collection("blogPosts").doc(slug);
  const snap = await ref.get();
  const post = snap.exists
    ? parseBlogPostFromFirestore(slug, snap.data() as Record<string, unknown>, {
        requirePublished: false,
      })
    : null;
  const now = new Date().toISOString();
  if (post && !post.published) {
    await ref.set(
      {
        published: true,
        publishedAt: post.publishedAt || now,
        updatedAt: now,
      },
      { merge: true },
    );
  } else if (post) {
    await ref.set({ updatedAt: now }, { merge: true });
  }

  const record = await resolveBlogRecord(slug);
  if (record) {
    await upsertSeoUrl({
      ...record,
      autoFixStatus: "applied",
      contentUpdatedAt: now,
      lastActionAt: now,
      updatedAt: now,
    });
  }

  const diagnoseAfter = await diagnosePendingBlog(slug);
  let reinspect: Awaited<ReturnType<typeof requestIndexRecheck>> | null = null;
  if (options?.inspect !== false) {
    const settings = await getSeoSettings();
    const day = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const used =
      settings.inspectionsQuotaDate === day ? settings.inspectionsUsedToday : 0;
    const remaining = Math.max(0, settings.inspectionDailyQuota - used);
    if (remaining > 0) {
      reinspect = await requestIndexRecheck([slug], {
        immediate: true,
        maxImmediate: 1,
      });
    }
  }

  return {
    diagnoseBefore,
    diagnoseAfter,
    improve: applied.improve,
    reinspect,
    published: true,
  };
}
