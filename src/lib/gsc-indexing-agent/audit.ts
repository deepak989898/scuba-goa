import { createHash } from "crypto";
import { assertSafeAuditUrl } from "./ssrf";
import { contentHashFromText } from "./inventory";
import type { IssueSeverity, SeoIssue, SeoUrlRecord } from "./types";
import { siteId } from "./normalize-url";
import { saveIssue, upsertSeoUrl, logAction } from "./store";

export type AuditResult = {
  httpStatus: number | null;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string | null;
  wordCount: number;
  noindex: boolean;
  contentHash: string | null;
  issues: Omit<SeoIssue, "id" | "siteId" | "createdAt" | "updatedAt">[];
};

function issueId(urlId: string, code: string): string {
  return createHash("sha256").update(`${urlId}:${code}`).digest("hex").slice(0, 28);
}

export async function auditUrl(record: SeoUrlRecord): Promise<AuditResult> {
  const safe = assertSafeAuditUrl(record.url);
  if (!safe.ok) {
    return {
      httpStatus: null,
      title: null,
      metaDescription: null,
      canonical: null,
      robotsMeta: null,
      h1: null,
      wordCount: 0,
      noindex: false,
      contentHash: null,
      issues: [
        {
          urlId: record.id,
          url: record.url,
          code: "SSRF_BLOCKED",
          severity: "CRITICAL",
          title: "URL blocked from audit",
          detail: safe.error,
          autoFixable: false,
          requiresApproval: false,
          status: "open",
        },
      ],
    };
  }

  let html = "";
  let status: number | null = null;
  try {
    const res = await fetch(safe.url, {
      redirect: "follow",
      headers: { "User-Agent": "BookScubaGoa-GscAgent/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    status = res.status;
    html = await res.text();
  } catch (e) {
    return {
      httpStatus: null,
      title: null,
      metaDescription: null,
      canonical: null,
      robotsMeta: null,
      h1: null,
      wordCount: 0,
      noindex: false,
      contentHash: null,
      issues: [
        {
          urlId: record.id,
          url: record.url,
          code: "FETCH_FAILED",
          severity: "CRITICAL",
          title: "Failed to fetch page",
          detail: e instanceof Error ? e.message : "fetch failed",
          autoFixable: false,
          requiresApproval: false,
          status: "open",
        },
      ],
    };
  }

  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ||
    null;
  const metaDescription =
    html
      .match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      )?.[1]
      ?.trim() ||
    html
      .match(
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      )?.[1]
      ?.trim() ||
    null;
  const canonical =
    html
      .match(
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
      )?.[1]
      ?.trim() ||
    html
      .match(
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
      )?.[1]
      ?.trim() ||
    null;
  const robotsMeta =
    html
      .match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i)?.[1]
      ?.toLowerCase() || null;
  const h1 =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ||
    null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const noindex = Boolean(robotsMeta?.includes("noindex"));
  const hash = contentHashFromText(text.slice(0, 50000));

  const issues: AuditResult["issues"] = [];
  const push = (
    code: string,
    severity: IssueSeverity,
    titleText: string,
    detail: string,
    autoFixable = false,
    requiresApproval = false,
  ) => {
    issues.push({
      urlId: record.id,
      url: record.url,
      code,
      severity,
      title: titleText,
      detail,
      autoFixable,
      requiresApproval,
      status: requiresApproval ? "pending_approval" : "open",
    });
  };

  if (status && status >= 500) {
    push("SERVER_ERROR", "CRITICAL", "Server error", `HTTP ${status}`);
  } else if (status === 404) {
    push("NOT_FOUND", "CRITICAL", "Page not found", "HTTP 404");
  } else if (status && status >= 300 && status < 400) {
    push("REDIRECT_ERROR", "HIGH", "Unexpected redirect", `HTTP ${status}`);
  }

  if (noindex && record.eligibleForIndexing) {
    push(
      "BLOCKED_BY_NOINDEX",
      "CRITICAL",
      "noindex detected on public URL",
      robotsMeta || "noindex",
      false,
      true,
    );
  }

  if (!title) {
    push("MISSING_TITLE", "HIGH", "Missing title", "No <title> found", true);
  } else if (title.length < 15) {
    push("WEAK_TITLE", "MEDIUM", "Very short title", title, false, true);
  }

  if (!metaDescription) {
    push(
      "MISSING_META_DESCRIPTION",
      "MEDIUM",
      "Missing meta description",
      "No meta description",
      true,
    );
  }

  if (!h1) {
    push("MISSING_H1", "HIGH", "Missing H1", "No H1 heading", false, true);
  }

  if (!canonical) {
    push(
      "MISSING_CANONICAL",
      "HIGH",
      "Missing canonical",
      "No link rel=canonical",
      true,
    );
  } else if (normalizeLoose(canonical) !== normalizeLoose(record.canonicalUrl)) {
    push(
      "WRONG_CANONICAL",
      "CRITICAL",
      "Canonical mismatch",
      `Found ${canonical}, expected ${record.canonicalUrl}`,
      false,
      true,
    );
  }

  if (wordCount > 0 && wordCount < 200 && record.pageType === "blog") {
    push(
      "THIN_CONTENT",
      "HIGH",
      "Thin content",
      `Approx ${wordCount} words`,
      false,
      true,
    );
  }

  return {
    httpStatus: status,
    title,
    metaDescription,
    canonical,
    robotsMeta,
    h1,
    wordCount,
    noindex,
    contentHash: hash,
    issues,
  };
}

function normalizeLoose(u: string): string {
  try {
    const x = new URL(u);
    let p = x.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return `${x.origin}${p}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

export async function runTechnicalAuditForUrl(
  record: SeoUrlRecord,
): Promise<{ issues: number; httpStatus: number | null }> {
  const result = await auditUrl(record);
  const now = new Date().toISOString();
  const issueCodes = result.issues.map((i) => i.code);

  for (const issue of result.issues) {
    const id = issueId(record.id, issue.code);
    await saveIssue({
      ...issue,
      id,
      siteId: siteId(),
      createdAt: now,
      updatedAt: now,
    });
  }

  await upsertSeoUrl({
    ...record,
    httpStatus: result.httpStatus,
    contentHash: result.contentHash,
    noindexDetected: result.noindex,
    userCanonical: result.canonical || record.userCanonical,
    issueCodes,
    updatedAt: now,
    lastActionAt: now,
  });

  await logAction({
    urlId: record.id,
    url: record.url,
    action: "technical_audit",
    detail: `${result.issues.length} issues; HTTP ${result.httpStatus}`,
    ok: true,
  });

  return { issues: result.issues.length, httpStatus: result.httpStatus };
}
