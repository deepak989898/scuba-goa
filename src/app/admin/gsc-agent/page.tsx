"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogPostFirestore } from "@/lib/blog-firestore";
import type { SeoPageFirestore } from "@/lib/seo-page-firestore";
import { utcIsoToIstDatetimeLocalValue } from "@/lib/blog-automation/schedule-ist";
import { BlogPostEditorPanel } from "@/app/admin/blog-automation/BlogPostEditorPanel";
import { GuideEditorPanel } from "@/app/admin/gsc-agent/GuideEditorPanel";
import { GscAutomationStartWizard } from "@/app/admin/gsc-agent/GscAutomationWizard";
import {
  RANKING_IMPROVE_HIDE_MS,
} from "@/lib/gsc-indexing-agent/ranking-opportunity-ui";
import { GSC_INSPECT_QUEUE_BATCH } from "@/lib/gsc-indexing-agent/constants";

type Overview = {
  totalUrls: number;
  indexed: number;
  notIndexed: number;
  unknown: number;
  criticalIssues: number;
  awaitingInspection: number;
  rankingOpportunities: number;
  declining: number;
  pendingApprovals: number;
  sitemapErrors: number;
  agentMode: string;
  paused: boolean;
  connectionHealth: boolean;
  propertyUri: string;
};

type UrlFilter =
  | "all"
  | "indexed"
  | "not_indexed"
  | "unknown"
  | "awaiting_inspection"
  | "ranking_opportunity"
  | "declining";

async function adminFetch(path: string, init?: RequestInit) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Sign in at /admin/login first.");
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

type Tab =
  | "overview"
  | "urls"
  | "issues"
  | "approvals"
  | "sitemaps"
  | "connection"
  | "settings"
  | "logs";

const URL_FILTER_LABELS: Record<UrlFilter, string> = {
  all: "All URLs",
  indexed: "Indexed",
  not_indexed: "Not indexed",
  unknown: "Unknown / pending",
  awaiting_inspection: "Awaiting inspection",
  ranking_opportunity: "Ranking opportunities",
  declining: "Declining",
};

function indexBadgeClass(status: string): string {
  if (status === "INDEXED") return "bg-emerald-600 text-white";
  if (
    [
      "NOT_ON_GOOGLE",
      "DISCOVERED_NOT_INDEXED",
      "CRAWLED_NOT_INDEXED",
      "NOT_FOUND",
      "REDIRECT_ERROR",
      "SOFT_404",
    ].includes(status)
  ) {
    return "bg-slate-600 text-white";
  }
  if (["BLOCKED_BY_ROBOTS", "BLOCKED_BY_NOINDEX", "SERVER_ERROR"].includes(status)) {
    return "bg-red-600 text-white";
  }
  return "bg-amber-500 text-amber-950";
}

function improvePctClass(pct: number): string {
  if (pct >= 28) return "bg-emerald-600 text-white";
  if (pct >= 18) return "bg-amber-500 text-amber-950";
  return "bg-cyan-700 text-white";
}

function urlRecentlyImproved(
  u: Record<string, unknown>,
  improveByUrl: Record<string, ImproveMeta>,
): boolean {
  const id = String(u.id ?? "");
  const improve =
    improveByUrl[id] || (u.lastRankingImprove as ImproveMeta | undefined);
  if (!improve?.at) return false;
  const age = Date.now() - new Date(improve.at).getTime();
  return age >= 0 && age < RANKING_IMPROVE_HIDE_MS;
}

/** Urgency for Generate — red = most needed ranking improve. */
function generatePriority(rankingStatus: string): {
  level: "critical" | "high" | "medium" | "low";
  label: string;
  buttonClass: string;
  hintClass: string;
} {
  if (
    rankingStatus === "POSITION_11_TO_20" ||
    rankingStatus === "IMPRESSIONS_NO_CLICKS" ||
    rankingStatus === "DECLINING" ||
    rankingStatus === "LOST_TRAFFIC" ||
    rankingStatus === "POSITION_21_PLUS"
  ) {
    return {
      level: "critical",
      label: "Most needed",
      buttonClass: "bg-red-600 text-white hover:bg-red-700",
      hintClass: "text-red-800",
    };
  }

  if (rankingStatus === "LOW_CTR") {
    return {
      level: "high",
      label: "High priority",
      buttonClass: "bg-orange-500 text-white hover:bg-orange-600",
      hintClass: "text-orange-800",
    };
  }

  if (rankingStatus === "POSITION_4_TO_10") {
    return {
      level: "medium",
      label: "Medium",
      buttonClass: "bg-amber-400 text-amber-950 hover:bg-amber-500",
      hintClass: "text-amber-900",
    };
  }

  return {
    level: "low",
    label: "Optional",
    buttonClass: "bg-emerald-700 text-white hover:bg-emerald-800",
    hintClass: "text-ocean-600",
  };
}

function isContentEditableType(pageType: string): boolean {
  return pageType === "blog" || pageType === "guide";
}

const PUBLISH_SLOTS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

type ImproveMeta = {
  at: string;
  estimatedPct: number;
  targetBand: string;
  checklist: string[];
  summary: string;
  rankingStatus: string;
};

type BulkRankingImproveRow = {
  urlId: string;
  ok: boolean;
  improve?: ImproveMeta;
  error?: string;
};

type EditingSession = {
  urlId: string;
  pageType: "blog" | "guide";
  rankingStatus: string;
  guidanceHeadline: string;
  guidanceBullets: string[];
};

type GscOpenAiImageItem = {
  urlId: string;
  url: string;
  title: string;
  slug: string;
  reason: string;
  at: string;
};

type GscAutomationSettings = {
  automationScheduleEnabled?: boolean;
  automationFrequency?: string;
  automationPositionThreshold?: number;
  automationInspectPerRun?: number;
  automationRankingImproveMax?: number;
  automationLastRunAt?: string | null;
  automationLastRunDate?: string | null;
  automationOpenAiImageQueue?: GscOpenAiImageItem[];
};

