"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { SeoBlogCenterSettings, SeoBlogDraft, SeoBlogKeyword } from "@/lib/seo-blog-center/types";

type Tab = "dashboard" | "keywords" | "city" | "drafts" | "settings";

type DashboardData = {
  settings: SeoBlogCenterSettings;
  keywordStats: Record<string, number>;
  draftStats: Record<string, number>;
  recentKeywords: SeoBlogKeyword[];
  recentDrafts: SeoBlogDraft[];
  logs: { id: string; type: string; message: string; createdAt: string }[];
  gsc: {
    ok: boolean;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    topQueries?: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
    error?: string;
  };
};

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

export default function SeoBlogCenterPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [keywords, setKeywords] = useState<SeoBlogKeyword[]>([]);
  const [drafts, setDrafts] = useState<SeoBlogDraft[]>([]);
  const [settings, setSettings] = useState<SeoBlogCenterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [cityInput, setCityInput] = useState("Mumbai");
  const [cityPreview, setCityPreview] = useState<SeoBlogKeyword[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const dash = await adminFetch("/api/admin/seo-blog-center/dashboard");
      setData(dash);
      setSettings(dash.settings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Dashboard failed to load");
    }

    try {
      const kw = await adminFetch("/api/admin/seo-blog-center/keywords");
      setKeywords(kw.keywords ?? []);
    } catch (e) {
      setErr((prev) =>
        prev ??
        (e instanceof Error ? e.message : "Keywords failed to load"),
      );
    }

    try {
      const bl = await adminFetch("/api/admin/seo-blog-center/blogs");
      setDrafts(bl.drafts ?? []);
    } catch (e) {
      setErr((prev) =>
        prev ?? (e instanceof Error ? e.message : "Drafts failed to load"),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setErr(null);
    setOk(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateKeywords() {
    await runAction("keywords", async () => {
      const r = await adminFetch("/api/admin/seo-blog-center/keywords", { method: "POST" });
      setOk(`Added ${r.added} keywords (GSC: ${r.gsc}, suggest: ${r.suggest})`);
    });
  }

  async function runFullPipeline() {
    await runAction("pipeline", async () => {
      const r = await adminFetch("/api/admin/seo-blog-center/run", { method: "POST" });
      setOk(
        `Pipeline done: +${r.keywordsAdded} keywords, ${r.blogsGenerated} drafts, ${r.blogsPublished} published`,
      );
    });
  }

  async function previewCity() {
    await runAction("city-preview", async () => {
      const r = await adminFetch("/api/admin/seo-blog-center/keywords/city", {
        method: "POST",
        body: JSON.stringify({ city: cityInput, mode: "preview", limit: 50 }),
      });
      setCityPreview(r.keywords ?? []);
      setOk(`Found ${r.keywords?.length ?? 0} city keywords for ${r.city}`);
    });
  }

  async function saveCityKeywords() {
    await runAction("city-save", async () => {
      const r = await adminFetch("/api/admin/seo-blog-center/keywords/city", {
        method: "POST",
        body: JSON.stringify({
          city: cityInput,
          mode: "save",
          keywords: cityPreview,
          autoApprove: true,
        }),
      });
      setOk(`Saved ${r.added} city keywords`);
      setCityPreview([]);
    });
  }

  async function keywordAction(id: string, action: "approve" | "reject") {
    await runAction(action, async () => {
      await adminFetch(`/api/admin/seo-blog-center/keywords/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setOk(`Keyword ${action}d`);
    });
  }

  async function generateBlog(keywordId: string) {
    await runAction("blog-gen", async () => {
      await adminFetch("/api/admin/seo-blog-center/blogs", {
        method: "POST",
        body: JSON.stringify({ keywordId }),
      });
      setOk("Blog draft generated");
    });
  }

  async function draftAction(id: string, action: "approve" | "publish" | "reject") {
    await runAction(action, async () => {
      await adminFetch(`/api/admin/seo-blog-center/blogs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setOk(`Draft ${action}d`);
    });
  }

  async function saveSettings() {
    if (!settings) return;
    await runAction("settings", async () => {
      await adminFetch("/api/admin/seo-blog-center/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setOk("Settings saved");
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "GSC & overview" },
    { id: "keywords", label: "Keywords" },
    { id: "city", label: "City research" },
    { id: "drafts", label: "Drafts & publish" },
    { id: "settings", label: "Automation" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">SEO Blog Center</h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-600">
            Keyword research from Google Search Console, Google Suggest, city names, and templates —
            then auto-generate SEO blogs with schema, ALT text, and internal links. Daily cron at{" "}
            <strong>12:15 PM IST</strong> (Vercel).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void generateKeywords()}
            className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-800 disabled:opacity-50"
          >
            Generate keywords
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void runFullPipeline()}
            className="rounded-lg border border-ocean-300 bg-white px-4 py-2 text-sm font-medium text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
          >
            Run full pipeline
          </button>
          <Link
            href="/admin/blog-automation"
            className="rounded-lg border border-ocean-200 px-4 py-2 text-sm text-ocean-700 hover:bg-ocean-50"
          >
            Legacy blog automation
          </Link>
        </div>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      ) : null}
      {ok ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {ok}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-ocean-100 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? "bg-ocean-700 text-white"
                : "text-ocean-700 hover:bg-ocean-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p className="text-sm text-ocean-500">Loading…</p>
      ) : null}

      {tab === "dashboard" && data ? (
        <div className="grid gap-2.5 lg:grid-cols-2">
          <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
            <h2 className="font-semibold text-ocean-900">Google Search Console (7 days)</h2>
            {data.gsc.ok ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-ocean-500">Clicks</dt>
                  <dd className="text-xl font-bold text-ocean-900">{data.gsc.clicks ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-ocean-500">Impressions</dt>
                  <dd className="text-xl font-bold text-ocean-900">{data.gsc.impressions ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-ocean-500">CTR</dt>
                  <dd className="text-xl font-bold text-ocean-900">
                    {((data.gsc.ctr ?? 0) * 100).toFixed(2)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-ocean-500">Avg position</dt>
                  <dd className="text-xl font-bold text-ocean-900">
                    {(data.gsc.position ?? 0).toFixed(1)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-amber-700">
                {data.gsc.error ?? "GSC not connected — set GOOGLE_SEARCH_CONSOLE_SITE_URL and add Firebase service account to Search Console."}
              </p>
            )}
            {data.gsc.topQueries?.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-ocean-500">
                      <th className="py-1 pr-2">Query</th>
                      <th className="py-1 pr-2">Clicks</th>
                      <th className="py-1 pr-2">Impr.</th>
                      <th className="py-1">Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.gsc.topQueries.slice(0, 10).map((q) => (
                      <tr key={q.query} className="border-b border-ocean-50">
                        <td className="py-1.5 pr-2 font-medium text-ocean-800">{q.query}</td>
                        <td className="py-1.5 pr-2">{q.clicks}</td>
                        <td className="py-1.5 pr-2">{q.impressions}</td>
                        <td className="py-1.5">{q.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
            <h2 className="font-semibold text-ocean-900">Pipeline stats</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ocean-500">Pending keywords</dt>
                <dd className="text-xl font-bold">{data.keywordStats.pending ?? 0}</dd>
              </div>
              <div>
                <dt className="text-ocean-500">Approved keywords</dt>
                <dd className="text-xl font-bold">{data.keywordStats.approved ?? 0}</dd>
              </div>
              <div>
                <dt className="text-ocean-500">From GSC</dt>
                <dd className="text-xl font-bold">{data.keywordStats.fromGsc ?? 0}</dd>
              </div>
              <div>
                <dt className="text-ocean-500">Published drafts</dt>
                <dd className="text-xl font-bold">{data.draftStats.published ?? 0}</dd>
              </div>
            </dl>
            <h3 className="mt-3 text-sm font-semibold text-ocean-800">Recent activity</h3>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-ocean-600">
              {data.logs.map((l) => (
                <li key={l.id}>
                  <span className="text-ocean-400">{l.createdAt.slice(0, 16)}</span> — {l.message}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "keywords" ? (
        <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-ocean-50 text-ocean-700">
              <tr>
                <th className="px-3 py-2">Keyword</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">GSC</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.id} className="border-b border-ocean-50">
                  <td className="px-3 py-2 font-medium text-ocean-900">{k.keyword}</td>
                  <td className="px-3 py-2 text-ocean-600">{k.source}</td>
                  <td className="px-3 py-2">{k.seoScore}</td>
                  <td className="px-3 py-2 text-xs text-ocean-500">
                    {k.gscImpressions != null
                      ? `${k.gscImpressions} impr / pos ${k.gscPosition?.toFixed(1)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        k.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : k.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {k.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => void keywordAction(k.id, "approve")}
                            className="text-xs text-green-700 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => void keywordAction(k.id, "reject")}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {k.status === "approved" ? (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void generateBlog(k.id)}
                          className="text-xs text-ocean-700 hover:underline"
                        >
                          Write blog
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "city" ? (
        <div className="space-y-2.5 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <p className="text-sm text-ocean-600">
            Research long-tail keywords like &quot;scuba diving Goa from Mumbai&quot; using city
            templates + Google Suggest.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ocean-700">Origin city</span>
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="mt-1 block rounded-lg border border-ocean-200 px-3 py-2 text-sm"
                placeholder="Mumbai"
              />
            </label>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void previewCity()}
              className="rounded-lg bg-ocean-700 px-4 py-2 text-sm text-white hover:bg-ocean-800 disabled:opacity-50"
            >
              Preview keywords
            </button>
            {cityPreview.length > 0 ? (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void saveCityKeywords()}
                className="rounded-lg border border-ocean-300 px-4 py-2 text-sm text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
              >
                Save &amp; auto-approve ({cityPreview.length})
              </button>
            ) : null}
          </div>
          {cityPreview.length > 0 ? (
            <ul className="max-h-44 overflow-y-auto text-sm text-ocean-700">
              {cityPreview.map((k) => (
                <li key={k.id} className="border-b border-ocean-50 py-1">
                  {k.keyword} <span className="text-ocean-400">score {k.seoScore}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {tab === "drafts" ? (
        <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-ocean-50 text-ocean-700">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Keyword</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} className="border-b border-ocean-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-ocean-900">{d.title}</div>
                    {d.status === "published" && d.publishedBlogSlug ? (
                      <Link
                        href={`/blog/${d.publishedBlogSlug}`}
                        className="text-xs text-ocean-600 hover:underline"
                        target="_blank"
                      >
                        /blog/{d.publishedBlogSlug}
                      </Link>
                    ) : (
                      <span className="text-xs text-ocean-400">slug: {d.slug}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ocean-600">{d.keyword}</td>
                  <td className="px-3 py-2">{d.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {d.status === "pending_approval" || d.status === "draft" ? (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void draftAction(d.id, "approve")}
                          className="text-xs text-green-700 hover:underline"
                        >
                          Approve
                        </button>
                      ) : null}
                      {d.status === "approved" ? (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void draftAction(d.id, "publish")}
                          className="text-xs text-ocean-700 hover:underline"
                        >
                          Publish
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "settings" && settings ? (
        <div className="max-w-lg space-y-2.5 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          {(
            [
              ["enabled", "Enable daily cron pipeline"],
              ["includeGscKeywords", "Import keywords from Search Console"],
              ["includeGoogleSuggest", "Use Google Suggest autocomplete"],
              ["includeTemplates", "Use scuba/Goa template phrases"],
              ["autoApproveKeywords", "Auto-approve new keywords"],
              ["autoGenerateBlogs", "Auto-generate blog on keyword approve"],
              ["autoApproveBlogs", "Auto-approve generated drafts"],
              ["autoPublish", "Auto-publish approved drafts to /blog"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-ocean-800">
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) =>
                  setSettings({ ...settings, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
          <label className="block text-sm">
            <span className="text-ocean-700">Keywords per day</span>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.keywordsPerDay}
              onChange={(e) =>
                setSettings({ ...settings, keywordsPerDay: Number(e.target.value) || 15 })
              }
              className="mt-1 block w-full rounded-lg border border-ocean-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ocean-700">Blogs to publish per day</span>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.blogsPerDay}
              onChange={(e) =>
                setSettings({ ...settings, blogsPerDay: Number(e.target.value) || 2 })
              }
              className="mt-1 block w-full rounded-lg border border-ocean-200 px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void saveSettings()}
            className="rounded-lg bg-ocean-700 px-4 py-2 text-sm text-white hover:bg-ocean-800 disabled:opacity-50"
          >
            Save settings
          </button>
        </div>
      ) : null}
    </div>
  );
}
