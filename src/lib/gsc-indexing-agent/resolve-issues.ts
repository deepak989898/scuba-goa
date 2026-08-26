import { getPostBySlug } from "@/data/blog-posts";
import { blogPostToFirestorePayload, parseBlogPostFromFirestore } from "@/lib/blog-firestore";
import { generateBlogDraftOnly } from "@/lib/blog-automation/generate-blog-draft";
import { regenerateBlogPostFeaturedImage } from "@/lib/blog-automation/regenerate-blog-image";
import { publishBlogPostNow } from "@/lib/blog-automation/scheduled-posts";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getPublishedBlogPostBySlug,
  listPublishedBlogSlugsServer,
} from "@/lib/blog-posts-server";
import { getBlogPostBySlugMerged } from "@/lib/blog-posts-unified";
import { findBlogRedirectDestination } from "@/lib/blog-redirects";
import { runTechnicalAuditForUrl } from "./audit";
import { enqueueInspection } from "./inspect-queue";
import { onPublicUrlPublished } from "./publish-hook";
import {
  getSeoBlogRedirect,
  saveSeoBlogRedirect,
} from "./seo-blog-redirects";
import {
  getSeoIssue,
  getSeoUrl,
  listOpenIssues,
  listOpenIssuesForUrl,
  logAction,
  markUrlIssuesFixed,
  upsertSeoUrl,
} from "./store";
import type { SeoIssue, SeoUrlRecord } from "./types";

export type ResolveIssueResult = {
  ok: boolean;
  issueId?: string;
  url?: string;
  action?: string;
  detail?: string;
  slug?: string;
  redirectTo?: string;
  error?: string;
};

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferServiceSlugFromSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (/night.?club|russian|nightclub|disco|pub/.test(s)) return "night-club";
  if (/casino/.test(s)) return "casino";
  if (/water.?sport|parasail|jet\s*ski/.test(s)) return "water-sports";
  if (/dudhsagar|waterfall/.test(s)) return "dudhsagar";
  if (/bungee/.test(s)) return "bungee-jumping";
  if (/flyboard/.test(s)) return "flyboarding";
  if (/dolphin/.test(s)) return "dolphin-trip";
  return "scuba-diving";
}

function parseBlogFromUrl(url: string): { slug: string; path: string } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/blog\/([^/]+)\/?$/i);
    if (!m?.[1]) return null;
    const slug = m[1].trim();
    return { slug, path: `/blog/${slug}` };
  } catch {
    return null;
  }
}