export default function GscIndexingAgentPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [urlFilter, setUrlFilter] = useState<UrlFilter>("all");
  const [issueSeverity, setIssueSeverity] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connection, setConnection] = useState<Record<string, unknown> | null>(
    null,
  );
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [urls, setUrls] = useState<Record<string, unknown>[]>([]);
  const [issues, setIssues] = useState<Record<string, unknown>[]>([]);
  const [approvals, setApprovals] = useState<Record<string, unknown>[]>([]);
  const [sitemaps, setSitemaps] = useState<Record<string, unknown>[]>([]);
  const [actions, setActions] = useState<Record<string, unknown>[]>([]);
  const [sites, setSites] = useState<{ siteUrl: string }[]>([]);
  const [propertyUri, setPropertyUri] = useState("");
  const [agentMode, setAgentMode] = useState("approval_required");
  const [paused, setPaused] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState<string | null>(null);
  const [aiImageProgress, setAiImageProgress] = useState<number | null>(null);
  const [editingSession, setEditingSession] = useState<EditingSession | null>(
    null,
  );
  const [editingBlog, setEditingBlog] = useState<BlogPostFirestore | null>(null);
  const [editingGuide, setEditingGuide] = useState<SeoPageFirestore | null>(null);
  const [improveByUrl, setImproveByUrl] = useState<Record<string, ImproveMeta>>(
    {},
  );
  const [selectedUrlIds, setSelectedUrlIds] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkInspecting, setBulkInspecting] = useState(false);
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolvingAllIssues, setResolvingAllIssues] = useState(false);
  const [automationWizardOpen, setAutomationWizardOpen] = useState(false);
  const [automationBusy, setAutomationBusy] = useState(false);

  const automationSettings = (settings ?? {}) as GscAutomationSettings;
  const openAiImageQueue = automationSettings.automationOpenAiImageQueue ?? [];

  const bulkEligibleUrls = useMemo(() => {
    return urls.filter((u) => isContentEditableType(String(u.pageType)));
  }, [urls]);

  const bulkEligibleIds = useMemo(
    () => bulkEligibleUrls.map((u) => String(u.id)),
    [bulkEligibleUrls],
  );

  const allBulkEligibleSelected =
    bulkEligibleIds.length > 0 &&
    bulkEligibleIds.every((id) => selectedUrlIds.has(id));

  const load = useCallback(
    async (view: Tab = tab, filter: UrlFilter = urlFilter, severity = issueSeverity) => {
      setLoading(true);
      setErr(null);
      try {
        if (view === "connection") {
          const data = await adminFetch("/api/admin/gsc-agent/connection");
          setConnection(data.connection);
          setSites(data.sites ?? []);
          setPropertyUri(String(data.connection?.propertyUri || ""));
        } else if (view === "settings") {
          const data = await adminFetch("/api/admin/gsc-agent/settings");
          setSettings(data.settings);
          setAgentMode(String(data.settings?.agentMode || "approval_required"));
          setPaused(Boolean(data.settings?.paused));
        } else if (view === "urls") {
          const qs = new URLSearchParams({ view: "urls", filter });
          const data = await adminFetch(
            `/api/admin/gsc-agent/dashboard?${qs.toString()}`,
          );
          setOverview(data.overview ?? null);
          setConnection(data.connection ?? null);
          setUrls(data.urls ?? []);
          const seeded: Record<string, ImproveMeta> = {};
          for (const row of (data.urls ?? []) as Record<string, unknown>[]) {
            const last = row.lastRankingImprove as ImproveMeta | undefined;
            if (last && row.id) seeded[String(row.id)] = last;
          }
          if (Object.keys(seeded).length) {
            setImproveByUrl((prev) => ({ ...seeded, ...prev }));
          }
        } else if (view === "issues") {
          const qs = new URLSearchParams({ view: "issues" });
          if (severity) qs.set("severity", severity);
          const data = await adminFetch(
            `/api/admin/gsc-agent/dashboard?${qs.toString()}`,
          );
          setOverview(data.overview ?? null);
          setIssues(data.issues ?? []);
        } else {
          const data = await adminFetch(
            `/api/admin/gsc-agent/dashboard?view=${view === "overview" ? "overview" : view}`,
          );
          setOverview(data.overview ?? null);
          setConnection(data.connection ?? null);
          if (data.settings) setSettings(data.settings);
          if (data.urls) setUrls(data.urls);
          if (data.issues) setIssues(data.issues);
          if (data.approvals) setApprovals(data.approvals);
          if (data.sitemaps) setSitemaps(data.sitemaps);
          if (data.actions) setActions(data.actions);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    },
    [tab, urlFilter, issueSeverity],
  );

  useEffect(() => {
    void load(tab, urlFilter, issueSeverity);
  }, [tab, urlFilter, issueSeverity, load]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("gsc") === "connected") setOk("Google Search Console connected.");
    if (q.get("gsc") === "error") setErr(q.get("msg") || "OAuth error");
  }, []);

  function openUrlFilter(filter: UrlFilter) {
    setUrlFilter(filter);
    setTab("urls");
  }

  function openCriticalIssues() {
    setIssueSeverity("CRITICAL");
    setTab("issues");
  }

  async function resolveIssue(issueId: string) {
    setResolvingIssueId(issueId);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/resolve-issue", {
        method: "POST",
        body: JSON.stringify({ issueId }),
      });
      if (!data.ok) {
        throw new Error(String(data.error || "Resolve failed"));
      }
      const parts = [
        data.action ? String(data.action) : "resolved",
        data.slug ? `blog: ${data.slug}` : "",
        data.redirectTo ? `→ ${data.redirectTo}` : "",
      ].filter(Boolean);
      setOk(`Issue resolved — ${parts.join(" · ")}`);
      await load("issues", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setResolvingIssueId(null);
    }
  }

  async function resolveAllVisibleIssues() {
    setResolvingAllIssues(true);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/resolve-issue", {
        method: "POST",
        body: JSON.stringify({
          all: true,
          severity: issueSeverity || undefined,
          max: 20,
        }),
      });
      if (data.failed > 0 && data.resolved === 0) {
        throw new Error(
          String(data.results?.[0]?.error || "Could not resolve issues"),
        );
      }
      setOk(
        `Resolved ${data.resolved ?? 0} URL(s). ${data.failed ?? 0} could not be auto-fixed.`,
      );
      await load("issues", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk resolve failed");
    } finally {
      setResolvingAllIssues(false);
    }
  }

  async function runJob(job: string) {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      if (job === "inspect") {
        const data = await adminFetch("/api/admin/gsc-agent/inspect", {
          method: "POST",
          body: JSON.stringify({ processQueue: true, max: GSC_INSPECT_QUEUE_BATCH }),
        });
        const d = data.detail as {
          processed?: number;
          skippedQuota?: number;
          errors?: number;
        };
        const processed = Number(d?.processed ?? 0);
        const skipped = Number(d?.skippedQuota ?? 0);
        const errors = Number(d?.errors ?? 0);
        setOk(
          `Inspect queue: ${processed} URL(s) checked` +
            (errors ? ` · ${errors} failed` : "") +
            (skipped ? ` · ${skipped} skipped (daily quota)` : "") +
            `. Runs up to ${GSC_INSPECT_QUEUE_BATCH} per click (daily GSC quota ~50) — quota resets at IST midnight.`,
        );
      } else {
        const data = await adminFetch("/api/admin/gsc-agent/run", {
          method: "POST",
          body: JSON.stringify({ job }),
        });
        setOk(`${job} finished: ${JSON.stringify(data.detail || data).slice(0, 180)}`);
      }
      await load(tab, urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  /** Preview then confirm-delete seoUrls no longer on the live site. */
  async function cleanStaleSeoUrls() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const preview = await adminFetch("/api/admin/gsc-agent/clean-stale", {
        method: "POST",
        body: JSON.stringify({ confirm: false }),
      });
      const d = preview.detail as {
        tracked?: number;
        live?: number;
        stale?: number;
        sample?: { path: string; pageType: string }[];
      };
      const stale = Number(d?.stale ?? 0);
      const tracked = Number(d?.tracked ?? 0);
      const live = Number(d?.live ?? 0);
      if (stale <= 0) {
        setOk(
          `No stale URLs. Tracked ${tracked} · live site ≈ ${live}. Nothing to delete.`,
        );
        return;
      }
      const sample = (d.sample ?? [])
        .slice(0, 8)
        .map((s) => `${s.pageType}: ${s.path}`)
        .join("\n");
      const okConfirm = window.confirm(
        `Clean stale seoUrls?\n\n` +
          `Tracked: ${tracked}\n` +
          `Live site URLs: ${live}\n` +
          `Will DELETE from agent list: ${stale}\n\n` +
          `This does NOT change Google Search Console — only the admin tracker.\n` +
          `Live published pages are kept.\n\n` +
          (sample ? `Examples:\n${sample}\n\n` : "") +
          `Continue?`,
      );
      if (!okConfirm) {
        setOk(`Cancelled. Preview: ${stale} stale of ${tracked} (live ≈ ${live}).`);
        return;
      }
      const done = await adminFetch("/api/admin/gsc-agent/clean-stale", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      const dd = done.detail as { deleted?: number; live?: number; tracked?: number };
      setOk(
        `Cleaned ${Number(dd?.deleted ?? 0)} stale seoUrls. Live kept ≈ ${Number(dd?.live ?? live)}. Refresh Blog posts inventory to see new GSC tracking count.`,
      );
      await load(tab, urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Clean stale failed");
    } finally {
      setBusy(false);
    }
  }

  async function startGscAutomation(config: {
    frequency: "daily" | "weekly" | "monthly";
    positionThreshold: number;
    inspectPerRun: number;
    rankingImproveMax: number;
  }) {
    setAutomationBusy(true);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/settings", {
        method: "POST",
        body: JSON.stringify({ action: "startAutomation", ...config }),
      });
      setSettings(data.settings ?? null);
      const run = data.run as {
        rankingImproved?: number;
        openAiImageAttention?: number;
        rankingCandidates?: number;
      };
      setAutomationWizardOpen(false);
      setOk(
        `GSC automation ON (${config.frequency}, position > ${config.positionThreshold}). First run: improved ${run?.rankingImproved ?? 0}/${run?.rankingCandidates ?? 0} blogs · ${run?.openAiImageAttention ?? 0} need OpenAI image review.`,
      );
      await load("overview", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Start automation failed");
    } finally {
      setAutomationBusy(false);
    }
  }

  async function stopGscAutomation() {
    setAutomationBusy(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/settings", {
        method: "POST",
        body: JSON.stringify({ action: "stopAutomation" }),
      });
      setSettings(data.settings ?? null);
      setOk("GSC automation stopped.");
      await load("overview", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Stop automation failed");
    } finally {
      setAutomationBusy(false);
    }
  }

  async function runGscAutomationNow() {
    setAutomationBusy(true);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/settings", {
        method: "POST",
        body: JSON.stringify({ action: "runAutomationNow" }),
      });
      const run = data.run as {
        skipped?: boolean;
        skipReason?: string;
        rankingImproved?: number;
        openAiImageAttention?: number;
        rankingCandidates?: number;
      };
      if (run?.skipped) {
        setOk(run.skipReason || "Automation run skipped.");
      } else {
        setOk(
          `Automation run done: improved ${run?.rankingImproved ?? 0}/${run?.rankingCandidates ?? 0} · ${run?.openAiImageAttention ?? 0} need OpenAI images.`,
        );
      }
      await load("overview", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Automation run failed");
    } finally {
      setAutomationBusy(false);
    }
  }

  async function clearOpenAiImageQueue() {
    setAutomationBusy(true);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/settings", {
        method: "POST",
        body: JSON.stringify({ action: "clearOpenAiImageQueue" }),
      });
      setSettings(data.settings ?? null);
      setOk("OpenAI image attention list cleared.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setAutomationBusy(false);
    }
  }

  function closeEditor() {
    setEditingSession(null);
    setEditingBlog(null);
    setEditingGuide(null);
    setAiImageProgress(null);
    setEditBusy(null);
  }

  async function generateImprove(urlId: string) {
    setGeneratingId(urlId);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/improve", {
        method: "POST",
        body: JSON.stringify({ urlId }),
      });
      const improve = data.improve as ImproveMeta;
      const page = data.page as {
        pageType: "blog" | "guide";
        rankingStatus: string;
        blogPost: BlogPostFirestore | null;
        guidePage: SeoPageFirestore | null;
        guidance: { headline: string; bullets: string[] };
      };
      setImproveByUrl((prev) => ({ ...prev, [urlId]: improve }));
      setOk(
        `Content updated — removed from ranking opportunities for ${Math.round(RANKING_IMPROVE_HIDE_MS / (24 * 60 * 60 * 1000))} days. Est. ~${improve.estimatedPct}% toward ${improve.targetBand}.`,
      );
      if (editingSession?.urlId === urlId) {
        setEditingSession({
          urlId,
          pageType: page.pageType,
          rankingStatus: page.rankingStatus,
          guidanceHeadline: page.guidance.headline,
          guidanceBullets: page.guidance.bullets,
        });
        if (page.pageType === "blog" && page.blogPost) {
          setEditingBlog(page.blogPost);
        }
        if (page.pageType === "guide" && page.guidePage) {
          setEditingGuide(page.guidePage);
        }
      }
      await load("urls", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGeneratingId(null);
    }
  }

  const BULK_CHUNK = 8;

  async function generateImproveBulk() {
    const ids = [...selectedUrlIds];
    if (!ids.length) return;
    setBulkGenerating(true);
    setErr(null);
    setOk(null);
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];
    try {
      for (let i = 0; i < ids.length; i += BULK_CHUNK) {
        const chunk = ids.slice(i, i + BULK_CHUNK);
        const data = await adminFetch("/api/admin/gsc-agent/improve", {
          method: "POST",
          body: JSON.stringify({ urlIds: chunk }),
        });
        if (data.bulk && Array.isArray(data.results)) {
          for (const r of data.results as BulkRankingImproveRow[]) {
            if (r.ok && r.improve) {
              succeeded += 1;
              setImproveByUrl((prev) => ({ ...prev, [r.urlId]: r.improve! }));
            } else {
              failed += 1;
              if (r.error) errors.push(`${r.urlId}: ${r.error}`);
            }
          }
        } else if (data.improve) {
          succeeded += 1;
          const urlId = chunk[0]!;
          setImproveByUrl((prev) => ({
            ...prev,
            [urlId]: data.improve as ImproveMeta,
          }));
        }
      }
      setSelectedUrlIds(new Set());
      const hideDays = Math.round(RANKING_IMPROVE_HIDE_MS / (24 * 60 * 60 * 1000));
      setOk(
        `Improved ${succeeded} page(s)${failed ? ` · ${failed} failed` : ""}. Removed from ranking opportunities for ${hideDays} days.`,
      );
      if (errors.length) {
        setErr(errors.slice(0, 3).join(" · "));
      }
      await load("urls", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk generate failed");
    } finally {
      setBulkGenerating(false);
    }
  }

  function toggleUrlSelection(urlId: string, eligible: boolean) {
    if (!eligible) return;
    setSelectedUrlIds((prev) => {
      const next = new Set(prev);
      if (next.has(urlId)) next.delete(urlId);
      else next.add(urlId);
      return next;
    });
  }

  function toggleSelectAllBulkEligible() {
    if (allBulkEligibleSelected) {
      setSelectedUrlIds(new Set());
      return;
    }
    setSelectedUrlIds(new Set(bulkEligibleIds));
  }

  async function refreshIndexBulk(urlIds: string[]) {
    if (!urlIds.length) return;
    setBulkInspecting(true);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/inspect", {
        method: "POST",
        body: JSON.stringify({ urlIds, max: GSC_INSPECT_QUEUE_BATCH }),
      });
      const detail = data.detail as {
        processed?: number;
        skippedQuota?: number;
        results?: Array<{ urlId: string; ok: boolean; indexStatus?: string; error?: string }>;
      };
      const processed = Number(detail?.processed ?? 0);
      const skipped = Number(detail?.skippedQuota ?? 0);
      setOk(
        `Index status refreshed for ${processed} URL(s)${skipped ? ` · ${skipped} skipped (quota)` : ""}`,
      );
      setSelectedUrlIds(new Set());
      await load("urls", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Index refresh failed");
    } finally {
      setBulkInspecting(false);
    }
  }

  async function refreshPendingIndexStatus() {
    setBulkInspecting(true);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/inspect", {
        method: "POST",
        body: JSON.stringify({ refreshPending: true, max: GSC_INSPECT_QUEUE_BATCH }),
      });
      const detail = data.detail as {
        processed?: number;
        skippedQuota?: number;
      };
      setOk(
        `Refreshed index for ${Number(detail?.processed ?? 0)} pending URL(s)${detail?.skippedQuota ? ` · quota limit reached` : ""}`,
      );
      await load("urls", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Pending index refresh failed");
    } finally {
      setBulkInspecting(false);
    }
  }

  async function openEdit(urlId: string) {
    setErr(null);
    setEditBusy(`edit-${urlId}`);
    try {
      const data = await adminFetch(
        `/api/admin/gsc-agent/improve?urlId=${encodeURIComponent(urlId)}`,
      );
      const page = data.page as {
        urlId: string;
        pageType: "blog" | "guide";
        rankingStatus: string;
        blogPost: BlogPostFirestore | null;
        guidePage: SeoPageFirestore | null;
        guidance: { headline: string; bullets: string[] };
        lastImprove: ImproveMeta | null;
      };
      if (page.lastImprove) {
        setImproveByUrl((prev) => ({ ...prev, [urlId]: page.lastImprove! }));
      }
      setEditingSession({
        urlId: page.urlId,
        pageType: page.pageType,
        rankingStatus: page.rankingStatus,
        guidanceHeadline: page.guidance.headline,
        guidanceBullets: page.guidance.bullets,
      });
      setEditingBlog(page.pageType === "blog" ? page.blogPost : null);
      setEditingGuide(page.pageType === "guide" ? page.guidePage : null);
      if (page.pageType === "blog" && !page.blogPost) {
        throw new Error("Blog post not found");
      }
      if (page.pageType === "guide" && !page.guidePage) {
        throw new Error("Guide page not found");
      }
    } catch (e) {
      closeEditor();
      setErr(e instanceof Error ? e.message : "Could not load page for edit");
    } finally {
      setEditBusy(null);
    }
  }

  async function saveEditedBlog(opts?: { publishNow?: boolean }) {
    if (!editingBlog || !editingSession) return;
    setEditBusy(`save-${editingBlog.slug}`);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/blog-posts", {
        method: "PATCH",
        body: JSON.stringify({
          ...editingBlog,
          scheduledPublishAtIst: utcIsoToIstDatetimeLocalValue(
            editingBlog.scheduledPublishAt,
          ),
          publishNow: opts?.publishNow === true,
        }),
      });
      setOk(
        opts?.publishNow
          ? `Published /blog/${editingBlog.slug}`
          : `Saved /blog/${editingBlog.slug}`,
      );
      closeEditor();
      await load("urls", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setEditBusy(null);
    }
  }

  async function saveEditedGuide() {
    if (!editingGuide || !editingSession) return;
    setEditBusy(`save-${editingGuide.slug}`);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/gsc-agent/improve", {
        method: "PATCH",
        body: JSON.stringify({
          urlId: editingSession.urlId,
          title: editingGuide.headline,
          headline: editingGuide.headline,
          metaTitle: editingGuide.metaTitle,
          metaDescription: editingGuide.metaDescription,
          keywords: editingGuide.keywords,
          content: editingGuide.bodyContent,
          bodyContent: editingGuide.bodyContent,
          ogImageUrl: editingGuide.ogImageUrl,
          heroImageUrl: editingGuide.heroImageUrl,
          bookingOption: editingGuide.bookingOption,
          published: editingGuide.published,
        }),
      });
      setOk(`Saved /guides/${editingGuide.slug}`);
      closeEditor();
      await load("urls", urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setEditBusy(null);
    }
  }

  async function uploadBlogImage(file: File | null) {
    if (!file || !editingBlog) return;
    setEditBusy(`img-${editingBlog.slug}`);
    setErr(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) throw new Error("Sign in required");
      const token = await auth.currentUser.getIdToken();
      const fd = new FormData();
      fd.append("slug", editingBlog.slug);
      fd.append("file", file);
      const res = await fetch("/api/admin/blog-image-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setEditingBlog((e) =>
        e
          ? {
              ...e,
              featuredImageUrl: data.featuredImageUrl ?? e.featuredImageUrl,
              ogImageUrl:
                data.ogImageUrl ?? data.featuredImageUrl ?? e.ogImageUrl,
            }
          : e,
      );
      setOk("Featured image uploaded and saved to the live blog.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setEditBusy(null);
    }
  }

  async function generateBlogAiImage() {
    if (!editingBlog) return;
    const title = editingBlog.title.trim();
    if (!title) {
      setErr("Enter a blog title first, then generate the image.");
      return;
    }
    setEditBusy(`ai-img-${editingBlog.slug}`);
    setErr(null);
    setOk(null);
    setAiImageProgress(3);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const estimated = Math.min(
        92,
        Math.round(3 + 89 * (1 - Math.exp(-elapsed / 18000))),
      );
      setAiImageProgress((prev) =>
        prev == null ? estimated : Math.max(prev, estimated),
      );
    }, 400);
    try {
      const data = await adminFetch("/api/admin/blog-image-generate", {
        method: "POST",
        body: JSON.stringify({ slug: editingBlog.slug, title, forceOpenAi: true }),
      });
      window.clearInterval(tick);
      setAiImageProgress(100);
      setEditingBlog((e) =>
        e
          ? {
              ...e,
              featuredImageUrl:
                (data.featuredImageUrl as string) ?? e.featuredImageUrl,
              ogImageUrl:
                (data.ogImageUrl as string) ??
                (data.featuredImageUrl as string) ??
                e.ogImageUrl,
              featuredImageAlt:
                (data.featuredImageAlt as string) ?? e.featuredImageAlt,
            }
          : e,
      );
      setOk("AI image generated and applied to the live blog.");
      window.setTimeout(() => setAiImageProgress(null), 900);
    } catch (e) {
      window.clearInterval(tick);
      setAiImageProgress(null);
      setErr(e instanceof Error ? e.message : "AI image generation failed");
    } finally {
      setEditBusy(null);
    }
  }

  async function uploadGuideImage(file: File | null, kind: "og" | "hero") {
    if (!file || !editingGuide) return;
    setEditBusy(`img-${kind}-${editingGuide.slug}`);
    setErr(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) throw new Error("Sign in required");
      const token = await auth.currentUser.getIdToken();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", editingGuide.slug);
      fd.append("kind", kind);
      const res = await fetch("/api/admin/seo-image-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const url = String(data.url ?? "");
      if (!url) throw new Error("Upload returned no URL");
      setEditingGuide((g) =>
        g
          ? kind === "og"
            ? { ...g, ogImageUrl: url }
            : { ...g, heroImageUrl: url }
          : g,
      );
      setOk(
        kind === "og"
          ? "OG image uploaded — click Save changes to persist."
          : "Hero image uploaded — click Save changes to persist.",
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setEditBusy(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "urls", label: "URL inventory" },
    { id: "issues", label: "Technical issues" },
    { id: "approvals", label: "Approval queue" },
    { id: "sitemaps", label: "Sitemaps" },
    { id: "connection", label: "Search Console" },
    { id: "settings", label: "Agent settings" },
    { id: "logs", label: "Activity logs" },
  ];

  const metricCards: {
    label: string;
    value: number;
    color: string;
    onClick?: () => void;
    hint: string;
  }[] = overview
    ? [
        {
          label: "Canonical URLs",
          value: overview.totalUrls,
          color: "border-ocean-200 hover:border-ocean-400",
          onClick: () => openUrlFilter("all"),
          hint: "Click → all URLs",
        },
        {
          label: "Indexed",
          value: overview.indexed,
          color: "border-emerald-300 bg-emerald-50/50 hover:border-emerald-500",
          onClick: () => openUrlFilter("indexed"),
          hint: "Click → indexed pages",
        },
        {
          label: "Not indexed",
          value: overview.notIndexed,
          color: "border-slate-300 bg-slate-50 hover:border-slate-500",
          onClick: () => openUrlFilter("not_indexed"),
          hint: "Click → not indexed pages",
        },
        {
          label: "Unknown / pending",
          value: overview.unknown,
          color: "border-amber-300 bg-amber-50/40 hover:border-amber-500",
          onClick: () => openUrlFilter("unknown"),
          hint: "Click → unknown status",
        },
        {
          label: "Critical issues",
          value: overview.criticalIssues,
          color: "border-red-300 bg-red-50/40 hover:border-red-500",
          onClick: openCriticalIssues,
          hint: "Click → critical issues",
        },
        {
          label: "Awaiting inspection",
          value: overview.awaitingInspection,
          color: "border-cyan-300 bg-cyan-50/40 hover:border-cyan-500",
          onClick: () => openUrlFilter("awaiting_inspection"),
          hint: "Click → queue list",
        },
        {
          label: "Ranking opportunities",
          value: overview.rankingOpportunities,
          color: "border-violet-300 bg-violet-50/40 hover:border-violet-500",
          onClick: () => openUrlFilter("ranking_opportunity"),
          hint: "Click → improve these",
        },
        {
          label: "Pending approvals",
          value: overview.pendingApprovals,
          color: "border-orange-300 bg-orange-50/40 hover:border-orange-500",
          onClick: () => setTab("approvals"),
          hint: "Click → approval queue",
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-700">
          SEO Agent
        </p>
        <h1 className="font-display text-2xl font-bold text-ocean-900">
          Google Search Console — Indexing & Ranking
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-ocean-700">
          Monitors index status via URL Inspection (read-only), syncs Search Analytics,
          manages sitemaps, and queues safe fixes.{" "}
          <strong>Does not</strong> use the Google Indexing API for blogs, and never
          automates “Request indexing” clicks.
        </p>
      </div>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {ok}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              tab === t.id
                ? "bg-ocean-800 text-white"
                : "border border-ocean-200 bg-white text-ocean-800 hover:border-ocean-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ocean-600">Loading…</p>
      ) : null}

      {tab === "overview" && overview ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-bold text-ocean-900">
                  Daily SEO automation
                </h2>
                <p className="mt-1 text-xs text-ocean-700">
                  Sync analytics → inspect queue → improve blogs ranking worse than
                  your position target. Images: free stock only; flagged blogs need
                  manual OpenAI hero from Edit.
                </p>
                {automationSettings.automationScheduleEnabled ? (
                  <p className="mt-2 text-xs font-semibold text-violet-900">
                    ON · {automationSettings.automationFrequency || "daily"} · position
                    &gt; {automationSettings.automationPositionThreshold ?? 10} ·
                    inspect {automationSettings.automationInspectPerRun ?? GSC_INSPECT_QUEUE_BATCH}/run ·
                    improve {automationSettings.automationRankingImproveMax ?? 5}/run
                    {automationSettings.automationLastRunAt
                      ? ` · last run ${new Date(
                          automationSettings.automationLastRunAt,
                        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-ocean-600">
                    OFF — start automation to run daily without manual clicks.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {automationSettings.automationScheduleEnabled ? (
                  <>
                    <button
                      type="button"
                      disabled={automationBusy || busy}
                      onClick={() => void runGscAutomationNow()}
                      className="rounded-full border border-violet-400 bg-white px-3 py-1.5 text-xs font-bold text-violet-900 disabled:opacity-50"
                    >
                      Run now
                    </button>
                    <button
                      type="button"
                      disabled={automationBusy || busy}
                      onClick={() => void stopGscAutomation()}
                      className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-900 disabled:opacity-50"
                    >
                      Stop automation
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={automationBusy || busy}
                    onClick={() => setAutomationWizardOpen(true)}
                    className="rounded-full bg-violet-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Start automation
                  </button>
                )}
              </div>
            </div>
            {openAiImageQueue.length > 0 ? (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-amber-950">
                    Needs OpenAI image ({openAiImageQueue.length})
                  </p>
                  <button
                    type="button"
                    disabled={automationBusy}
                    onClick={() => void clearOpenAiImageQueue()}
                    className="text-[10px] font-bold text-amber-900 underline"
                  >
                    Clear list
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-amber-900">
                  Stock image failed or low relevance — open Edit and use OpenAI image
                  generation for a better hero match.
                </p>
                <ul className="mt-2 space-y-1">
                  {openAiImageQueue.slice(0, 8).map((item) => (
                    <li
                      key={item.urlId}
                      className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-ocean-900">
                        <strong>{item.title || item.slug}</strong>
                        <span className="text-ocean-600"> — {item.reason}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void openEdit(item.urlId)}
                        className="rounded-full bg-ocean-800 px-2 py-0.5 text-[10px] font-bold text-white"
                      >
                        Edit · OpenAI image
                      </button>
                    </li>
                  ))}
                </ul>
                {openAiImageQueue.length > 8 ? (
                  <p className="mt-1 text-[10px] text-ocean-600">
                    +{openAiImageQueue.length - 8} more in queue
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <p className="text-xs text-ocean-600">
            Tip: click any metric card to open the matching page list. Status
            comes from <strong>URL Inspection API</strong> (quota ~50/day) and
            impressions from <strong>Sync analytics</strong>. If GSC UI shows
            indexed but here says pending, click <strong>Refresh index</strong> or
            <strong>Inspect queue</strong> on Overview.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={card.onClick}
                className={`rounded-xl border bg-white p-3 text-left shadow-sm transition ${card.color}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-ocean-500">
                  {card.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-ocean-900">
                  {card.value}
                </p>
                <p className="mt-1 text-[10px] font-medium text-cyan-800">{card.hint}</p>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm text-ocean-800">
            Mode: <strong>{overview.agentMode}</strong>
            {overview.paused ? " · PAUSED" : ""} · Property:{" "}
            <code className="text-xs">{overview.propertyUri}</code> · Connection:{" "}
            {overview.connectionHealth ? "OK" : "Check connection"}
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["inventory", "Discover URLs"],
                ["audit", "Audit batch"],
                ["inspect", "Inspect queue"],
                ["analytics", "Sync analytics"],
                ["auto_fix", "Safe auto-fix"],
                ["daily", "Run daily job"],
                ["content_proposals", "Content proposals"],
              ] as const
            ).map(([job, label]) => (
              <button
                key={job}
                type="button"
                disabled={busy}
                onClick={() => void runJob(job)}
                className="rounded-full border border-ocean-200 bg-white px-3 py-1.5 text-xs font-bold text-ocean-800 hover:border-cyan-400 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => void cleanStaleSeoUrls()}
              className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-900 hover:border-rose-500 disabled:opacity-50"
              title="Delete agent seoUrls that are no longer on the live site (not Google Removals)"
            >
              Clean stale seoUrls
            </button>
          </div>
          <p className="text-[11px] text-ocean-600">
            <strong>Clean stale seoUrls</strong> removes old/duplicate URLs from the
            agent list only (e.g. 265 → ~live site count). It does not remove pages
            from Google. Prefer <strong>Discover URLs</strong> first, then Clean.
          </p>
        </div>
      ) : null}

      {tab === "urls" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ocean-700">Filter:</span>
            {(Object.keys(URL_FILTER_LABELS) as UrlFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setUrlFilter(f)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  urlFilter === f
                    ? "bg-ocean-800 text-white"
                    : "border border-ocean-200 bg-white text-ocean-800"
                }`}
              >
                {URL_FILTER_LABELS[f]}
              </button>
            ))}
          </div>
          <p className="text-xs text-ocean-600">
            Showing <strong>{URL_FILTER_LABELS[urlFilter]}</strong> — {urls.length} URL
            {urls.length === 1 ? "" : "s"}.{" "}
            <strong>Generate</strong> = AI text improve (no images).{" "}
            <strong>Edit</strong> = full editor like AI Blog Automation (all fields + images).
            Blog/guide only.
          </p>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ocean-100 bg-white px-3 py-2 text-[10px] font-bold">
            <span className="text-ocean-600">Generate urgency:</span>
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-white">
              Red · Most needed
            </span>
            <span className="rounded bg-orange-500 px-1.5 py-0.5 text-white">
              Orange · High
            </span>
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-amber-950">
              Amber · Medium
            </span>
            <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-white">
              Green · Optional
            </span>
          </div>
          {urlFilter === "ranking_opportunity" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <p className="font-bold">POSITION 11–20 वाले blogs / guides</p>
              <p className="mt-0.5">
                Title refresh, internal links (services/booking), पुराना content अपडेट — Generate
                से page update होता है; position page 1 (4–10) की तरफ जा सकती है (guarantee नहीं).
              </p>
            </div>
          ) : null}
          {bulkEligibleIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ocean-200 bg-ocean-50 px-3 py-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-ocean-900">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-700"
                  checked={allBulkEligibleSelected}
                  onChange={() => toggleSelectAllBulkEligible()}
                  disabled={
                    bulkGenerating || bulkInspecting || Boolean(generatingId)
                  }
                />
                Select all blog/guide ({bulkEligibleIds.length})
              </label>
              <span className="text-xs font-semibold text-ocean-700">
                {selectedUrlIds.size} selected
              </span>
              <button
                type="button"
                disabled={
                  selectedUrlIds.size === 0 ||
                  bulkGenerating ||
                  bulkInspecting ||
                  Boolean(generatingId) ||
                  Boolean(editBusy)
                }
                onClick={() => void generateImproveBulk()}
                className="rounded-full bg-ocean-800 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {bulkGenerating
                  ? `Generating ${selectedUrlIds.size}…`
                  : `Generate selected (${selectedUrlIds.size})`}
              </button>
              <button
                type="button"
                disabled={
                  selectedUrlIds.size === 0 ||
                  bulkGenerating ||
                  bulkInspecting ||
                  Boolean(generatingId) ||
                  Boolean(editBusy)
                }
                onClick={() => void refreshIndexBulk([...selectedUrlIds])}
                className="rounded-full border border-cyan-700 bg-white px-4 py-1.5 text-xs font-bold text-cyan-900 disabled:opacity-50"
              >
                {bulkInspecting
                  ? "Refreshing index…"
                  : `Refresh index (${selectedUrlIds.size})`}
              </button>
              {(urlFilter === "unknown" ||
                urlFilter === "awaiting_inspection") && (
                <button
                  type="button"
                  disabled={bulkGenerating || bulkInspecting || busy}
                  onClick={() => void refreshPendingIndexStatus()}
                  className="rounded-full border border-amber-600 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-950 disabled:opacity-50"
                >
                  Refresh all pending (8)
                </button>
              )}
              {selectedUrlIds.size > BULK_CHUNK ? (
                <span className="text-[10px] text-ocean-600">
                  Max {BULK_CHUNK} per generate batch — larger selections run in
                  sequence
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-ocean-50 text-ocean-800">
                <tr>
                  <th className="p-2 w-8" aria-label="Select" />
                  <th className="p-2">URL</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Index</th>
                  <th className="p-2">HTTP</th>
                  <th className="p-2">Imp</th>
                  <th className="p-2">Pos</th>
                  <th className="p-2">Ranking</th>
                  <th className="p-2">SEO improve</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((u) => {
                  const id = String(u.id);
                  const pageType = String(u.pageType);
                  const ranking = String(u.rankingStatus);
                  const editable = isContentEditableType(pageType);
                  const improve =
                    improveByUrl[id] ||
                    (u.lastRankingImprove as ImproveMeta | undefined);
                  const recentlyImproved = urlRecentlyImproved(u, improveByUrl);
                  const isGen = generatingId === id;
                  const isEditing = editingSession?.urlId === id;
                  const genPri = generatePriority(ranking);
                  const selectable = editable;
                  const canGenerate = editable && !recentlyImproved;
                  return (
                    <Fragment key={id}>
                      <tr
                        className={`border-t border-ocean-50 align-top ${
                          isEditing ? "bg-ocean-50/40" : ""
                        } ${recentlyImproved ? "bg-emerald-50/70" : ""} ${
                          selectedUrlIds.has(id) ? "bg-cyan-50/50" : ""
                        }`}
                      >
                        <td className="p-2 align-top">
                          {selectable ? (
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-cyan-700"
                              checked={selectedUrlIds.has(id)}
                              disabled={
                                bulkGenerating ||
                                bulkInspecting ||
                                Boolean(generatingId) ||
                                Boolean(editBusy)
                              }
                              onChange={() => toggleUrlSelection(id, selectable)}
                              aria-label={`Select ${String(u.url)}`}
                            />
                          ) : null}
                        </td>
                        <td className="min-w-[220px] max-w-[360px] p-2">
                          <a
                            href={String(u.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all font-semibold leading-snug text-cyan-800 hover:underline"
                            title={String(u.url)}
                          >
                            {String(u.url)}
                          </a>
                        </td>
                        <td className="p-2">{pageType}</td>
                        <td className="p-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${indexBadgeClass(String(u.indexStatus))}`}
                          >
                            {String(u.indexStatus)}
                          </span>
                        </td>
                        <td className="p-2">{String(u.httpStatus ?? "—")}</td>
                        <td className="p-2">{String(u.impressions ?? 0)}</td>
                        <td className="p-2">
                          {Number(u.averagePosition || 0).toFixed(1)}
                        </td>
                        <td className="p-2">
                          <div>{ranking}</div>
                          {ranking === "POSITION_11_TO_20" && editable ? (
                            <p className="mt-1 max-w-[160px] text-[10px] leading-snug text-amber-800">
                              Title refresh · links · पुराना content अपडेट → toward 4–10
                            </p>
                          ) : null}
                        </td>
                        <td className="p-2">
                          {editable ? (
                            <div className="flex min-w-[140px] flex-col gap-1.5">
                              <div className="flex flex-wrap gap-1">
                                {recentlyImproved ? (
                                  <span
                                    className="rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white"
                                    title={`Improved ${improve?.at ? new Date(improve.at).toLocaleString("en-IN") : ""}`}
                                  >
                                    Improved ✓
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={
                                      !canGenerate ||
                                      busy ||
                                      Boolean(generatingId) ||
                                      Boolean(editBusy) ||
                                      bulkGenerating ||
                                      bulkInspecting
                                    }
                                    onClick={() => void generateImprove(id)}
                                    title={`${genPri.label} — ${ranking}`}
                                    className={`rounded-md px-2 py-1 text-[10px] font-bold disabled:opacity-50 ${genPri.buttonClass}`}
                                  >
                                    {isGen ? "Generating…" : "Generate"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={
                                    busy ||
                                    Boolean(generatingId) ||
                                    Boolean(editBusy)
                                  }
                                  onClick={() =>
                                    isEditing
                                      ? closeEditor()
                                      : void openEdit(id)
                                  }
                                  className={`rounded-md border px-2 py-1 text-[10px] font-bold disabled:opacity-50 ${
                                    isEditing
                                      ? "border-ocean-700 bg-ocean-800 text-white"
                                      : "border-ocean-300 bg-white text-ocean-900"
                                  }`}
                                >
                                  {isEditing
                                    ? "Editing…"
                                    : editBusy === `edit-${id}`
                                      ? "Loading…"
                                      : "Edit"}
                                </button>
                              </div>
                              <p
                                className={`text-[10px] font-bold leading-snug ${
                                  recentlyImproved
                                    ? "text-emerald-800"
                                    : genPri.hintClass
                                }`}
                              >
                                {recentlyImproved
                                  ? "Content improved — hidden from this list"
                                  : genPri.label}
                              </p>
                              {improve ? (
                                <div className="space-y-0.5">
                                  <span
                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                      recentlyImproved
                                        ? "bg-emerald-700 text-white"
                                        : improvePctClass(improve.estimatedPct)
                                    }`}
                                  >
                                    {recentlyImproved
                                      ? "Done"
                                      : `~${improve.estimatedPct}% improve`}
                                  </span>
                                  <p className="text-[10px] leading-snug text-ocean-700">
                                    Target: {improve.targetBand}
                                  </p>
                                  <p className="text-[10px] leading-snug text-ocean-600">
                                    {improve.summary}
                                  </p>
                                </div>
                              ) : ranking === "POSITION_11_TO_20" ? (
                                <p className="text-[10px] leading-snug text-amber-900">
                                  Generate → title + links + content · Edit → images too
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[10px] text-ocean-400">—</span>
                          )}
                        </td>
                      </tr>
                      {isEditing && editingSession ? (
                        <tr className="bg-ocean-50/50">
                          <td colSpan={9} className="p-4">
                            <div
                              className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
                                editingSession.rankingStatus ===
                                "POSITION_11_TO_20"
                                  ? "border-amber-200 bg-amber-50 text-amber-950"
                                  : "border-ocean-100 bg-white text-ocean-900"
                              }`}
                            >
                              <p className="font-bold">
                                {editingSession.guidanceHeadline}
                              </p>
                              <ul className="mt-1 list-inside list-disc space-y-0.5">
                                {editingSession.guidanceBullets.map((b) => (
                                  <li key={b}>{b}</li>
                                ))}
                              </ul>
                            </div>
                            {editingSession.pageType === "blog" &&
                            editingBlog ? (
                              <BlogPostEditorPanel
                                editing={editingBlog}
                                busy={editBusy}
                                publishSlots={PUBLISH_SLOTS}
                                aiImageProgress={aiImageProgress}
                                onChangeEditing={setEditingBlog}
                                onSave={(opts) => void saveEditedBlog(opts)}
                                onCancelEdit={closeEditor}
                                onUploadImage={(file) =>
                                  void uploadBlogImage(file)
                                }
                                onGenerateAiImage={() =>
                                  void generateBlogAiImage()
                                }
                              />
                            ) : null}
                            {editingSession.pageType === "guide" &&
                            editingGuide ? (
                              <GuideEditorPanel
                                editing={editingGuide}
                                busy={editBusy}
                                onChangeEditing={setEditingGuide}
                                onSave={() => void saveEditedGuide()}
                                onCancelEdit={closeEditor}
                                onUploadImage={(file, kind) =>
                                  void uploadGuideImage(file, kind)
                                }
                                generatingContent={
                                  generatingId === editingSession.urlId
                                }
                                onGenerateContent={() =>
                                  void generateImprove(editingSession.urlId)
                                }
                              />
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {urls.length === 0 ? (
              <p className="p-4 text-sm text-ocean-600">
                No URLs in this filter. Try <strong>Discover URLs</strong>, then{" "}
                <strong>Sync analytics</strong> / <strong>Inspect queue</strong> on Overview.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "issues" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2">
            {(
              [
                ["", "All"],
                ["CRITICAL", "Critical"],
                ["HIGH", "High"],
                ["MEDIUM", "Medium"],
                ["LOW", "Low"],
              ] as const
            ).map(([sev, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setIssueSeverity(sev)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  issueSeverity === sev
                    ? "bg-red-800 text-white"
                    : "border border-ocean-200 bg-white text-ocean-800"
                }`}
              >
                {label}
              </button>
            ))}
            </div>
            {issues.length > 0 ? (
              <button
                type="button"
                disabled={resolvingAllIssues || resolvingIssueId !== null}
                onClick={() => void resolveAllVisibleIssues()}
                className="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm disabled:opacity-60"
              >
                {resolvingAllIssues ? "Resolving…" : "Resolve all in filter"}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-ocean-600">
            Resolve creates a live blog at the broken URL (free stock images) or
            redirects to the best matching live article when generation fails.
          </p>
          <ul className="space-y-2">
            {issues.map((i) => (
              <li
                key={String(i.id)}
                className="rounded-lg border border-ocean-100 bg-white p-3 text-sm"
              >
                <p className="font-bold text-ocean-900">
                  <span
                    className={
                      String(i.severity) === "CRITICAL"
                        ? "text-red-700"
                        : String(i.severity) === "HIGH"
                          ? "text-orange-700"
                          : "text-ocean-700"
                    }
                  >
                    [{String(i.severity)}]
                  </span>{" "}
                  {String(i.title)}
                </p>
                {i.url ? (
                  <a
                    href={String(i.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-cyan-800 hover:underline"
                  >
                    {String(i.url)}
                  </a>
                ) : (
                  <p className="text-xs text-ocean-600">—</p>
                )}
                <p className="mt-1 text-ocean-800">{String(i.detail)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      resolvingIssueId === String(i.id) || resolvingAllIssues
                    }
                    onClick={() => void resolveIssue(String(i.id))}
                    className="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm disabled:opacity-60"
                  >
                    {resolvingIssueId === String(i.id)
                      ? "Resolving…"
                      : "Resolve issue"}
                  </button>
                </div>
              </li>
            ))}
            {issues.length === 0 ? (
              <p className="text-sm text-ocean-600">No open issues in this filter.</p>
            ) : null}
          </ul>
        </div>
      ) : null}

      {tab === "approvals" ? (
        <ul className="space-y-3">
          {approvals.map((a) => (
            <li
              key={String(a.id)}
              className="rounded-xl border border-ocean-100 bg-white p-3 text-sm shadow-sm"
            >
              <p className="font-bold text-ocean-900">{String(a.actionType)}</p>
              <p className="text-xs text-cyan-800">{String(a.url)}</p>
              <p className="mt-1 text-ocean-800">{String(a.reason)}</p>
              <p className="mt-1 text-xs text-ocean-600">{String(a.expectedImpact)}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await adminFetch("/api/admin/gsc-agent/approvals", {
                        method: "POST",
                        body: JSON.stringify({
                          approvalId: a.id,
                          decision: "approved",
                        }),
                      });
                      setOk("Approved — apply content edits manually in CMS.");
                      await load("approvals");
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : "Failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-full border border-ocean-200 px-3 py-1 text-xs font-bold text-ocean-800"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await adminFetch("/api/admin/gsc-agent/approvals", {
                        method: "POST",
                        body: JSON.stringify({
                          approvalId: a.id,
                          decision: "rejected",
                        }),
                      });
                      await load("approvals");
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : "Failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {approvals.length === 0 ? (
            <p className="text-sm text-ocean-600">No pending approvals.</p>
          ) : null}
        </ul>
      ) : null}

      {tab === "sitemaps" ? (
        <div className="space-y-3">
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="font-semibold text-cyan-800 underline" href="/sitemap.xml">
                /sitemap.xml
              </Link>{" "}
              (main App Router sitemap)
            </li>
            <li>
              <Link
                className="font-semibold text-cyan-800 underline"
                href="/sitemaps/blog.xml"
              >
                /sitemaps/blog.xml
              </Link>
            </li>
            <li>
              <Link
                className="font-semibold text-cyan-800 underline"
                href="/sitemaps/services.xml"
              >
                /sitemaps/services.xml
              </Link>
            </li>
            <li>
              <Link
                className="font-semibold text-cyan-800 underline"
                href="/sitemaps/static.xml"
              >
                /sitemaps/static.xml
              </Link>
            </li>
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runJob("sitemap")}
            className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Submit sitemaps via Search Console API
          </button>
          <ul className="space-y-2">
            {sitemaps.map((s) => (
              <li
                key={String(s.id)}
                className="rounded-lg border border-ocean-100 bg-white p-2 text-xs"
              >
                {String(s.path)} · submitted {String(s.lastSubmittedAt || "—")} ·{" "}
                {s.lastError ? (
                  <span className="text-red-700">{String(s.lastError)}</span>
                ) : (
                  String(s.lastGoogleStatus || "ok")
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "connection" ? (
        <div className="space-y-3 rounded-xl border border-ocean-100 bg-white p-4 text-sm">
          <p>
            OAuth configured:{" "}
            <strong>{connection?.oauthConfigured ? "yes" : "no"}</strong> · Encryption:{" "}
            <strong>{connection?.encryptionConfigured ? "yes" : "no"}</strong> ·
            Connected: <strong>{connection?.connected ? "yes" : "no"}</strong> · SA
            fallback:{" "}
            <strong>{connection?.serviceAccountFallback ? "yes" : "no"}</strong>
          </p>
          {connection?.lastError ? (
            <p className="text-red-700">{String(connection.lastError)}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white"
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  const data = await adminFetch("/api/admin/gsc-agent/auth-url", {
                    method: "POST",
                    body: "{}",
                  });
                  window.location.href = data.url;
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Auth URL failed");
                  setBusy(false);
                }
              }}
            >
              Connect Google account
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-bold"
              onClick={async () => {
                setBusy(true);
                try {
                  await adminFetch("/api/admin/gsc-agent/disconnect", {
                    method: "POST",
                    body: "{}",
                  });
                  setOk("Disconnected");
                  await load("connection");
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Disconnect failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Disconnect
            </button>
          </div>
          <div>
            <label className="text-xs font-bold text-ocean-700">
              Search Console property
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={propertyUri}
              onChange={(e) => setPropertyUri(e.target.value)}
            >
              <option value="">Select property…</option>
              {sites.map((s) => (
                <option key={s.siteUrl} value={s.siteUrl}>
                  {s.siteUrl}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ocean-600">
              Prefer the same property as GSC UI (ideally{" "}
              <code>https://www.bookscubagoa.com/</code> or Domain property). Apex↔www
              redirects create “Page with redirect / Redirect error” in GSC.
            </p>
            <button
              type="button"
              disabled={busy || !propertyUri}
              className="mt-2 rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-900"
              onClick={async () => {
                setBusy(true);
                try {
                  await adminFetch("/api/admin/gsc-agent/connection", {
                    method: "POST",
                    body: JSON.stringify({ propertyUri }),
                  });
                  setOk("Property saved");
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Save failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save property
            </button>
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="max-w-lg space-y-3 rounded-xl border border-ocean-100 bg-white p-4 text-sm">
          <label className="block">
            <span className="text-xs font-bold">Agent mode</span>
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={agentMode}
              onChange={(e) => setAgentMode(e.target.value)}
            >
              <option value="monitor_only">Monitor only</option>
              <option value="approval_required">Approval required (default)</option>
              <option value="safe_auto_fix">Safe auto-fix</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={paused}
              onChange={(e) => setPaused(e.target.checked)}
            />
            <span className="font-bold text-red-800">Emergency pause</span>
          </label>
          <button
            type="button"
            disabled={busy}
            className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white"
            onClick={async () => {
              setBusy(true);
              try {
                await adminFetch("/api/admin/gsc-agent/settings", {
                  method: "POST",
                  body: JSON.stringify({ agentMode, paused }),
                });
                setOk("Settings saved");
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save settings
          </button>
          <p className="text-xs text-ocean-600">
            Quota used today: {String(settings?.inspectionsUsedToday ?? 0)} /{" "}
            {String(settings?.inspectionDailyQuota ?? 50)}
          </p>
        </div>
      ) : null}

      {tab === "logs" ? (
        <ul className="space-y-1.5 text-xs">
          {actions.map((a) => (
            <li
              key={String(a.id)}
              className="rounded border border-ocean-50 bg-white px-2 py-1.5"
            >
              <span className="font-bold">{String(a.action)}</span> ·{" "}
              {String(a.detail)} · {String(a.createdAt)}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-ocean-500">
        Related:{" "}
        <Link href="/admin/seo-agent" className="underline">
          SEO AI report
        </Link>{" "}
        ·{" "}
        <Link href="/admin/seo-health" className="underline">
          SEO health
        </Link>{" "}
        · Docs: <code>docs/GSC-INDEXING-AGENT.md</code>
      </p>

      <GscAutomationStartWizard
        open={automationWizardOpen}
        onClose={() => setAutomationWizardOpen(false)}
        busy={automationBusy}
        onSubmit={(config) => void startGscAutomation(config)}
      />
    </div>
  );
}
