"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { AdminContentSeoNav } from "@/components/admin/AdminContentSeoNav";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogPostFirestore } from "@/lib/blog-firestore";
import { utcIsoToIstDatetimeLocalValue } from "@/lib/blog-automation/schedule-ist";
import {
  getContentTrafficForSlug,
  type ContentTraffic,
} from "@/lib/analytics-content-traffic";
import type {
  AiBlogGenerationJob,
  ClusterConflict,
  SeoBlogCenterSettings,
  SeoBlogDraft,
  SeoBlogKeyword,
  SeoKeywordCluster,
} from "@/lib/seo-blog-center/types";
import {
  ALL_RESEARCH_CATEGORY_IDS,
  RESEARCH_CATEGORIES,
  type ResearchCategoryId,
} from "@/lib/seo-blog-center/research-categories";
import { enrichConflictsFromUrls } from "@/lib/seo-blog-center/conflict-display";
import { BlogPostEditorPanel } from "@/app/admin/blog-automation/BlogPostEditorPanel";
import { seoBlogDraftToFirestorePost } from "@/lib/seo-blog-center/draft-to-post";

type Tab =
  | "dashboard"
  | "research"
  | "clusters"
  | "queue"
  | "settings"
  | "logs";

const QUEUE_PUBLISH_SLOTS = [
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

const FALLBACK_SERVICE_OPTIONS = [
  { slug: "scuba-diving", name: "Scuba Diving" },
  { slug: "water-sports", name: "Water Sports" },
  { slug: "north-goa-tour", name: "North Goa Tour" },
  { slug: "south-goa-tour", name: "South Goa Tour" },
  { slug: "dudhsagar-trip", name: "Dudhsagar Trip" },
  { slug: "dolphin-trip", name: "Dolphin Trip" },
  { slug: "casino-bookings", name: "Casino Bookings" },
  { slug: "night-club", name: "Night Club" },
  { slug: "pubs", name: "Pubs" },
  { slug: "disco", name: "Disco" },
  { slug: "flyboarding", name: "Flyboarding" },
  { slug: "bungee-jumping", name: "Bungee Jumping" },
];

function conflictStyle(code: ClusterConflict["reasonCode"] | string): string {
  switch (code) {
    case "near_duplicate_topic":
      return "border-red-200 bg-red-50 text-red-900";
    case "high_keyword_overlap":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "medium_keyword_overlap":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "same_intent_covered":
      return "border-violet-200 bg-violet-50 text-violet-900";
    default:
      return "border-sky-200 bg-sky-50 text-sky-900";
  }
}

function similarityBadgeClass(pct: number): string {
  if (pct >= 80) return "bg-red-600 text-white";
  if (pct >= 65) return "bg-orange-500 text-white";
  if (pct >= 50) return "bg-amber-500 text-white";
  return "bg-sky-600 text-white";
}

/** Format ISO timestamp as IST date + time with AM/PM, e.g. 23 Jul 2026, 07:30 PM */
function formatIstDateTimeAmPm(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function clusterConflictsList(c: SeoKeywordCluster): ClusterConflict[] {
  if (c.conflicts?.length) return c.conflicts;
  if (c.conflictingUrls?.length) {
    return enrichConflictsFromUrls(c.primaryKeyword, c.conflictingUrls);
  }
  return [];
}

/** Clusters awaiting admin review — approved/queued items live in Generation queue. */
function clusterAwaitingApproval(c: SeoKeywordCluster): boolean {
  return c.status === "pending";
}

async function adminToken(): Promise<string> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Sign in at /admin/login first.");
  await auth.currentUser.getIdToken(true);
  return auth.currentUser.getIdToken();
}

async function adminFetch(path: string, init?: RequestInit) {
  const token = await adminToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export default function AiBlogAutomationPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [stats, setStats] = useState<Record<string, number>>({});
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<SeoBlogCenterSettings | null>(null);
  const [serviceOptions, setServiceOptions] = useState(FALLBACK_SERVICE_OPTIONS);
  const [keywords, setKeywords] = useState<SeoBlogKeyword[]>([]);
  const [clusters, setClusters] = useState<SeoKeywordCluster[]>([]);
  const [jobs, setJobs] = useState<AiBlogGenerationJob[]>([]);
  const [drafts, setDrafts] = useState<SeoBlogDraft[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [blogViewsBySlug, setBlogViewsBySlug] = useState<
    Record<string, ContentTraffic>
  >({});
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewsError, setViewsError] = useState<string | null>(null);
  const [blogPostsBySlug, setBlogPostsBySlug] = useState<
    Record<string, BlogPostFirestore>
  >({});
  const [editingPost, setEditingPost] = useState<BlogPostFirestore | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [aiImageProgress, setAiImageProgress] = useState<number | null>(null);
  const [logs, setLogs] = useState<
    { id: string; type: string; message: string; createdAt: string }[]
  >([]);

  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());

  const [serviceSlug, setServiceSlug] = useState("scuba-diving");
  const [seedKeyword, setSeedKeyword] = useState("scuba diving in Goa");
  const [maxKeywords, setMaxKeywords] = useState(250);
  const [includeAds, setIncludeAds] = useState(true);
  const [includeGsc, setIncludeGsc] = useState(true);
  const [includeLocal, setIncludeLocal] = useState(true);
  const [researchCategories, setResearchCategories] = useState<
    Set<ResearchCategoryId>
  >(() => new Set(ALL_RESEARCH_CATEGORY_IDS));
  const [generateAiImage, setGenerateAiImage] = useState(true);
  const [clusterFilter, setClusterFilter] = useState<
    "all" | "conflicts" | "no_conflicts"
  >("no_conflicts");
  const [imageAudit, setImageAudit] = useState<{
    scanned?: number;
    exactUrlDuplicateGroups?: number;
    nearDuplicateCount?: number;
    wrongTopicCount?: number;
    regenerationRequired?: number;
    note?: string;
    rows?: Array<{
      slug: string;
      title: string;
      recommendedAction: string;
      suggestedVisualCategory: string;
      wrongTopic?: boolean;
    }>;
  } | null>(null);

  const normalizeTrafficMap = useCallback(
    (raw: Record<string, ContentTraffic> | undefined) => {
      const out: Record<string, ContentTraffic> = {};
      for (const [slug, t] of Object.entries(raw ?? {})) {
        const key = slug.trim().toLowerCase();
        if (!key) continue;
        out[key] = {
          views: Math.max(0, Math.round(Number(t?.views ?? 0))),
          visitors: Math.max(0, Math.round(Number(t?.visitors ?? 0))),
        };
      }
      return out;
    },
    [],
  );

  const loadBlogViews = useCallback(
    async (opts?: { silent?: boolean; full?: boolean; slugs?: string[] }) => {
      if (!opts?.silent) setViewsLoading(true);
      setViewsError(null);
      try {
        const slugList = (opts?.slugs ?? [])
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 80);
        const params = new URLSearchParams();
        if (opts?.full && slugList.length === 0) params.set("mode", "full");
        else params.set("mode", "aggregated");
        if (slugList.length > 0) params.set("slugs", slugList.join(","));
        const qs = params.toString() ? `?${params.toString()}` : "";
        const traffic = await adminFetch(`/api/admin/blog-traffic${qs}`);
        setBlogViewsBySlug((prev) => ({
          ...prev,
          ...normalizeTrafficMap(
            (traffic.bySlug ?? {}) as Record<string, ContentTraffic>,
          ),
        }));
      } catch (e) {
        setViewsError(
          e instanceof Error ? e.message : "Could not load view counts",
        );
        if (!opts?.silent) {
          setBlogViewsBySlug((prev) =>
            Object.keys(prev).length ? prev : {},
          );
        }
      } finally {
        if (!opts?.silent) setViewsLoading(false);
      }
    },
    [normalizeTrafficMap],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, postsRes] = await Promise.all([
        adminFetch("/api/admin/ai-blog-automation"),
        adminFetch("/api/admin/blog-posts").catch(() => ({ posts: [] })),
      ]);
      setStats(data.stats ?? {});
      setProviders(data.providers ?? {});
      setSettings(data.settings ?? null);
      if (Array.isArray(data.services) && data.services.length > 0) {
        setServiceOptions(
          data.services.map((s: { slug?: string; name?: string; title?: string }) => ({
            slug: String(s.slug || ""),
            name: String(s.name || s.title || s.slug || ""),
          })).filter((s: { slug: string }) => s.slug),
        );
      }
      setKeywords(data.keywords ?? []);
      setClusters(
        (data.clusters ?? []).filter((c: SeoKeywordCluster) =>
          clusterAwaitingApproval(c),
        ),
      );
      setJobs(data.jobs ?? []);
      setDrafts(data.drafts ?? []);
      setLogs(data.logs ?? []);
      const bySlug: Record<string, BlogPostFirestore> = {};
      for (const p of (postsRes.posts ?? []) as BlogPostFirestore[]) {
        if (p?.slug) bySlug[p.slug] = p;
      }
      setBlogPostsBySlug(bySlug);
      setEditingPost((prev) => {
        if (!prev?.slug) return prev;
        return bySlug[prev.slug] ?? prev;
      });
      // Seed views from denormalized blogPosts.viewCount immediately.
      const fromPosts: Record<string, ContentTraffic> = {};
      for (const p of Object.values(bySlug)) {
        const v = Math.max(0, Math.round(Number(p.viewCount ?? 0)));
        if (v > 0) fromPosts[p.slug.toLowerCase()] = { views: v, visitors: 1 };
      }
      if (Object.keys(fromPosts).length) {
        setBlogViewsBySlug((prev) => ({ ...fromPosts, ...prev }));
      }
      const jobSlugs = (data.jobs ?? [])
        .map((j: AiBlogGenerationJob) => {
          const draft = (data.drafts as SeoBlogDraft[] | undefined)?.find(
            (d) => d.id === j.generatedDraftId,
          );
          return (
            j.generatedBlogSlug ||
            draft?.publishedBlogSlug ||
            draft?.slug ||
            ""
          );
        })
        .filter(Boolean);
      void loadBlogViews({
        silent: true,
        slugs: [...new Set([...jobSlugs, ...Object.keys(bySlug)])],
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [loadBlogViews]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!zoomedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [zoomedImage]);

  const keywordById = useMemo(() => {
    const map = new Map<string, SeoBlogKeyword>();
    for (const k of keywords) map.set(k.id, k);
    return map;
  }, [keywords]);

  const keywordByText = useMemo(() => {
    const map = new Map<string, SeoBlogKeyword>();
    for (const k of keywords) {
      map.set(k.keyword.toLowerCase(), k);
      if (k.displayKeyword) map.set(k.displayKeyword.toLowerCase(), k);
    }
    return map;
  }, [keywords]);

  function primaryKeywordForCluster(c: SeoKeywordCluster): SeoBlogKeyword | null {
    if (c.primaryKeywordId && keywordById.get(c.primaryKeywordId)) {
      return keywordById.get(c.primaryKeywordId)!;
    }
    for (const id of c.keywordIds || []) {
      const k = keywordById.get(id);
      if (k) return k;
    }
    return (
      keywordByText.get(c.primaryKeyword.toLowerCase()) ||
      null
    );
  }

  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      if (!clusterAwaitingApproval(c)) return false;
      const hasConflict = clusterConflictsList(c).length > 0;
      if (clusterFilter === "conflicts") return hasConflict;
      // Default / "all" / "no_conflicts": never show conflict keywords in the main list
      return !hasConflict;
    });
  }, [clusters, clusterFilter]);

  const pendingReadyCount = useMemo(
    () =>
      clusters.filter(
        (c) => clusterAwaitingApproval(c) && clusterConflictsList(c).length === 0,
      ).length,
    [clusters],
  );

  const pendingConflictCount = useMemo(
    () =>
      clusters.filter(
        (c) => clusterAwaitingApproval(c) && clusterConflictsList(c).length > 0,
      ).length,
    [clusters],
  );

  async function runResearch() {
    setBusy("research");
    setErr(null);
    setOk(null);
    try {
      const svc = serviceOptions.find((s) => s.slug === serviceSlug);
      const data = await adminFetch("/api/admin/ai-blog-automation/research", {
        method: "POST",
        body: JSON.stringify({
          serviceSlug,
          serviceName: svc?.name,
          seedKeyword,
          maxKeywords,
          includeAds,
          includeGsc,
          includeLocal,
          researchCategories: [...researchCategories],
          country: "India",
          state: "Goa",
          language: "en",
          excludeCovered: true,
        }),
      });
      setOk(
        `Research done: ${data.keywords?.length ?? 0} keywords → ${data.clusters?.length ?? 0} clusters (max ${data.cappedAt})`,
      );
      setTab("clusters");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(null);
    }
  }

  async function approveSelected(confirmCost = false) {
    const ids = [...selectedClusters];
    if (ids.length === 0) {
      setErr("Select at least one cluster");
      return;
    }
    setBusy("approve");
    setErr(null);
    setOk(null);
    try {
      const preview = await adminFetch("/api/admin/ai-blog-automation/approve", {
        method: "POST",
        body: JSON.stringify({
          clusterIds: ids,
          action: "preview",
          generateAiImage,
        }),
      });
      if (
        !confirm(
          `Queue & start generating ${preview.estimatedArticles} article(s)?\n` +
            `AI featured image: ${generateAiImage ? "YES (OpenAI cost)" : "NO — free stock (Pexels → Pixabay → Unsplash → WebP)"}\n` +
            `Estimated OpenAI cost: ~$${preview.estimatedCostUsd} (estimate only).\n` +
            `Generation starts automatically after approve (up to 3 at once).\n` +
            `${preview.imageNote || ""}\n${preview.warning}`,
        )
      ) {
        setBusy(null);
        return;
      }
      const data = await adminFetch("/api/admin/ai-blog-automation/approve", {
        method: "POST",
        body: JSON.stringify({
          clusterIds: ids,
          action: "approve",
          confirmCost: true,
          generateAiImage,
        }),
      });
      const processed = Number(data.processed ?? 0);
      const paused = data.queuePaused === true;
      if (paused) {
        setOk(
          `Queued ${data.jobsCreated} job(s), but queue is paused — resume queue or click Process jobs.`,
        );
      } else if (processed > 0) {
        setOk(
          `Queued ${data.jobsCreated} and started generating ${processed} blog(s) automatically (${generateAiImage ? "AI" : "free stock"} images). Est. ~$${data.estimatedCostUsd}`,
        );
      } else {
        setOk(
          `Queued ${data.jobsCreated} job(s). Images: ${generateAiImage ? "AI" : "free stock"}. Est. cost ~$${data.estimatedCostUsd}`,
        );
      }
      setClusters((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedClusters(new Set());
      setTab("queue");
      await load();
      // Refresh again shortly so draft-ready / published status appears.
      if (processed > 0) {
        window.setTimeout(() => void load(), 2500);
      }
    } catch (e) {
      if (!confirmCost && e instanceof Error && e.message.includes("Cost")) {
        /* handled above */
      }
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function rejectSelected() {
    const ids = [...selectedClusters];
    if (ids.length === 0) {
      setErr("Select at least one cluster");
      return;
    }
    if (!confirm(`Reject ${ids.length} selected cluster(s)? They will be removed from this list.`)) {
      return;
    }
    setBusy("reject");
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/ai-blog-automation/approve", {
        method: "POST",
        body: JSON.stringify({ clusterIds: ids, action: "reject" }),
      });
      setOk(`Rejected ${data.rejected ?? ids.length} cluster(s)`);
      setClusters((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedClusters(new Set());
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSelected() {
    const ids = [...selectedClusters];
    if (ids.length === 0) {
      setErr("Select at least one cluster");
      return;
    }
    if (
      !confirm(
        `Permanently delete ${ids.length} selected cluster(s) and linked keywords? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy("delete");
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/ai-blog-automation/approve", {
        method: "POST",
        body: JSON.stringify({ clusterIds: ids, action: "delete" }),
      });
      setOk(`Deleted ${data.deleted ?? ids.length} cluster(s)`);
      setClusters((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedClusters(new Set());
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function processQueueNow() {
    setBusy("queue");
    try {
      const data = await adminFetch("/api/admin/ai-blog-automation", {
        method: "PATCH",
        body: JSON.stringify({ action: "processQueue", maxJobs: 3 }),
      });
      const processed = Number(data.processed ?? 0);
      const reconciled = Number(data.reconciled ?? 0);
      const waitingCount = Number(data.waitingCount ?? 0);
      const errors = Array.isArray(data.errors)
        ? data.errors.filter(Boolean).map(String)
        : [];
      if (processed > 0) {
        setOk(
          `Processed ${processed} job(s)${reconciled > 0 ? ` · reset ${reconciled} stuck` : ""}`,
        );
      } else if (errors.length > 0) {
        setErr(errors.join(" · "));
      } else if (waitingCount > 0) {
        setErr(
          `No jobs could be claimed (${waitingCount} still waiting). Try again in a minute or delete broken rows.`,
        );
      } else {
        setOk("No waiting jobs in the queue");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Queue process failed");
    } finally {
      setBusy(null);
    }
  }

  function jobBlogSlug(j: AiBlogGenerationJob): string {
    const draft = j.generatedDraftId
      ? drafts.find((d) => d.id === j.generatedDraftId)
      : undefined;
    return (
      j.generatedBlogSlug ||
      draft?.publishedBlogSlug ||
      draft?.slug ||
      ""
    );
  }

  function jobDraft(j: AiBlogGenerationJob): SeoBlogDraft | undefined {
    if (j.generatedDraftId) {
      const byId = drafts.find((d) => d.id === j.generatedDraftId);
      if (byId) return byId;
    }
    const byJob = drafts.find((d) => d.jobId === j.id);
    if (byJob) return byJob;
    const slug = j.generatedBlogSlug;
    if (slug) {
      return drafts.find(
        (d) => d.slug === slug || d.publishedBlogSlug === slug,
      );
    }
    return undefined;
  }

  /** Resolve editable post from blogPosts or SEO draft (draft-ready jobs). */
  function resolveEditablePost(j: AiBlogGenerationJob): BlogPostFirestore | null {
    const slug = jobBlogSlug(j);
    if (slug && blogPostsBySlug[slug]) return blogPostsBySlug[slug]!;
    const draft = jobDraft(j);
    if (draft?.slug && draft.title && draft.content) {
      return seoBlogDraftToFirestorePost(draft, false);
    }
    return null;
  }

  async function openQueueEditor(j: AiBlogGenerationJob) {
    const post = resolveEditablePost(j);
    if (!post) {
      setErr(
        "Draft content not found for this job. Wait until generation finishes, then Refresh.",
      );
      return;
    }
    setErr(null);
    setBusy(`edit-${post.slug}`);
    try {
      // Materialize unpublished blogPosts doc so Save / image APIs work for drafts.
      if (!blogPostsBySlug[post.slug]) {
        await adminFetch("/api/admin/blog-posts", {
          method: "PATCH",
          body: JSON.stringify({
            ...post,
            publishNow: false,
          }),
        });
        setBlogPostsBySlug((prev) => ({ ...prev, [post.slug]: post }));
      }
      setEditingPost(post);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open editor");
    } finally {
      setBusy(null);
    }
  }

  function jobPublishedAt(j: AiBlogGenerationJob): string | null {
    const draft = j.generatedDraftId
      ? drafts.find((d) => d.id === j.generatedDraftId)
      : undefined;
    return (
      draft?.publishedAt ||
      (j.status === "published" ? j.completedAt || null : null) ||
      j.completedAt ||
      null
    );
  }

  async function deleteQueueBlogs(jobIds: string[]) {
    if (jobIds.length === 0) {
      setErr("Select at least one job");
      return;
    }
    const targets = jobs.filter((j) => jobIds.includes(j.id));
    const slugs = [
      ...new Set(targets.map((j) => jobBlogSlug(j)).filter(Boolean)),
    ];
    if (
      !confirm(
        slugs.length
          ? `Delete ${slugs.length} blog(s) permanently?\n${slugs.map((s) => `/blog/${s}`).join("\n")}\n\nRelated queue jobs will also be removed.`
          : `Remove ${jobIds.length} queue job(s)? (No published blog slug found for some items.)`,
      )
    ) {
      return;
    }
    setBusy("queue-delete");
    setErr(null);
    setOk(null);
    try {
      if (slugs.length > 0) {
        const data = await adminFetch("/api/admin/blog-posts/bulk", {
          method: "POST",
          body: JSON.stringify({ action: "delete", slugs }),
        });
        const okN = Array.isArray(data.ok) ? data.ok.length : slugs.length;
        setOk(`Deleted ${okN} blog(s)`);
      }
      await adminFetch("/api/admin/ai-blog-automation", {
        method: "PATCH",
        body: JSON.stringify({ action: "deleteJobs", jobIds }),
      });
      setSelectedJobs(new Set());
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveEditedQueuePost(opts?: { publishNow?: boolean }) {
    if (!editingPost) return;
    setBusy(`save-${editingPost.slug}`);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/blog-posts", {
        method: "PATCH",
        body: JSON.stringify({
          ...editingPost,
          scheduledPublishAtIst: utcIsoToIstDatetimeLocalValue(
            editingPost.scheduledPublishAt,
          ),
          publishNow: opts?.publishNow === true,
        }),
      });
      if (opts?.publishNow) {
        const relatedJob = jobs.find((j) => jobBlogSlug(j) === editingPost.slug);
        if (relatedJob) {
          await adminFetch("/api/admin/ai-blog-automation", {
            method: "PATCH",
            body: JSON.stringify({
              action: "markJobPublished",
              jobId: relatedJob.id,
              slug: editingPost.slug,
            }),
          }).catch(() => null);
        }
      }
      setOk(
        opts?.publishNow
          ? `Published /blog/${editingPost.slug}`
          : `Saved /blog/${editingPost.slug}`,
      );
      setEditingPost(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function uploadQueueBlogImage(file: File | null) {
    if (!file || !editingPost) return;
    setBusy(`img-${editingPost.slug}`);
    setErr(null);
    try {
      const token = await adminToken();
      const fd = new FormData();
      fd.append("slug", editingPost.slug);
      fd.append("file", file);
      const res = await fetch("/api/admin/blog-image-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setEditingPost((e) =>
        e
          ? {
              ...e,
              featuredImageUrl: data.featuredImageUrl ?? e.featuredImageUrl,
              ogImageUrl:
                data.ogImageUrl ?? data.featuredImageUrl ?? e.ogImageUrl,
            }
          : e,
      );
      setOk(
        "New image uploaded and saved to the live blog. Hard-refresh the public page if you still see the old photo.",
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateQueueBlogImageWithAi() {
    if (!editingPost) return;
    const title = editingPost.title.trim();
    if (!title) {
      setErr("Enter a blog title first, then generate the image.");
      return;
    }
    setBusy(`ai-img-${editingPost.slug}`);
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
        body: JSON.stringify({ slug: editingPost.slug, title, forceOpenAi: true }),
      });
      window.clearInterval(tick);
      setAiImageProgress(100);
      setEditingPost((e) =>
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
      setOk(
        "AI image generated from the title, saved as WebP with top-left logo, and applied to the live blog.",
      );
      await load();
      window.setTimeout(() => setAiImageProgress(null), 900);
    } catch (e) {
      window.clearInterval(tick);
      setAiImageProgress(null);
      setErr(e instanceof Error ? e.message : "AI image generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateQueueBlogStockImage(slug?: string, title?: string) {
    const targetSlug = slug || editingPost?.slug;
    const targetTitle = title || editingPost?.title?.trim();
    if (!targetSlug || !targetTitle) {
      setErr("Blog slug and title required to regenerate image.");
      return;
    }
    setBusy(`stock-img-${targetSlug}`);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/blog-image-generate", {
        method: "POST",
        body: JSON.stringify({
          slug: targetSlug,
          title: targetTitle,
          useStock: true,
        }),
      });
      if (editingPost?.slug === targetSlug) {
        setEditingPost((e) =>
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
      }
      setOk(
        `Stock image regenerated for /blog/${targetSlug} (source: ${String(data.source || "stock")}).`,
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Stock image regenerate failed");
    } finally {
      setBusy(null);
    }
  }

  async function regenerateMissingBlogImages() {
    if (
      !confirm(
        "Regenerate featured images for all blogs missing a valid image?\n\nUses free stock (Pexels → Pixabay → Wikimedia). Processes up to 15 posts per click.",
      )
    ) {
      return;
    }
    setBusy("regen-missing");
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/blog-image-regenerate", {
        method: "POST",
        body: JSON.stringify({ missingOnly: true, useStock: true, max: 15 }),
      });
      const processed = Number(data.processed ?? 0);
      const failed = Number(data.failed ?? 0);
      setOk(
        `Regenerated ${processed} blog image(s)${failed ? ` · ${failed} failed` : ""}. Refresh live blog pages to verify.`,
      );
      if (failed > 0 && Array.isArray(data.results)) {
        const msg = (data.results as Array<{ slug: string; error?: string }>)
          .filter((r) => r.error)
          .slice(0, 3)
          .map((r) => `${r.slug}: ${r.error}`)
          .join(" · ");
        if (msg) setErr(msg);
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk image regenerate failed");
    } finally {
      setBusy(null);
    }
  }

  async function runImageAudit() {
    setBusy("image-audit");
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/blog-image-audit?limit=100");
      setImageAudit(data);
      setOk(
        `Image audit: ${data.regenerationRequired ?? 0} need regen, ${data.wrongTopicCount ?? 0} wrong-topic, ${data.exactUrlDuplicateGroups ?? 0} shared-URL groups. (Does not auto-regenerate.)`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Image audit failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(patch: Partial<SeoBlogCenterSettings>) {
    setBusy("settings");
    try {
      const data = await adminFetch("/api/admin/ai-blog-automation", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSettings(data.settings);
      const auto = data.autoApprove as
        | {
            mode?: string;
            result?: {
              jobsCreated?: number;
              skippedConflicts?: number;
            };
          }
        | null
        | undefined;
      if (auto?.result && (auto.result.jobsCreated ?? 0) > 0) {
        setOk(
          `Settings saved. Auto-queued ${auto.result.jobsCreated} cluster(s); skipped ${auto.result.skippedConflicts ?? 0} conflict(s) for manual review.`,
        );
        await load();
      } else if (
        patch.autoApprovePublishWithAiImage === true ||
        patch.autoApprovePublishWithoutImage === true
      ) {
        setOk(
          `Automation ON (${auto?.mode === "with_ai_image" ? "with AI images" : "with free stock images"}). Conflict keywords stay pending for manual review.`,
        );
        await load();
      } else {
        setOk("Settings saved");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function setAutoApproveMode(
    mode: "off" | "with_ai_image" | "without_image",
  ) {
    if (mode === "with_ai_image") {
      if (
        !confirm(
          "Turn ON auto-approve & publish WITH AI images?\n\n" +
            "• Pending clusters without conflicts → queue → generate → publish\n" +
            "• Conflict keywords are SKIPPED (you can approve/reject them later)\n" +
            "• Uses OpenAI for content + featured images (daily caps still apply)",
        )
      ) {
        return;
      }
      await saveSettings({
        autoApprovePublishWithAiImage: true,
        autoApprovePublishWithoutImage: false,
      });
      return;
    }
    if (mode === "without_image") {
      if (
        !confirm(
          "Turn ON auto-approve & publish WITH free stock images?\n\n" +
            "• Pending clusters without conflicts → queue → generate → publish\n" +
            "• Featured image: Pexels → Pixabay → Unsplash (saved as WebP on Firebase)\n" +
            "• Conflict keywords are SKIPPED for manual review",
        )
      ) {
        return;
      }
      await saveSettings({
        autoApprovePublishWithAiImage: false,
        autoApprovePublishWithoutImage: true,
      });
      return;
    }
    await saveSettings({
      autoApprovePublishWithAiImage: false,
      autoApprovePublishWithoutImage: false,
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "research", label: "New research" },
    { id: "clusters", label: "Clusters" },
    { id: "queue", label: "Generation queue" },
    { id: "settings", label: "Settings" },
    { id: "logs", label: "Logs" },
  ];

  return (
    <div>
      <AdminContentSeoNav />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">
            AI Blog Automation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Research keywords (Google Ads when configured + GSC + seeds) → cluster →
            approve → generate drafts automatically → review → publish. Use Clusters
            automation toggles to auto-approve (skips conflicts). Generation starts on
            approve — Process is only for stuck waiting jobs.
          </p>
        </div>
      </div>

      {err ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {ok}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tab === t.id
                ? "bg-ocean-800 text-white"
                : "border border-ocean-200 bg-white text-ocean-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-ocean-600">Loading…</p>
      ) : null}

      {tab === "dashboard" && !loading ? (
        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Keywords", stats.keywords],
            ["Pending keywords", stats.pendingKeywords],
            ["Clusters", stats.pendingClusters ?? stats.clusters],
            ["Waiting jobs", stats.waitingJobs],
            ["Failed jobs", stats.failedJobs],
            ["Drafts", stats.drafts],
            ["Published via center", stats.publishedDrafts],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                {label}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ocean-900">
                {value ?? 0}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
              Providers
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ocean-800">
              <li>OpenAI: {providers.openai ? "configured" : "missing"}</li>
              <li>Search Console: {providers.gsc ? "configured" : "missing"}</li>
              <li>
                Google Ads Keyword Planner:{" "}
                {providers.googleAds ? "configured" : "not configured (optional)"}
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Blog images
            </p>
            <p className="mt-1 text-xs text-ocean-700">
              Fix broken or missing hero images on published blogs. Uses free stock
              sources (no OpenAI cost).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy === "regen-missing"}
                onClick={() => void regenerateMissingBlogImages()}
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {busy === "regen-missing"
                  ? "Regenerating…"
                  : "Regenerate missing images (stock)"}
              </button>
              <button
                type="button"
                disabled={busy === "image-audit"}
                onClick={() => void runImageAudit()}
                className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-xs font-bold text-ocean-800 disabled:opacity-50"
              >
                {busy === "image-audit" ? "Auditing…" : "Image audit"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "research" ? (
        <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
          <h2 className="font-display text-base font-bold text-ocean-900">
            New keyword research
          </h2>
          <p className="mt-1 text-xs text-ocean-600">
            Max 250 opportunities. Local search adds beach/island/near-me variants.
            Turn on SEO categories below so research covers booking, questions,
            prices, packages, and nearby activities — not only one angle.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-ocean-800">
              Service / package
              <select
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={serviceSlug}
                onChange={(e) => {
                  setServiceSlug(e.target.value);
                  const s = serviceOptions.find((x) => x.slug === e.target.value);
                  if (s) setSeedKeyword(`${s.name} in Goa`);
                }}
              >
                {serviceOptions.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-ocean-800">
              Seed keyword
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
              />
            </label>
            <label className="text-sm text-ocean-800">
              Max keywords (≤250)
              <input
                type="number"
                min={1}
                max={250}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={maxKeywords}
                onChange={(e) => setMaxKeywords(Number(e.target.value) || 250)}
              />
            </label>
            <div className="flex flex-col gap-2 text-sm text-ocean-800">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeGsc}
                  onChange={(e) => setIncludeGsc(e.target.checked)}
                />
                Include Search Console queries
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeAds}
                  onChange={(e) => setIncludeAds(e.target.checked)}
                />
                Include Google Ads ideas (if configured)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeLocal}
                  onChange={(e) => setIncludeLocal(e.target.checked)}
                />
                Include local search (beaches, islands, near me, distance)
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-ocean-100 bg-sand/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ocean-900">
                  SEO keyword categories
                </p>
                <p className="mt-0.5 text-xs text-ocean-600">
                  Selected categories seed extra keywords and keep matching
                  opportunities for every page type.
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-full border border-ocean-200 bg-white px-3 py-1 font-semibold text-ocean-800 hover:bg-ocean-50"
                  onClick={() =>
                    setResearchCategories(new Set(ALL_RESEARCH_CATEGORY_IDS))
                  }
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="rounded-full border border-ocean-200 bg-white px-3 py-1 font-semibold text-ocean-800 hover:bg-ocean-50"
                  onClick={() => setResearchCategories(new Set())}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {RESEARCH_CATEGORIES.map((cat) => {
                const checked = researchCategories.has(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                      checked
                        ? "border-ocean-300 bg-white text-ocean-900"
                        : "border-ocean-100 bg-white/60 text-ocean-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(e) => {
                        setResearchCategories((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(cat.id);
                          else next.delete(cat.id);
                          return next;
                        });
                      }}
                    />
                    <span>
                      <span className="font-medium">{cat.label}</span>
                      <span className="mt-0.5 block text-[11px] text-ocean-600">
                        {cat.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {researchCategories.size === 0 ? (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Select at least one category (or Select all) before running
                research.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            disabled={busy === "research" || researchCategories.size === 0}
            onClick={() => void runResearch()}
            className="mt-4 rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "research" ? "Researching…" : "Run research"}
          </button>
        </section>
      ) : null}

      {tab === "clusters" ? (
        <section className="mt-4 overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm">
          {settings ? (
            <div className="border-b border-ocean-100 bg-gradient-to-r from-cyan-50/80 to-ocean-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
                Automation
              </p>
              <p className="mt-1 max-w-3xl text-xs text-ocean-600">
                When ON, pending clusters without conflicts are auto-queued, generated,
                and published (respects daily caps). Stock-image mode uses Pexels →
                Pixabay → Unsplash (WebP on Firebase). Conflict keywords stay pending
                for you to approve or reject manually.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-ocean-900 shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-700"
                    checked={settings.autoApprovePublishWithAiImage === true}
                    disabled={busy === "settings"}
                    onChange={(e) => {
                      if (e.target.checked) void setAutoApproveMode("with_ai_image");
                      else void setAutoApproveMode("off");
                    }}
                  />
                  Auto approve &amp; publish with AI images
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ocean-200 bg-white px-3 py-2 text-xs font-semibold text-ocean-900 shadow-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-cyan-700"
                    checked={settings.autoApprovePublishWithoutImage === true}
                    disabled={busy === "settings"}
                    onChange={(e) => {
                      if (e.target.checked) void setAutoApproveMode("without_image");
                      else void setAutoApproveMode("off");
                    }}
                  />
                  Auto approve &amp; publish with free stock images
                </label>
                {(settings.autoApprovePublishWithAiImage ||
                  settings.autoApprovePublishWithoutImage) && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                    Active · conflicts skipped
                  </span>
                )}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 border-b border-ocean-100 p-3">
            <p className="text-xs text-ocean-600">
              Only <strong>pending</strong> clusters appear here. After approve, they move to{" "}
              <strong>Generation queue</strong> and won&apos;t show again.
            </p>
            <div className="flex flex-wrap items-center gap-1 rounded-full border border-ocean-200 bg-white p-0.5 text-xs font-semibold">
              {(
                [
                  ["no_conflicts", "Without conflict"],
                  ["conflicts", "Conflicts only"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setClusterFilter(id);
                    setSelectedClusters(new Set());
                  }}
                  className={`rounded-full px-3 py-1.5 ${
                    clusterFilter === id
                      ? "bg-ocean-800 text-white"
                      : "text-ocean-800 hover:bg-ocean-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-full border border-ocean-200 bg-ocean-50 px-3 py-1.5 text-xs font-semibold text-ocean-900">
              <input
                type="checkbox"
                checked={
                  filteredClusters.length > 0 &&
                  filteredClusters.every((c) => selectedClusters.has(c.id))
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedClusters(new Set(filteredClusters.map((c) => c.id)));
                  } else {
                    setSelectedClusters(new Set());
                  }
                }}
              />
              Select all shown ({filteredClusters.length}
              {clusterFilter === "conflicts"
                ? ` conflicts · ${pendingConflictCount} total`
                : ` ready · ${pendingReadyCount} total`}
              )
            </label>
            <p className="text-sm font-semibold text-ocean-900">
              {selectedClusters.size} selected
            </p>
            <button
              type="button"
              className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs font-semibold"
              onClick={() => setSelectedClusters(new Set())}
            >
              Clear
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-ocean-700 underline"
              onClick={() => void load()}
            >
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-ocean-100 bg-ocean-50/50 p-3">
            <p className="text-xs font-semibold text-ocean-800">
              Featured image for selected:
            </p>
            <label className="flex items-center gap-1.5 text-xs text-ocean-900">
              <input
                type="radio"
                name="cluster-image-mode"
                checked={generateAiImage}
                onChange={() => setGenerateAiImage(true)}
              />
              With AI image (OpenAI cost)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ocean-900">
              <input
                type="radio"
                name="cluster-image-mode"
                checked={!generateAiImage}
                onChange={() => setGenerateAiImage(false)}
              />
              Free stock image (Pexels → Pixabay → Unsplash)
            </label>
            <button
              type="button"
              disabled={busy === "approve" || selectedClusters.size === 0}
              onClick={() => void approveSelected()}
              className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "approve"
                ? "Approving & generating…"
                : "Approve selected → generate"}
            </button>
            <button
              type="button"
              disabled={busy === "reject" || selectedClusters.size === 0}
              onClick={() => void rejectSelected()}
              className="rounded-full border border-amber-400 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-50"
            >
              {busy === "reject" ? "Rejecting…" : "Reject selected"}
            </button>
            <button
              type="button"
              disabled={busy === "delete" || selectedClusters.size === 0}
              onClick={() => void deleteSelected()}
              className="rounded-full border border-red-400 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50"
            >
              {busy === "delete" ? "Deleting…" : "Delete selected"}
            </button>
          </div>

          <div className="max-h-[32rem] overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-ocean-50 text-ocean-800">
                <tr>
                  <th className="p-2 w-8" aria-label="Select" />
                  <th className="p-2">Cluster / keyword</th>
                  <th className="p-2">Intent</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Volume</th>
                  <th className="p-2">GSC</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredClusters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-ocean-500">
                      {clusterFilter === "conflicts"
                        ? "No pending conflict clusters. Run research or switch to Without conflict."
                        : "No clusters awaiting approval. Run research or check Generation queue for approved jobs."}
                    </td>
                  </tr>
                ) : null}
                {filteredClusters.map((c) => {
                  const kw = primaryKeywordForCluster(c);
                  const conflicts = clusterConflictsList(c);
                  return (
                    <tr key={c.id} className="border-t border-ocean-50 align-top">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-cyan-700"
                          checked={selectedClusters.has(c.id)}
                          onChange={() => {
                            setSelectedClusters((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.id)) next.delete(c.id);
                              else next.add(c.id);
                              return next;
                            });
                          }}
                          aria-label={`Select cluster ${c.primaryKeyword}`}
                        />
                      </td>
                      <td className="max-w-[16rem] p-2 font-medium text-ocean-900">
                        <p>{c.primaryKeyword}</p>
                        <p className="mt-0.5 text-[10px] font-normal text-ocean-500">
                          {c.contentType}
                          {c.secondaryKeywords.length
                            ? ` · +${c.secondaryKeywords.length} variants`
                            : ""}
                        </p>
                        {kw?.scoreExplanation ? (
                          <p className="mt-0.5 line-clamp-2 text-[10px] font-normal text-ocean-500">
                            {kw.scoreExplanation}
                          </p>
                        ) : null}
                        {conflicts.length ? (
                          <ul className="mt-2 space-y-1.5">
                            {conflicts.map((cf) => (
                              <li
                                key={`${c.id}-${cf.path}`}
                                className={`rounded-md border px-2 py-1.5 text-[10px] font-normal ${conflictStyle(cf.reasonCode)}`}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${similarityBadgeClass(cf.similarityPercent)}`}
                                  >
                                    {cf.similarityPercent}% similar
                                  </span>
                                  <span className="font-mono">{cf.path}</span>
                                  <a
                                    href={cf.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-ocean-900 underline-offset-2 hover:underline"
                                  >
                                    Open
                                  </a>
                                </div>
                                <p className="mt-1 font-medium">{cf.reason}</p>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="p-2">{kw?.intent ?? c.intent ?? "—"}</td>
                      <td className="p-2 tabular-nums">
                        {kw?.opportunityScore ??
                          kw?.seoScore ??
                          c.opportunityScore ??
                          "—"}
                      </td>
                      <td className="p-2 tabular-nums">
                        {kw?.monthlySearches ?? kw?.searchVolume ?? "n/a"}
                      </td>
                      <td className="p-2 tabular-nums">
                        {kw?.gscImpressions != null
                          ? `${kw.gscImpressions} imp`
                          : "—"}
                      </td>
                      <td className="p-2">
                        {kw?.suggestedAction ?? c.contentType ?? "—"}
                      </td>
                      <td className="p-2">{c.status}</td>
                      <td className="p-2">{kw?.source ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "queue" ? (
        <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy === "queue"}
              onClick={() => void processQueueNow()}
              className="rounded-full bg-ocean-800 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "queue" ? "Processing…" : "Process stuck jobs"}
            </button>
            <button
              type="button"
              onClick={() =>
                void saveSettings({
                  pauseGenerationQueue: !settings?.pauseGenerationQueue,
                })
              }
              className="rounded-full border border-ocean-300 px-4 py-1.5 text-xs font-semibold"
            >
              {settings?.pauseGenerationQueue ? "Resume queue" : "Pause queue"}
            </button>
            <label className="flex items-center gap-2 rounded-full border border-ocean-200 bg-ocean-50 px-3 py-1.5 text-xs font-semibold">
              <input
                type="checkbox"
                checked={
                  jobs.length > 0 && selectedJobs.size === jobs.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedJobs(new Set(jobs.map((j) => j.id)));
                  } else {
                    setSelectedJobs(new Set());
                  }
                }}
              />
              Select all ({jobs.length})
            </label>
            <p className="text-xs font-semibold text-ocean-800">
              {selectedJobs.size} selected
            </p>
            <button
              type="button"
              disabled={busy === "queue-delete" || selectedJobs.size === 0}
              onClick={() => void deleteQueueBlogs([...selectedJobs])}
              className="rounded-full border border-red-400 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50"
            >
              {busy === "queue-delete"
                ? "Deleting…"
                : `Delete selected (${selectedJobs.size})`}
            </button>
            <button
              type="button"
              disabled={viewsLoading}
              className="text-xs font-semibold text-ocean-700 underline disabled:opacity-50"
              onClick={() => {
                const slugs = jobs
                  .map((j) => jobBlogSlug(j))
                  .filter(Boolean);
                void loadBlogViews({ full: true, slugs });
              }}
            >
              {viewsLoading ? "Refreshing views…" : "Refresh views"}
            </button>
            {viewsError ? (
              <p className="text-xs font-semibold text-red-700">{viewsError}</p>
            ) : null}
          </div>
          <div
            className={`mt-3 overflow-auto ${
              editingPost ? "max-h-[min(85vh,56rem)]" : "max-h-[28rem]"
            }`}
          >
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-ocean-50">
                <tr>
                  <th className="p-2 w-8" aria-label="Select" />
                  <th className="p-2">Image</th>
                  <th className="p-2">Keyword</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Published (IST)</th>
                  <th className="p-2">Views</th>
                  <th className="p-2">Attempts</th>
                  <th className="p-2">Quality</th>
                  <th className="p-2">Error</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const slug = jobBlogSlug(j);
                  const draft = jobDraft(j);
                  const post = resolveEditablePost(j);
                  const canOpen = Boolean(slug || post || draft);
                  const canEdit = Boolean(post);
                  const imageSrc =
                    post?.featuredImageUrl ||
                    post?.ogImageUrl ||
                    draft?.featuredImageUrl ||
                    draft?.ogImageUrl ||
                    "";
                  const traffic = getContentTrafficForSlug(blogViewsBySlug, slug);
                  const postViews = Math.max(
                    0,
                    Math.round(Number(post?.viewCount ?? 0)),
                  );
                  const views = !slug
                    ? null
                    : viewsLoading && traffic == null && postViews === 0
                      ? null
                      : Math.max(traffic?.views ?? 0, postViews);
                  const publishedLabel = formatIstDateTimeAmPm(
                    post?.publishedAt || draft?.publishedAt || jobPublishedAt(j),
                  );
                  const isEditing = Boolean(
                    editingPost &&
                      ((slug && editingPost.slug === slug) ||
                        (post && editingPost.slug === post.slug)),
                  );
                  return (
                    <Fragment key={j.id}>
                      <tr
                        className={`border-t border-ocean-50 ${
                          isEditing ? "bg-ocean-50/40" : ""
                        }`}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-cyan-700"
                            checked={selectedJobs.has(j.id)}
                            onChange={() => {
                              setSelectedJobs((prev) => {
                                const next = new Set(prev);
                                if (next.has(j.id)) next.delete(j.id);
                                else next.add(j.id);
                                return next;
                              });
                            }}
                            aria-label={`Select job ${j.primaryKeyword}`}
                          />
                        </td>
                        <td className="p-2 align-top">
                          {imageSrc ? (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedImage({
                                  src: imageSrc,
                                  alt:
                                    post?.featuredImageAlt ||
                                    draft?.featuredImageAlt ||
                                    post?.title ||
                                    draft?.title ||
                                    j.primaryKeyword,
                                })
                              }
                              className="group relative block h-14 w-20 overflow-hidden rounded-lg border border-ocean-200 bg-ocean-50 shadow-sm transition hover:scale-105 hover:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                              aria-label={`Zoom image for ${j.primaryKeyword}`}
                              title="Click to zoom"
                            >
                              <CmsRemoteImage
                                src={imageSrc}
                                alt={
                                  post?.featuredImageAlt ||
                                  draft?.featuredImageAlt ||
                                  post?.title ||
                                  draft?.title ||
                                  j.primaryKeyword
                                }
                                fill
                                className="object-cover transition group-hover:brightness-90"
                                sizes="80px"
                                loading="lazy"
                              />
                              <span
                                aria-hidden
                                className="absolute bottom-1 right-1 rounded bg-slate-950/75 px-1 text-[10px] text-white"
                              >
                                ⤢
                              </span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-ocean-400">—</span>
                          )}
                        </td>
                        <td className="p-2">
                          <p className="font-medium text-ocean-900">
                            {j.primaryKeyword}
                          </p>
                          {slug ? (
                            <p className="text-[10px] text-ocean-500">
                              /blog/{slug}
                            </p>
                          ) : null}
                        </td>
                        <td className="p-2">{j.status}</td>
                        <td className="whitespace-nowrap p-2 tabular-nums text-ocean-800">
                          {publishedLabel}
                        </td>
                        <td className="p-2 tabular-nums">
                          {views == null
                            ? "…"
                            : views.toLocaleString("en-IN")}
                        </td>
                        <td className="p-2">
                          {j.attempts}/{j.maximumAttempts}
                        </td>
                        <td className="p-2">{j.qualityScore ?? "—"}</td>
                        <td className="max-w-[10rem] truncate p-2 text-red-700">
                          {j.errorMessage || "—"}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1.5">
                            {canOpen && slug ? (
                              <a
                                href={`/blog/${slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-ocean-200 bg-white px-2 py-0.5 text-[10px] font-bold text-ocean-800 hover:bg-ocean-50"
                              >
                                View
                              </a>
                            ) : null}
                            {canEdit ? (
                              <button
                                type="button"
                                disabled={busy === `edit-${post!.slug}`}
                                onClick={() => void openQueueEditor(j)}
                                className="rounded-full bg-ocean-800 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-ocean-900 disabled:opacity-50"
                              >
                                {isEditing ? "Editing…" : "Edit"}
                              </button>
                            ) : null}
                            {slug && j.primaryKeyword ? (
                              <button
                                type="button"
                                disabled={busy === `stock-img-${slug}`}
                                onClick={() =>
                                  void generateQueueBlogStockImage(
                                    slug,
                                    post?.title || String(j.primaryKeyword),
                                  )
                                }
                                className="rounded-full border border-emerald-600 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-900 disabled:opacity-50"
                              >
                                {busy === `stock-img-${slug}` ? "…" : "Regen image"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={busy === "queue-delete"}
                              onClick={() => void deleteQueueBlogs([j.id])}
                              className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isEditing && editingPost ? (
                        <tr className="bg-ocean-50/50">
                          <td colSpan={10} className="p-4">
                            <BlogPostEditorPanel
                              editing={editingPost}
                              busy={busy}
                              publishSlots={QUEUE_PUBLISH_SLOTS}
                              aiImageProgress={aiImageProgress}
                              onChangeEditing={setEditingPost}
                              onSave={(opts) => void saveEditedQueuePost(opts)}
                              onCancelEdit={() => setEditingPost(null)}
                              onUploadImage={(file) =>
                                void uploadQueueBlogImage(file)
                              }
                              onGenerateAiImage={() =>
                                void generateQueueBlogImageWithAi()
                              }
                              onGenerateStockImage={() =>
                                void generateQueueBlogStockImage()
                              }
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {zoomedImage ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${zoomedImage.alt}`}
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative h-[min(82vh,850px)] w-full max-w-6xl overflow-hidden rounded-xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CmsRemoteImage
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              fill
              className="object-contain"
              sizes="95vw"
              priority
            />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2.5 bg-gradient-to-b from-black/80 to-transparent p-4 text-white">
              <p className="max-w-3xl text-sm font-semibold sm:text-base">
                {zoomedImage.alt}
              </p>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-slate-950 shadow-lg transition hover:bg-cyan-200"
                aria-label="Close image preview"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "settings" && settings ? (
        <section className="mt-4 space-y-3 rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
            <p className="text-sm font-semibold text-ocean-900">Cluster automation</p>
            <p className="mt-1 text-xs text-ocean-600">
              Auto-approve pending clusters without conflicts, generate, and publish.
              Conflict keywords are never auto-approved — review them on the Clusters
              tab.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.autoApprovePublishWithAiImage === true}
                  disabled={busy === "settings"}
                  onChange={(e) => {
                    if (e.target.checked) void setAutoApproveMode("with_ai_image");
                    else void setAutoApproveMode("off");
                  }}
                />
                Auto approve &amp; publish with AI generated images
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.autoApprovePublishWithoutImage === true}
                  disabled={busy === "settings"}
                  onChange={(e) => {
                    if (e.target.checked) void setAutoApproveMode("without_image");
                    else void setAutoApproveMode("off");
                  }}
                />
                Auto approve &amp; publish with free stock images (Pexels → Pixabay → Unsplash)
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.autoPublish}
              onChange={(e) => void saveSettings({ autoPublish: e.target.checked })}
            />
            Auto-publish high-quality drafts (also turned on by automation above)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.generateImages}
              onChange={(e) => void saveSettings({ generateImages: e.target.checked })}
            />
            Generate AI featured images (global)
          </label>
          <label className="block text-sm">
            Min quality score for auto-publish
            <input
              type="number"
              className="mt-1 w-24 rounded border border-ocean-200 px-2 py-1"
              value={settings.minAutoPublishQualityScore}
              onChange={(e) =>
                void saveSettings({
                  minAutoPublishQualityScore: Number(e.target.value) || 92,
                })
              }
            />
          </label>
          <label className="block text-sm">
            Max blogs generated / day
            <input
              type="number"
              className="mt-1 w-24 rounded border border-ocean-200 px-2 py-1"
              value={settings.maxBlogsGeneratedPerDay}
              onChange={(e) =>
                void saveSettings({
                  maxBlogsGeneratedPerDay: Number(e.target.value) || 5,
                })
              }
            />
          </label>
          <label className="block text-sm">
            Max blogs published / day
            <input
              type="number"
              className="mt-1 w-24 rounded border border-ocean-200 px-2 py-1"
              value={settings.maxBlogsPublishedPerDay}
              onChange={(e) =>
                void saveSettings({
                  maxBlogsPublishedPerDay: Number(e.target.value) || 2,
                })
              }
            />
          </label>
          <div className="rounded-lg border border-ocean-100 bg-ocean-50/40 p-3">
            <p className="text-sm font-medium text-ocean-900">Featured image audit</p>
            <p className="mt-1 text-xs text-ocean-600">
              Detects shared URLs, wrong-topic scuba images, and near-duplicates. Does not
              regenerate until you confirm (API cost). Unique images alone do not guarantee
              Google indexing.
            </p>
            <button
              type="button"
              className="btn-ocean mt-2 text-sm"
              disabled={busy === "image-audit"}
              onClick={() => void runImageAudit()}
            >
              {busy === "image-audit" ? "Auditing…" : "Run image audit"}
            </button>
            {imageAudit ? (
              <ul className="mt-2 space-y-1 text-xs text-ocean-800">
                <li>Scanned: {imageAudit.scanned}</li>
                <li>Shared URL groups: {imageAudit.exactUrlDuplicateGroups}</li>
                <li>Near-duplicates: {imageAudit.nearDuplicateCount}</li>
                <li>Wrong-topic: {imageAudit.wrongTopicCount}</li>
                <li>Regeneration required: {imageAudit.regenerationRequired}</li>
                {(imageAudit.rows || [])
                  .filter((r) => r.recommendedAction !== "OK")
                  .slice(0, 12)
                  .map((r) => (
                    <li key={r.slug} className="truncate">
                      {r.title} → {r.recommendedAction} ({r.suggestedVisualCategory})
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "logs" ? (
        <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <ul className="max-h-[24rem] space-y-2 overflow-auto text-xs">
            {logs.map((l) => (
              <li key={l.id} className="border-b border-ocean-50 pb-2">
                <span className="text-ocean-500">{l.createdAt.slice(0, 19)}</span>{" "}
                <span className="font-semibold">{l.type}</span> — {l.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
