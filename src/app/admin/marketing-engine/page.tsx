"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { MarketingEngineSettings } from "@/lib/marketing-engine/types";

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

type ActionRow = {
  id: string;
  actionId?: string;
  kind?: string;
  status?: string;
  reason?: string;
};

export default function AdminMarketingEnginePage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [settings, setSettings] = useState<MarketingEngineSettings | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [latestReport, setLatestReport] = useState<Record<string, unknown> | null>(null);
  const [latestAnalytics, setLatestAnalytics] = useState<Record<string, unknown> | null>(null);
  const [pendingActions, setPendingActions] = useState<ActionRow[]>([]);
  const [content, setContent] = useState<unknown[]>([]);
  const [socialPosts, setSocialPosts] = useState<unknown[]>([]);
  const [adCopies, setAdCopies] = useState<unknown[]>([]);
  const [seoClusters, setSeoClusters] = useState<unknown[]>([]);
  const [imagePrompts, setImagePrompts] = useState<unknown[]>([]);
  const [reelsIdeas, setReelsIdeas] = useState<unknown[]>([]);
  const [competitorReports, setCompetitorReports] = useState<unknown[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/marketing-engine/dashboard?days=14");
      setSettings(data.settings ?? null);
      setStats(data.stats ?? null);
      setLatestReport(data.latestReport ?? null);
      setLatestAnalytics(data.latestAnalytics ?? null);
      setPendingActions((data.pendingActions ?? []) as ActionRow[]);
      setContent(data.content ?? []);
      setSocialPosts(data.socialPosts ?? []);
      setAdCopies(data.adCopies ?? []);
      setSeoClusters(data.seoClusters ?? []);
      setImagePrompts(data.imagePrompts ?? []);
      setReelsIdeas(data.reelsIdeas ?? []);
      setCompetitorReports(data.competitorReports ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runEngine() {
    setBusy("run");
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/marketing-engine/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setOk("Marketing engine generated content, calendar, ads, SEO clusters, and campaigns.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setBusy("settings");
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/marketing-engine/settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
      setSettings(data.settings ?? settings);
      setOk("Settings saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function approve(actionId: string) {
    setBusy(actionId);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/marketing-engine/action/approve", {
        method: "POST",
        body: JSON.stringify({ actionId }),
      });
      setOk("Campaign approved and published.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(actionId: string) {
    setBusy(actionId);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/marketing-engine/action/reject", {
        method: "POST",
        body: JSON.stringify({ actionId }),
      });
      setOk("Rejected.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  const reportMd = String(latestReport?.summaryMarkdown ?? "");
  const analytics = latestAnalytics as {
    traffic?: { pageViews?: number; sessions?: number };
    conversions?: { bookings?: number; checkoutStarted?: number };
    leads?: { marketingLeads?: number; hotRecoveryLeads?: number; whatsappClicks?: number };
  } | null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">AI marketing engine</h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Autonomous content generation, social calendar, ad copy, SEO clusters, image prompts,
            reels ideas, and competitor insights. Daily cron at{" "}
            <code className="rounded bg-sand px-1 text-xs">06:00 UTC</code>.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/marketing" className="font-semibold text-ocean-700 underline">
            Lead templates →
          </Link>
          <Link href="/admin/seo-agent" className="font-semibold text-ocean-700 underline">
            SEO AI →
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

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void runEngine()}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "run" ? "Generating…" : "Run marketing engine now"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-full border border-ocean-200 px-4 py-2 text-sm text-ocean-800"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-ocean-600">Loading…</p>
      ) : (
        <>
          {stats ? (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Generated content", stats.contentCount],
                ["Social posts", stats.socialPosts],
                ["Ad copy sets", stats.adCopies],
                ["Campaigns", stats.campaigns],
                ["Published campaigns", stats.publishedCampaigns],
                ["Pending approvals", stats.pendingApprovals],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                    {label}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-ocean-900">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {analytics ? (
            <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Marketing performance
              </h2>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-ocean-500">Page views</p>
                  <p className="text-xl font-bold">{analytics.traffic?.pageViews ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-ocean-500">Bookings</p>
                  <p className="text-xl font-bold">{analytics.conversions?.bookings ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-ocean-500">WhatsApp clicks</p>
                  <p className="text-xl font-bold">{analytics.leads?.whatsappClicks ?? 0}</p>
                </div>
              </div>
            </section>
          ) : null}

          {settings ? (
            <section className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">Engine settings</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["enabled", "Engine enabled"],
                    ["autoQueueBlogTopics", "Auto-queue blog topics"],
                    ["requireApprovalForSocial", "Require approval for social"],
                    ["requireApprovalForWhatsapp", "Require approval for WhatsApp"],
                    ["festivalCampaignsEnabled", "Festival campaigns"],
                    ["competitorScanEnabled", "Competitor / trend scan (Serper)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-ocean-800">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) =>
                        setSettings((s) => (s ? { ...s, [key]: e.target.checked } : s))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={busy === "settings"}
                onClick={() => void saveSettings()}
                className="mt-4 rounded-full bg-ocean-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save settings
              </button>
            </section>
          ) : null}

          {pendingActions.length > 0 ? (
            <section className="mt-4">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Pending campaign approvals
              </h2>
              <ul className="mt-3 space-y-3">
                {pendingActions.map((a) => {
                  const id = String(a.actionId ?? a.id);
                  return (
                    <li
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ocean-100 bg-white p-4"
                    >
                      <div>
                        <p className="font-semibold text-ocean-900">{a.kind}</p>
                        <p className="text-sm text-ocean-600">{a.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void approve(id)}
                          className="rounded-full bg-green-700 px-4 py-1.5 text-sm text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void reject(id)}
                          className="rounded-full border border-red-300 px-4 py-1.5 text-sm text-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {latestReport ? (
            <section className="mt-4">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Latest AI brief — {String(latestReport.headline ?? "")}
              </h2>
              {Array.isArray(latestReport.trendingTopics) ? (
                <p className="mt-2 text-sm text-ocean-700">
                  <strong>Trending:</strong>{" "}
                  {(latestReport.trendingTopics as string[]).slice(0, 8).join(" · ")}
                </p>
              ) : null}
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-sand p-4 text-sm text-ocean-800">
                {reportMd || String(latestReport.summaryPlain ?? "")}
              </pre>
            </section>
          ) : (
            <p className="mt-3 text-ocean-600">
              No marketing reports yet. Click <strong>Run marketing engine now</strong>.
            </p>
          )}

          <Section title="Generated content" data={content.slice(0, 8)} />
          <Section title="Social calendar" data={socialPosts.slice(0, 7)} />
          <Section title="Ad copy variations" data={adCopies.slice(0, 5)} />
          <Section title="SEO content clusters" data={seoClusters.slice(0, 3)} />
          <Section title="Image prompts" data={imagePrompts.slice(0, 5)} />
          <Section title="Reels & Shorts ideas" data={reelsIdeas.slice(0, 5)} />
          <Section id="competitor-reports" title="Competitor reports" data={competitorReports.slice(0, 2)} />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  data,
  id,
}: {
  title: string;
  data: unknown[];
  id?: string;
}) {
  if (!data.length) return null;
  return (
    <section id={id} className="mt-4 scroll-mt-24">
      <h2 className="font-display text-lg font-bold text-ocean-900">{title}</h2>
      <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-sand p-3 text-xs text-ocean-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
