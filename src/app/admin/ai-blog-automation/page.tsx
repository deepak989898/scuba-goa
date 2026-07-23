"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type {
  AiBlogGenerationJob,
  ClusterConflict,
  SeoBlogCenterSettings,
  SeoBlogDraft,
  SeoBlogKeyword,
  SeoKeywordCluster,
} from "@/lib/seo-blog-center/types";
import { enrichConflictsFromUrls } from "@/lib/seo-blog-center/conflict-display";

type Tab =
  | "dashboard"
  | "research"
  | "keywords"
  | "clusters"
  | "queue"
  | "drafts"
  | "settings"
  | "logs";

const SERVICE_OPTIONS = [
  { slug: "scuba-diving", name: "Scuba diving" },
  { slug: "water-sports", name: "Water sports" },
  { slug: "north-goa-tour", name: "North Goa sightseeing" },
  { slug: "south-goa-tour", name: "South Goa sightseeing" },
  { slug: "dudhsagar-trip", name: "Dudhsagar waterfall trip" },
  { slug: "island-trip", name: "Island trip" },
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

function clusterConflictsList(c: SeoKeywordCluster): ClusterConflict[] {
  if (c.conflicts?.length) return c.conflicts;
  if (c.conflictingUrls?.length) {
    return enrichConflictsFromUrls(c.primaryKeyword, c.conflictingUrls);
  }
  return [];
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
  const [keywords, setKeywords] = useState<SeoBlogKeyword[]>([]);
  const [clusters, setClusters] = useState<SeoKeywordCluster[]>([]);
  const [jobs, setJobs] = useState<AiBlogGenerationJob[]>([]);
  const [drafts, setDrafts] = useState<SeoBlogDraft[]>([]);
  const [logs, setLogs] = useState<
    { id: string; type: string; message: string; createdAt: string }[]
  >([]);

  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [kwFilter, setKwFilter] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "volume">("score");

  const [serviceSlug, setServiceSlug] = useState("scuba-diving");
  const [seedKeyword, setSeedKeyword] = useState("scuba diving in Goa");
  const [maxKeywords, setMaxKeywords] = useState(100);
  const [includeAds, setIncludeAds] = useState(true);
  const [includeGsc, setIncludeGsc] = useState(true);
  const [generateAiImage, setGenerateAiImage] = useState(true);
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

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/ai-blog-automation");
      setStats(data.stats ?? {});
      setProviders(data.providers ?? {});
      setSettings(data.settings ?? null);
      setKeywords(data.keywords ?? []);
      setClusters(data.clusters ?? []);
      setJobs(data.jobs ?? []);
      setDrafts(data.drafts ?? []);
      setLogs(data.logs ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredKeywords = useMemo(() => {
    let list = [...keywords];
    const q = kwFilter.trim().toLowerCase();
    if (q) list = list.filter((k) => k.keyword.toLowerCase().includes(q));
    list.sort((a, b) =>
      sortBy === "volume"
        ? (b.monthlySearches ?? b.searchVolume ?? 0) -
          (a.monthlySearches ?? a.searchVolume ?? 0)
        : (b.opportunityScore ?? b.seoScore ?? 0) -
          (a.opportunityScore ?? a.seoScore ?? 0),
    );
    return list;
  }, [keywords, kwFilter, sortBy]);

  async function runResearch() {
    setBusy("research");
    setErr(null);
    setOk(null);
    try {
      const svc = SERVICE_OPTIONS.find((s) => s.slug === serviceSlug);
      const data = await adminFetch("/api/admin/ai-blog-automation/research", {
        method: "POST",
        body: JSON.stringify({
          serviceSlug,
          serviceName: svc?.name,
          seedKeyword,
          maxKeywords,
          includeAds,
          includeGsc,
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
          `Queue ${preview.estimatedArticles} article(s)?\n` +
            `AI featured image: ${generateAiImage ? "YES (extra cost)" : "NO — upload manually later"}\n` +
            `Estimated OpenAI cost: ~$${preview.estimatedCostUsd} (estimate only).\n` +
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
      setOk(
        `Queued ${data.jobsCreated} job(s). AI image: ${generateAiImage ? "on" : "off"}. Est. cost ~$${data.estimatedCostUsd}`,
      );
      setSelectedClusters(new Set());
      setTab("queue");
      await load();
    } catch (e) {
      if (!confirmCost && e instanceof Error && e.message.includes("Cost")) {
        /* handled above */
      }
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function processQueueNow() {
    setBusy("queue");
    try {
      const data = await adminFetch("/api/admin/ai-blog-automation", {
        method: "PATCH",
        body: JSON.stringify({ action: "processQueue", maxJobs: 2 }),
      });
      setOk(`Processed ${data.processed} job(s)`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Queue process failed");
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
      setOk("Settings saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "research", label: "New research" },
    { id: "keywords", label: "Keywords" },
    { id: "clusters", label: "Clusters" },
    { id: "queue", label: "Generation queue" },
    { id: "drafts", label: "Drafts" },
    { id: "settings", label: "Settings" },
    { id: "logs", label: "Logs" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">
            AI Blog Automation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Research keywords (Google Ads when configured + GSC + seeds) → cluster →
            approve → generate drafts → review → publish. Auto-publish stays off by
            default.
          </p>
        </div>
        <Link
          href="/admin/blog-automation"
          className="text-sm font-semibold text-ocean-700 hover:underline"
        >
          Live blogs / schedule →
        </Link>
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
            ["Clusters", stats.clusters],
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
        </section>
      ) : null}

      {tab === "research" ? (
        <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
          <h2 className="font-display text-base font-bold text-ocean-900">
            New keyword research
          </h2>
          <p className="mt-1 text-xs text-ocean-600">
            Max 100 opportunities. Related variations become clusters — not one blog each.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-ocean-800">
              Service / package
              <select
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={serviceSlug}
                onChange={(e) => {
                  setServiceSlug(e.target.value);
                  const s = SERVICE_OPTIONS.find((x) => x.slug === e.target.value);
                  if (s) setSeedKeyword(`${s.name} in Goa`);
                }}
              >
                {SERVICE_OPTIONS.map((s) => (
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
              Max keywords (≤100)
              <input
                type="number"
                min={1}
                max={100}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={maxKeywords}
                onChange={(e) => setMaxKeywords(Number(e.target.value) || 100)}
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
            </div>
          </div>
          <button
            type="button"
            disabled={busy === "research"}
            onClick={() => void runResearch()}
            className="mt-4 rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "research" ? "Researching…" : "Run research"}
          </button>
        </section>
      ) : null}

      {tab === "keywords" ? (
        <section className="mt-4 overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-ocean-100 p-3">
            <input
              className="rounded-lg border border-ocean-200 px-3 py-1.5 text-sm"
              placeholder="Filter keywords…"
              value={kwFilter}
              onChange={(e) => setKwFilter(e.target.value)}
            />
            <select
              className="rounded-lg border border-ocean-200 px-3 py-1.5 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score" | "volume")}
            >
              <option value="score">Sort by opportunity score</option>
              <option value="volume">Sort by volume</option>
            </select>
            <button
              type="button"
              className="text-xs font-semibold text-ocean-700 underline"
              onClick={() => void load()}
            >
              Refresh
            </button>
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-ocean-50 text-ocean-800">
                <tr>
                  <th className="p-2">Keyword</th>
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
                {filteredKeywords.map((k) => (
                  <tr key={k.id} className="border-t border-ocean-50">
                    <td className="max-w-[14rem] p-2 font-medium text-ocean-900">
                      {k.displayKeyword || k.keyword}
                      {k.scoreExplanation ? (
                        <p className="mt-0.5 line-clamp-2 text-[10px] font-normal text-ocean-500">
                          {k.scoreExplanation}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-2">{k.intent ?? "—"}</td>
                    <td className="p-2 tabular-nums">
                      {k.opportunityScore ?? k.seoScore}
                    </td>
                    <td className="p-2 tabular-nums">
                      {k.monthlySearches ?? k.searchVolume ?? "n/a"}
                    </td>
                    <td className="p-2 tabular-nums">
                      {k.gscImpressions != null
                        ? `${k.gscImpressions} imp`
                        : "—"}
                    </td>
                    <td className="p-2">{k.suggestedAction ?? "—"}</td>
                    <td className="p-2">{k.status}</td>
                    <td className="p-2">{k.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "clusters" ? (
        <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-full border border-ocean-200 bg-ocean-50 px-3 py-1.5 text-xs font-semibold text-ocean-900">
              <input
                type="checkbox"
                checked={
                  clusters.length > 0 &&
                  selectedClusters.size === clusters.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedClusters(new Set(clusters.map((c) => c.id)));
                  } else {
                    setSelectedClusters(new Set());
                  }
                }}
              />
              Select all ({clusters.length})
            </label>
            <p className="text-sm font-semibold text-ocean-900">
              {selectedClusters.size} selected
            </p>
            <button
              type="button"
              className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs font-semibold"
              onClick={() =>
                setSelectedClusters(
                  new Set(
                    clusters.filter((c) => c.status === "pending").map((c) => c.id),
                  ),
                )
              }
            >
              Select all pending
            </button>
            <button
              type="button"
              className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs font-semibold"
              onClick={() => setSelectedClusters(new Set())}
            >
              Clear
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-ocean-100 bg-ocean-50/50 p-3">
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
              Without AI image (upload manually later)
            </label>
            <button
              type="button"
              disabled={busy === "approve" || selectedClusters.size === 0}
              onClick={() => void approveSelected()}
              className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Approve selected → queue
            </button>
          </div>

          <ul className="mt-3 space-y-2">
            {clusters.map((c) => {
              const conflicts = clusterConflictsList(c);
              return (
                <li
                  key={c.id}
                  className="flex gap-3 rounded-lg border border-ocean-100 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-cyan-700"
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
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ocean-900">{c.primaryKeyword}</p>
                    <p className="text-xs text-ocean-600">
                      {c.contentType} · {c.intent} · score {c.opportunityScore} ·{" "}
                      {c.status}
                      {c.secondaryKeywords.length
                        ? ` · +${c.secondaryKeywords.length} variants`
                        : ""}
                    </p>
                    {conflicts.length ? (
                      <ul className="mt-2 space-y-1.5">
                        {conflicts.map((cf) => (
                          <li
                            key={`${c.id}-${cf.path}`}
                            className={`rounded-md border px-2 py-1.5 text-xs ${conflictStyle(cf.reasonCode)}`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${similarityBadgeClass(cf.similarityPercent)}`}
                              >
                                {cf.similarityPercent}% similar
                              </span>
                              <span className="font-mono text-[11px]">{cf.path}</span>
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
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {tab === "queue" ? (
        <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === "queue"}
              onClick={() => void processQueueNow()}
              className="rounded-full bg-ocean-800 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "queue" ? "Processing…" : "Process 2 jobs now"}
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
          </div>
          <div className="mt-3 max-h-[24rem] overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-ocean-50">
                <tr>
                  <th className="p-2">Keyword</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Attempts</th>
                  <th className="p-2">Quality</th>
                  <th className="p-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-ocean-50">
                    <td className="p-2">{j.primaryKeyword}</td>
                    <td className="p-2">{j.status}</td>
                    <td className="p-2">
                      {j.attempts}/{j.maximumAttempts}
                    </td>
                    <td className="p-2">{j.qualityScore ?? "—"}</td>
                    <td className="max-w-[12rem] truncate p-2 text-red-700">
                      {j.errorMessage || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "drafts" ? (
        <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <p className="text-sm text-ocean-700">
            Drafts created by the queue. Publish/edit live posts in{" "}
            <Link href="/admin/blog-automation" className="font-semibold underline">
              Blog automation
            </Link>{" "}
            or approve via SEO Blog Center APIs.
          </p>
          <ul className="mt-3 space-y-2">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-ocean-100 px-3 py-2 text-sm"
              >
                <p className="font-semibold text-ocean-900">{d.title}</p>
                <p className="text-xs text-ocean-600">
                  /blog/{d.slug} · {d.status}
                  {d.qualityScore != null ? ` · quality ${d.qualityScore}` : ""}
                </p>
                {d.qualityNotes?.length ? (
                  <p className="text-[11px] text-amber-800">
                    {d.qualityNotes.join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "settings" && settings ? (
        <section className="mt-4 space-y-3 rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.autoPublish}
              onChange={(e) => void saveSettings({ autoPublish: e.target.checked })}
            />
            Auto-publish high-quality drafts (default OFF)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.generateImages}
              onChange={(e) => void saveSettings({ generateImages: e.target.checked })}
            />
            Generate AI featured images
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