async function findBestBlogRedirectTarget(brokenSlug: string): Promise<string> {
  const slugs = await listPublishedBlogSlugsServer();
  const tokens = brokenSlug.split("-").filter((t) => t.length > 2);
  let bestSlug = "";
  let bestScore = 0;
  for (const s of slugs) {
    let score = 0;
    for (const t of tokens) {
      if (s.includes(t)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSlug = s;
    }
  }
  if (bestSlug) return `/blog/${bestSlug}`;
  const fallback =
    slugs.find((s) => s.includes("top-5-scuba")) ||
    slugs.find((s) => s.includes("scuba")) ||
    slugs[0];
  return fallback ? `/blog/${fallback}` : "/blog";
}

async function publishOrGenerateBlogAtSlug(
  slug: string,
  path: string,
): Promise<{ ok: true; action: string; slug: string } | { ok: false; error: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Database not configured" };

  const published = await getPublishedBlogPostBySlug(slug);
  if (published || getPostBySlug(slug)) {
    return { ok: true, action: "already_live", slug };
  }

  const snap = await db.collection("blogPosts").doc(slug).get();
  if (snap.exists) {
    const post = parseBlogPostFromFirestore(slug, snap.data() as Record<string, unknown>, {
      requirePublished: false,
    });
    if (post && !post.featuredImageUrl?.trim()) {
      await regenerateBlogPostFeaturedImage(slug, {
        title: post.title,
        useStock: true,
      });
    }
    const pub = await publishBlogPostNow(slug);
    if (!pub.ok) return { ok: false, error: pub.error };
    return { ok: true, action: "published_draft", slug };
  }

  const title = humanizeSlug(slug);
  const serviceSlug = inferServiceSlugFromSlug(slug);
  const draft = await generateBlogDraftOnly({
    forceTitle: title,
    forceServiceSlug: serviceSlug,
    forceSlug: slug,
    useStockImages: true,
  });
  if (!draft.ok) return { ok: false, error: draft.error };

  const now = new Date().toISOString();
  await db.collection("blogPosts").doc(draft.post.slug).set(
    blogPostToFirestorePayload({
      ...draft.post,
      published: false,
      updatedAt: now,
    }),
    { merge: false },
  );

  if (draft.post.slug !== slug) {
    const dest = `/blog/${draft.post.slug}`;
    await saveSeoBlogRedirect({
      source: path,
      destination: dest,
      reason: "gsc_resolve_slug_conflict",
    });
    const pub = await publishBlogPostNow(draft.post.slug);
    if (!pub.ok) return { ok: false, error: pub.error };
    return { ok: true, action: "generated_redirected", slug: draft.post.slug };
  }

  const pub = await publishBlogPostNow(draft.post.slug);
  if (!pub.ok) return { ok: false, error: pub.error };
  return { ok: true, action: "generated_and_published", slug: draft.post.slug };
}

async function applyBlogRedirect(
  sourcePath: string,
  destinationPath: string,
  reason: string,
): Promise<void> {
  await saveSeoBlogRedirect({
    source: sourcePath,
    destination: destinationPath,
    reason,
  });
}

async function finalizeUrlResolve(
  record: SeoUrlRecord,
  detail: string,
): Promise<void> {
  await markUrlIssuesFixed(record.id);
  const refreshed = await getSeoUrl(record.id);
  if (refreshed) {
    await runTechnicalAuditForUrl(refreshed);
    await enqueueInspection(refreshed, 2, 60);
  }
  await logAction({
    urlId: record.id,
    url: record.url,
    action: "resolve_issue",
    detail,
    ok: true,
  });
}

async function resolveBlogUrlIssues(
  record: SeoUrlRecord,
  blog: { slug: string; path: string },
): Promise<ResolveIssueResult> {
  const { slug, path } = blog;

  const staticDest = findBlogRedirectDestination(path);
  if (staticDest) {
    await finalizeUrlResolve(record, `Static redirect exists → ${staticDest}`);
    return {
      ok: true,
      url: record.url,
      action: "static_redirect",
      redirectTo: staticDest,
      detail: "Redirect already configured in site",
    };
  }

  const fsDest = await getSeoBlogRedirect(path);
  if (fsDest) {
    await finalizeUrlResolve(record, `Firestore redirect → ${fsDest}`);
    return {
      ok: true,
      url: record.url,
      action: "firestore_redirect",
      redirectTo: fsDest,
    };
  }

  const merged = await getBlogPostBySlugMerged(slug);
  if (merged) {
    await onPublicUrlPublished({
      path,
      pageType: "blog",
      contentId: slug,
    });
    await finalizeUrlResolve(record, "Live blog — re-audited");
    return {
      ok: true,
      url: record.url,
      action: "reaudit_live",
      slug,
    };
  }

  const openIssues = await listOpenIssuesForUrl(record.id);
  const codes = new Set(openIssues.map((i) => i.code));
  const is404 =
    record.httpStatus === 404 ||
    codes.has("NOT_FOUND") ||
    codes.has("BLOCKED_BY_NOINDEX");

  const gen = await publishOrGenerateBlogAtSlug(slug, path);
  if (gen.ok) {
    const livePath = `/blog/${gen.slug}`;
    await onPublicUrlPublished({
      path: livePath,
      pageType: "blog",
      contentId: gen.slug,
    });
    if (gen.slug !== slug) {
      await applyBlogRedirect(path, livePath, "gsc_resolve_generated_different_slug");
    }
    await finalizeUrlResolve(
      record,
      `Blog resolved: ${gen.action} (${gen.slug})`,
    );
    return {
      ok: true,
      url: record.url,
      action: gen.action,
      slug: gen.slug,
      redirectTo: gen.slug !== slug ? livePath : undefined,
    };
  }

  if (is404) {
    const dest = await findBestBlogRedirectTarget(slug);
    await applyBlogRedirect(path, dest, "gsc_resolve_redirect_fallback");
    await upsertSeoUrl({
      ...record,
      status: "redirect",
      eligibleForIndexing: false,
      updatedAt: new Date().toISOString(),
      lastActionAt: new Date().toISOString(),
    });
    await finalizeUrlResolve(record, `Redirect → ${dest}`);
    return {
      ok: true,
      url: record.url,
      action: "redirect",
      redirectTo: dest,
      detail: gen.error,
    };
  }

  return { ok: false, url: record.url, error: gen.error || "Could not resolve" };
}

async function resolveUrlRecord(record: SeoUrlRecord): Promise<ResolveIssueResult> {
  const blog = parseBlogFromUrl(record.url);
  if (blog) {
    return resolveBlogUrlIssues(record, blog);
  }

  const refreshed = await getSeoUrl(record.id);
  if (refreshed) {
    await runTechnicalAuditForUrl(refreshed);
    await markUrlIssuesFixed(record.id);
    return {
      ok: true,
      url: record.url,
      action: "reaudit",
      detail: "Non-blog URL re-audited",
    };
  }

  return { ok: false, url: record.url, error: "URL record missing" };
}

export async function resolveGscIssue(issueId: string): Promise<ResolveIssueResult> {
  const issue = await getSeoIssue(issueId);
  if (!issue) return { ok: false, error: "Issue not found" };

  const record = await getSeoUrl(issue.urlId);
  if (!record) return { ok: false, error: "URL record not found", issueId };

  const result = await resolveUrlRecord(record);
  return { ...result, issueId };
}

export async function resolveGscIssuesBatch(options?: {
  issueIds?: string[];
  all?: boolean;
  severity?: string;
  max?: number;
}): Promise<{
  ok: boolean;
  results: ResolveIssueResult[];
  resolved: number;
  failed: number;
}> {
  const max = Math.min(30, Math.max(1, options?.max ?? 20));
  let issues: SeoIssue[] = [];

  if (options?.issueIds?.length) {
    for (const id of options.issueIds.slice(0, max)) {
      const issue = await getSeoIssue(id);
      if (issue) issues.push(issue);
    }
  } else if (options?.all) {
    issues = await listOpenIssues(300);
    if (options.severity) {
      issues = issues.filter((i) => i.severity === options.severity);
    }
  }

  const urlIds = [...new Set(issues.map((i) => i.urlId))].slice(0, max);
  const results: ResolveIssueResult[] = [];
  let resolved = 0;
  let failed = 0;

  for (const urlId of urlIds) {
    const record = await getSeoUrl(urlId);
    if (!record) {
      failed += 1;
      results.push({ ok: false, error: "URL record missing" });
      continue;
    }
    const result = await resolveUrlRecord(record);
    results.push(result);
    if (result.ok) resolved += 1;
    else failed += 1;
  }

  return { ok: failed === 0, results, resolved, failed };
}
