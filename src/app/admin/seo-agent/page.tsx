"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";

type WeeklyRow = {
  id: string;
  weekId: string;
  generatedAt: string;
  range?: { startDateIst?: string; endDateIst?: string; days?: number };
  topPages?: { page: string; clicks: number; impressions: number; ctr: number; position: number; clicksDelta: number; positionDelta: number }[];
  topQueries?: { query: string; clicks: number; impressions: number; ctr: number; position: number; positionDelta: number }[];
  issues?: { id: string; severity: string; category: string; title: string; detail: string; affectedUrls: string[] }[];
  competitorGaps?: { configured?: boolean; note?: string; examples?: { query: string; competitorDomains: string[] }[] };
};

type ReportRow = {
  id: string;
  weekId: string;
  generatedAt: string;
  summaryMarkdown?: string;
  summaryPlain?: string;
  recommendations?: { area: string; priority: string; suggestion: string; example?: string; targetUrl?: string }[];
  blogTopicsToQueue?: { title: string; serviceSlug?: string; language?: string }[];
};

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

export default function AdminSeoAgentPage() {
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [queueTopics, setQueueTopics] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/seo-agent/dashboard?weeks=8");
      const w = (data.weekly ?? []) as WeeklyRow[];
      const r = (data.reports ?? []) as ReportRow[];
      setWeekly(w);
      setReports(r);
      setSelectedWeek((prev) => prev || w[0]?.weekId || "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshot = weekly.find((w) => w.weekId === selectedWeek) ?? weekly[0];
  const report = reports.find((r) => r.weekId === (snapshot?.weekId ?? "")) ?? reports[0];

  const visibleIssues = useMemo(() => (snapshot?.issues ?? []).slice(0, 12), [snapshot]);

  async function runNow() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/seo-agent/run", {
        method: "POST",
        body: JSON.stringify({ queueBlogTopics: queueTopics }),
      });
      setOk(
        queueTopics
          ? "Weekly SEO report generated + blog topics queued."
          : "Weekly SEO report generated.",
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">AI SEO agent</h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Weekly Search Console report + AI fixes (titles, meta, FAQs, schema, internal links).
            Optional: queue blog topics for publishing workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-ocean-700">
          <Link href="/admin/blog-automation" className="underline">
            Blog automation →
          </Link>
          <Link href="/admin/ai-analytics" className="underline">
            AI analytics →
          </Link>
        </div>
      </div>

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {ok}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runNow()}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Running…" : "Generate weekly report now"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-full border border-ocean-200 px-4 py-2 text-sm text-ocean-800"
        >
          Refresh
        </button>
        <label className="ml-2 flex items-center gap-2 text-sm text-ocean-800">
          <input
            type="checkbox"
            checked={queueTopics}
            onChange={(e) => setQueueTopics(e.target.checked)}
          />
          Queue blog topics automatically
        </label>
      </div>

      {loading ? (
        <p className="mt-8 text-ocean-600">Loading…</p>
      ) : !snapshot && !err ? (
        <p className="mt-8 text-ocean-600">
          No weekly SEO reports yet. Click <strong>Generate weekly report now</strong>.
        </p>
      ) : snapshot ? (
        <>
          <label className="mt-6 block text-sm text-ocean-800">
            Week ending (IST)
            <select
              className="mt-1 rounded-lg border border-ocean-200 px-3 py-2"
              value={selectedWeek || snapshot.weekId}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {weekly.map((w) => (
                <option key={w.weekId} value={w.weekId}>
                  {w.weekId}
                </option>
              ))}
            </select>
          </label>

          <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ocean-900">Detected issues</h2>
            {visibleIssues.length ? (
              <ul className="mt-4 space-y-3">
                {visibleIssues.map((issue) => (
                  <li key={issue.id} className="rounded-lg border border-ocean-100 bg-sand/30 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold uppercase text-ocean-700">
                        {issue.severity}
                      </span>
                      <span className="rounded bg-white px-2 py-0.5 text-xs font-medium uppercase text-ocean-600">
                        {issue.category}
                      </span>
                      <span className="font-semibold text-ocean-900">{issue.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-ocean-800">{issue.detail}</p>
                    {issue.affectedUrls?.length ? (
                      <p className="mt-2 font-mono text-xs text-ocean-600">
                        {issue.affectedUrls.slice(0, 4).join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ocean-500">No issues</p>
            )}
          </section>

          {report?.summaryMarkdown ? (
            <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                AI weekly report — {report.weekId}
              </h2>
              <div className="prose prose-ocean mt-4 max-w-none whitespace-pre-wrap text-sm text-ocean-800">
                {report.summaryMarkdown}
              </div>
            </section>
          ) : (
            <p className="mt-8 text-sm text-ocean-600">
              No OpenAI report for this week. Set <code>OPENAI_API_KEY</code> and run again.
            </p>
          )}

          {report?.recommendations?.length ? (
            <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
              <h2 className="font-display text-lg font-bold text-ocean-900">Recommendations</h2>
              <div className="mt-4 space-y-3">
                {report.recommendations.slice(0, 12).map((r, i) => (
                  <div key={`${r.area}-${i}`} className="rounded-lg border border-amber-100 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded bg-sand px-2 py-0.5 text-xs font-semibold uppercase text-ocean-700">
                        {r.priority}
                      </span>
                      <span className="rounded bg-sand px-2 py-0.5 text-xs font-medium uppercase text-ocean-600">
                        {r.area}
                      </span>
                      {r.targetUrl ? (
                        <a href={r.targetUrl} className="font-mono text-xs underline" target="_blank" rel="noreferrer">
                          open
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-ocean-800">{r.suggestion}</p>
                    {r.example ? (
                      <p className="mt-2 rounded bg-sand/40 px-3 py-2 text-xs italic text-ocean-700">
                        Example: {r.example}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {report?.blogTopicsToQueue?.length ? (
            <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">Blog topic clusters</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ocean-800">
                {report.blogTopicsToQueue.slice(0, 12).map((t, i) => (
                  <li key={`${t.title}-${i}`}>
                    {t.title}{" "}
                    {t.serviceSlug ? (
                      <span className="text-xs text-ocean-500">({t.serviceSlug})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ocean-500">
                Tip: enable “Queue blog topics automatically” and re-run to push these into your blog
                queue.
              </p>
            </section>
          ) : null}
        </>
      ) : null}

      <p className="mt-10 text-xs text-ocean-500">
        Setup: <code>GOOGLE_SEARCH_CONSOLE_SITE_URL</code> + OpenAI. Optional competitor scan:{" "}
        <code>SERPER_API_KEY</code>.
      </p>
    </div>
  );
}

