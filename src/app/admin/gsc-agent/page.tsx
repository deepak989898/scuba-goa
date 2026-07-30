"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";

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

  async function runJob(job: string) {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/gsc-agent/run", {
        method: "POST",
        body: JSON.stringify({ job }),
      });
      setOk(`${job} finished: ${JSON.stringify(data.detail || data).slice(0, 180)}`);
      await load(tab, urlFilter, issueSeverity);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
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
          <p className="text-xs text-ocean-600">
            Tip: click any metric card to open the matching page list. GSC may show ~18
            Indexed overall; this agent fills counts after{" "}
            <strong>Sync analytics</strong> + <strong>Inspect queue</strong> (quota-limited).
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
          </div>
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
            {urls.length === 1 ? "" : "s"}. Open a link to review/improve that page.
          </p>
          <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-ocean-50 text-ocean-800">
                <tr>
                  <th className="p-2">URL</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Index</th>
                  <th className="p-2">HTTP</th>
                  <th className="p-2">Imp</th>
                  <th className="p-2">Pos</th>
                  <th className="p-2">Ranking</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((u) => (
                  <tr key={String(u.id)} className="border-t border-ocean-50">
                    <td className="max-w-[280px] truncate p-2">
                      <a
                        href={String(u.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-cyan-800 hover:underline"
                      >
                        {String(u.url)}
                      </a>
                    </td>
                    <td className="p-2">{String(u.pageType)}</td>
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
                    <td className="p-2">{String(u.rankingStatus)}</td>
                  </tr>
                ))}
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
    </div>
  );
}
