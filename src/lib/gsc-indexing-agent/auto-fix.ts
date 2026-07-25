import { createHash } from "crypto";
import { getSeoSettings, isAutoFixAllowed, isMonitorOnly } from "./settings";
import {
  listOpenIssues,
  listSeoUrls,
  logAction,
  saveApproval,
  saveIssue,
  upsertSeoUrl,
} from "./store";
import { siteId, siteOrigin } from "./normalize-url";
import { enqueueInspection } from "./inspect-queue";
import type { SeoApproval, SeoIssue, SeoUrlRecord } from "./types";

function approvalId(urlId: string, actionType: string): string {
  return createHash("sha256")
    .update(`${urlId}:${actionType}:${Date.now()}`)
    .digest("hex")
    .slice(0, 28);
}

/** Safe auto-fixes only — content rewrites always go to approval. */
export async function processSafeAutoFixes(max = 25): Promise<{
  applied: number;
  approvalsCreated: number;
  skipped: number;
}> {
  const settings = await getSeoSettings();
  if (settings.paused) {
    return { applied: 0, approvalsCreated: 0, skipped: 0 };
  }

  const issues = await listOpenIssues(300);
  const urls = await listSeoUrls({ limit: 1000 });
  const byId = new Map(urls.map((u) => [u.id, u]));

  let applied = 0;
  let approvalsCreated = 0;
  let skipped = 0;

  for (const issue of issues.slice(0, max)) {
    const record = byId.get(issue.urlId);
    if (!record) {
      skipped += 1;
      continue;
    }

    if (isMonitorOnly(settings.agentMode, settings.paused)) {
      skipped += 1;
      continue;
    }

    // Approval-required issues
    if (
      issue.requiresApproval ||
      ["WRONG_CANONICAL", "THIN_CONTENT", "WEAK_TITLE", "BLOCKED_BY_NOINDEX"].includes(
        issue.code,
      )
    ) {
      if (settings.agentMode === "approval_required" || settings.agentMode === "safe_auto_fix") {
        await createApprovalForIssue(issue, record);
        approvalsCreated += 1;
        await saveIssue({
          ...issue,
          status: "pending_approval",
          updatedAt: new Date().toISOString(),
        });
      } else {
        skipped += 1;
      }
      continue;
    }

    if (!isAutoFixAllowed(settings.agentMode, settings.paused)) {
      skipped += 1;
      continue;
    }

    if (issue.code === "MISSING_CANONICAL" && issue.autoFixable) {
      // Safe: mark inventory canonical; page template already emits known canonical.
      // We do not rewrite HTML files — only inventory + reinspect + sitemap flags.
      await upsertSeoUrl({
        ...record,
        userCanonical: record.canonicalUrl,
        autoFixStatus: "applied",
        lastActionAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await saveIssue({
        ...issue,
        status: "fixed",
        updatedAt: new Date().toISOString(),
      });
      await enqueueInspection(record, 1, 120);
      await logAction({
        urlId: record.id,
        url: record.url,
        action: "safe_auto_fix",
        detail: "Recorded expected canonical + queued reinspection (template-owned meta)",
        ok: true,
      });
      applied += 1;
      continue;
    }

    if (
      ["NOT_FOUND", "SERVER_ERROR"].includes(issue.code) ||
      (record.httpStatus !== null &&
        (record.httpStatus >= 400 || record.noindexDetected))
    ) {
      await upsertSeoUrl({
        ...record,
        eligibleForIndexing: false,
        lastSitemapIncludedAt: null,
        autoFixStatus: "applied",
        status: record.httpStatus === 404 ? "error" : record.status,
        updatedAt: new Date().toISOString(),
        lastActionAt: new Date().toISOString(),
      });
      await saveIssue({
        ...issue,
        status: "fixed",
        updatedAt: new Date().toISOString(),
      });
      await logAction({
        urlId: record.id,
        url: record.url,
        action: "safe_auto_fix",
        detail: "Marked ineligible for sitemap / indexing inventory",
        ok: true,
      });
      applied += 1;
      continue;
    }

    skipped += 1;
  }

  return { applied, approvalsCreated, skipped };
}

async function createApprovalForIssue(
  issue: SeoIssue,
  record: SeoUrlRecord,
): Promise<void> {
  const now = new Date().toISOString();
  const actionType =
    issue.code === "THIN_CONTENT"
      ? "content_improvement"
      : issue.code === "WEAK_TITLE"
        ? "title_rewrite"
        : issue.code === "WRONG_CANONICAL"
          ? "canonical_change"
          : "manual_review";

  const approval: SeoApproval = {
    id: approvalId(record.id, actionType),
    urlId: record.id,
    url: record.url,
    actionType,
    riskLevel: issue.severity,
    reason: issue.detail,
    expectedImpact:
      "Improve indexability / relevance after human review. No automatic content rewrite.",
    beforeJson: JSON.stringify({
      url: record.url,
      title: null,
      canonical: record.userCanonical,
      indexStatus: record.indexStatus,
    }),
    afterJson: JSON.stringify({
      proposed: "Human edits required in blog/guide editor",
      openUrl: record.url,
      adminHint:
        record.pageType === "blog"
          ? `${siteOrigin()}/admin/blog-automation`
          : record.pageType === "guide"
            ? `${siteOrigin()}/admin/seo-pages`
            : siteOrigin(),
    }),
    status: "pending",
    decidedByUid: null,
    decidedAt: null,
    siteId: siteId(),
    createdAt: now,
    updatedAt: now,
  };
  await saveApproval(approval);
  await upsertSeoUrl({
    ...record,
    approvalStatus: "pending",
    autoFixStatus: "needs_approval",
    updatedAt: now,
  });
}

export async function decideApproval(input: {
  approvalId: string;
  decision: "approved" | "rejected";
  adminUid: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { listApprovals } = await import("./store");
  const pending = await listApprovals("pending", 300);
  const row = pending.find((a) => a.id === input.approvalId);
  // also try direct fetch via all statuses
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Database not configured" };
  const snap = await db.collection("seoApprovals").doc(input.approvalId).get();
  if (!snap.exists && !row) return { ok: false, error: "Approval not found" };
  const approval = (row || {
    id: snap.id,
    ...snap.data(),
  }) as SeoApproval;

  const now = new Date().toISOString();
  await saveApproval({
    ...approval,
    status: input.decision === "approved" ? "approved" : "rejected",
    decidedByUid: input.adminUid,
    decidedAt: now,
    updatedAt: now,
  });

  await logAction({
    urlId: approval.urlId,
    url: approval.url,
    action: `approval_${input.decision}`,
    detail: `${approval.actionType}: ${approval.reason}`,
    ok: true,
  });

  // Approved content changes are NOT auto-applied — admin edits in CMS.
  return { ok: true };
}
