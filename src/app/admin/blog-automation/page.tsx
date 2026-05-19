"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogLanguage } from "@/lib/blog-firestore";
import type { BlogAutomationSettings } from "@/lib/blog-automation/settings";
import type { BlogTopicQueueItem } from "@/lib/blog-automation/topics";

type FirestoreBlogRow = {
  slug: string;
  title: string;
  date: string;
  language: string;
  published: boolean;
  featuredImageUrl?: string;
  source?: string;
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

export default function AdminBlogAutomationPage() {
  const [settings, setSettings] = useState<BlogAutomationSettings | null>(null);
  const [queue, setQueue] = useState<BlogTopicQueueItem[]>([]);
  const [posts, setPosts] = useState<FirestoreBlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [titleInput, setTitleInput] = useState("");
  const [bulkTitles, setBulkTitles] = useState("");
  const [newLang, setNewLang] = useState<BlogLanguage>("hinglish");

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [s, q, p] = await Promise.all([
        adminFetch("/api/admin/blog-automation"),
        adminFetch("/api/admin/blog-queue"),
        adminFetch("/api/admin/blog-posts"),
      ]);
      setSettings(s.settings);
      setQueue(q.items ?? []);
      setPosts(p.posts ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveSettings(patch: Partial<BlogAutomationSettings>) {
    setBusy("settings");
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/blog-automation", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSettings(data.settings);
      setOkMsg("Settings saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function addTitles() {
    const lines = bulkTitles
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const single = titleInput.trim();
    const titles = single ? [single, ...lines] : lines;
    if (titles.length === 0) {
      setErr("Enter at least one title.");
      return;
    }
    setBusy("queue");
    setErr(null);
    try {
      await adminFetch("/api/admin/blog-queue", {
        method: "POST",
        body: JSON.stringify({ titles, language: newLang }),
      });
      setTitleInput("");
      setBulkTitles("");
      await refresh();
      setOkMsg(`Added ${titles.length} title(s) to queue.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Queue add failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateNow(opts?: { runDaily?: boolean; title?: string }) {
    setBusy("generate");
    setErr(null);
    setOkMsg(null);
    try {
      const data = await adminFetch("/api/admin/blog-generate", {
        method: "POST",
        body: JSON.stringify({
          runDaily: opts?.runDaily,
          title: opts?.title,
        }),
      });
      if (data.published?.length) {
        setOkMsg(`Published: ${data.published.join(", ")}`);
      } else if (data.slug) {
        setOkMsg(`Published: /blog/${data.slug}`);
      } else {
        setOkMsg("Run finished (see skipped/errors in response).");
      }
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(null);
    }
  }

  async function removeQueue(id: string) {
    if (!confirm("Remove this queued title?")) return;
    setBusy(`q-${id}`);
    try {
      await adminFetch(`/api/admin/blog-queue?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function unpublishPost(slug: string) {
    if (!confirm(`Unpublish blog “${slug}”?`)) return;
    setBusy(`post-${slug}`);
    try {
      await adminFetch("/api/admin/blog-posts", {
        method: "PATCH",
        body: JSON.stringify({ slug, published: false }),
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function deletePost(slug: string) {
    if (!confirm(`Delete blog “${slug}” permanently from Firestore?`)) return;
    setBusy(`del-${slug}`);
    try {
      await adminFetch(`/api/admin/blog-posts?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  const pending = queue.filter((q) => q.status === "pending");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">
            Blog automation (SEO)
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Auto-generates SEO blogs (English, Hindi, Hinglish) with OpenAI, Pexels images
            (compressed to WebP in Firebase Storage), and daily Vercel cron. Default: 1 post/day.
            Queued admin titles publish first, in order.
          </p>
        </div>
        <Link
          href="/admin/seo-pages"
          className="text-sm font-semibold text-ocean-700 hover:text-ocean-900"
        >
          SEO guides →
        </Link>
      </div>

      {err && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {err}
        </p>
      )}
      {okMsg && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {okMsg}
        </p>
      )}

      {loading || !settings ? (
        <p className="mt-8 text-ocean-600">Loading…</p>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ocean-900">
              Automation settings
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-ocean-800">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => void saveSettings({ enabled: e.target.checked })}
                  disabled={busy === "settings"}
                />
                Auto-publish daily (cron)
              </label>
              <label className="text-sm text-ocean-800">
                Posts per day (max 5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="ml-2 w-16 rounded border border-ocean-200 px-2 py-1"
                  value={settings.postsPerDay}
                  onChange={(e) =>
                    void saveSettings({ postsPerDay: Number(e.target.value) })
                  }
                  disabled={busy === "settings"}
                />
              </label>
              <label className="text-sm text-ocean-800">
                Preferred hour (IST)
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="ml-2 w-16 rounded border border-ocean-200 px-2 py-1"
                  value={settings.publishHourIst}
                  onChange={(e) =>
                    void saveSettings({ publishHourIst: Number(e.target.value) })
                  }
                  disabled={busy === "settings"}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-ocean-500">
              Cron runs daily ~9:00 IST (3:30 UTC). Set{" "}
              <code className="rounded bg-sand px-1">CRON_SECRET</code>,{" "}
              <code className="rounded bg-sand px-1">OPENAI_API_KEY</code>,{" "}
              <code className="rounded bg-sand px-1">PEXELS_API_KEY</code> on Vercel.
            </p>
            {settings.lastRunAt && (
              <p className="mt-2 text-xs text-ocean-600">
                Last run: {settings.lastRunAt} — {settings.lastRunStatus}
                {settings.lastRunError ? ` (${settings.lastRunError})` : ""}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy === "generate"}
                onClick={() => void generateNow({ title: titleInput.trim() || undefined })}
                className="rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "generate" ? "Working…" : "Generate 1 post now"}
              </button>
              <button
                type="button"
                disabled={busy === "generate"}
                onClick={() => void generateNow({ runDaily: true })}
                className="rounded-full border border-ocean-300 px-5 py-2 text-sm font-semibold text-ocean-800 disabled:opacity-50"
              >
                Run daily job now
              </button>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ocean-900">
              Title queue (admin priority)
            </h2>
            <p className="mt-1 text-sm text-ocean-600">
              Pending titles are used before auto-generated topics. One title per line for bulk add.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-ocean-800">
                Single title
                <input
                  className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Best scuba diving packages in Goa 2026"
                />
              </label>
              <label className="block text-sm text-ocean-800">
                Language
                <select
                  className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value as BlogLanguage)}
                >
                  <option value="hinglish">Hinglish</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm text-ocean-800">
              Bulk titles (one per line)
              <textarea
                className="mt-1 min-h-[100px] w-full rounded-lg border border-ocean-200 px-3 py-2 font-mono text-sm"
                value={bulkTitles}
                onChange={(e) => setBulkTitles(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={busy === "queue"}
              onClick={() => void addTitles()}
              className="mt-4 rounded-full border border-ocean-300 px-5 py-2 text-sm font-semibold text-ocean-800 disabled:opacity-50"
            >
              Add to queue
            </button>

            <ul className="mt-6 space-y-2">
              {pending.length === 0 ? (
                <li className="text-sm text-ocean-500">No pending titles — auto topics will be used.</li>
              ) : (
                pending.map((q, i) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ocean-100 bg-sand/30 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="text-ocean-400">#{i + 1}</span> {q.title}{" "}
                      <span className="text-ocean-500">({q.language})</span>
                    </span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      disabled={busy === `q-${q.id}`}
                      onClick={() => void removeQueue(q.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ocean-900">
              Firestore blog posts ({posts.length})
            </h2>
            <ul className="mt-4 space-y-3">
              {posts.length === 0 ? (
                <li className="text-sm text-ocean-500">No auto blogs yet.</li>
              ) : (
                posts.map((p) => (
                  <li
                    key={p.slug}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ocean-100 p-4"
                  >
                    <div>
                      <p className="font-semibold text-ocean-900">{p.title}</p>
                      <p className="text-xs text-ocean-500">
                        /blog/{p.slug} · {p.date} · {p.language} ·{" "}
                        {p.published ? "published" : "draft"} · {p.source ?? "auto"}
                      </p>
                      {p.featuredImageUrl ? (
                        <a
                          href={p.featuredImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-ocean-600 underline"
                        >
                          View compressed image
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Link
                        href={`/blog/${p.slug}`}
                        className="font-semibold text-ocean-700 hover:underline"
                        target="_blank"
                      >
                        View
                      </Link>
                      {p.published && (
                        <button
                          type="button"
                          className="text-amber-700 hover:underline"
                          disabled={busy === `post-${p.slug}`}
                          onClick={() => void unpublishPost(p.slug)}
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        disabled={busy === `del-${p.slug}`}
                        onClick={() => void deletePost(p.slug)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
