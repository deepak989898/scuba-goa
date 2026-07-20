"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogLanguage, BlogPostFirestore } from "@/lib/blog-firestore";
import type { BlogAutomationSettings } from "@/lib/blog-automation/settings";
import { defaultSlotsForCount } from "@/lib/blog-automation/schedule-utils";
import type { BlogTopicQueueItem } from "@/lib/blog-automation/topics";
import { BlogPostsTable } from "@/app/admin/blog-automation/BlogPostsTable";
import { BlogDailySchedulePanel } from "@/app/admin/blog-automation/BlogDailySchedulePanel";
import { utcIsoToIstDatetimeLocalValue } from "@/lib/blog-automation/schedule-ist";
import { GoogleBusinessSection } from "@/app/admin/blog-automation/GoogleBusinessSection";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";

type BlogTraffic = { views: number; visitors: number };

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
  const [posts, setPosts] = useState<BlogPostFirestore[]>([]);
  const [blogTrafficBySlug, setBlogTrafficBySlug] = useState<
    Record<string, BlogTraffic>
  >({});
  const [blogIndexTraffic, setBlogIndexTraffic] = useState<BlogTraffic>({
    views: 0,
    visitors: 0,
  });
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [trafficRefreshing, setTrafficRefreshing] = useState(false);
  const [editing, setEditing] = useState<BlogPostFirestore | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [titleInput, setTitleInput] = useState("");
  const [bulkTitles, setBulkTitles] = useState("");
  const [newLang, setNewLang] = useState<BlogLanguage>("hinglish");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const gbp = params.get("gbp");
    if (!gbp) return;
    if (gbp === "connected") {
      setOkMsg("Google Business account connected. Choose your location below.");
    } else if (gbp === "error") {
      const msg = params.get("msg") ?? "OAuth failed";
      setErr(`Google Business connect failed: ${msg}`);
    }
    params.delete("gbp");
    params.delete("msg");
    const q = params.toString();
    const next = `${window.location.pathname}${q ? `?${q}` : ""}`;
    window.history.replaceState({}, "", next);
  }, []);

  const loadBlogTraffic = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setTrafficLoading(true);
    try {
      const data = await adminFetch("/api/admin/blog-traffic");
      const bySlug = (data.bySlug ?? {}) as Record<string, BlogTraffic>;
      const index = (data.index ?? { views: 0, visitors: 0 }) as BlogTraffic;
      setBlogTrafficBySlug(bySlug);
      setBlogIndexTraffic({
        views: Math.max(0, Math.round(Number(index.views) || 0)),
        visitors: Math.max(0, Math.round(Number(index.visitors) || 0)),
      });
    } catch {
      setBlogTrafficBySlug({});
      setBlogIndexTraffic({ views: 0, visitors: 0 });
    } finally {
      if (!opts?.silent) setTrafficLoading(false);
    }
  }, []);

  async function refreshTrafficOnly() {
    setTrafficRefreshing(true);
    try {
      await loadBlogTraffic({ silent: true });
      setOkMsg("View counts updated.");
    } catch {
      setErr("Could not refresh view counts.");
    } finally {
      setTrafficRefreshing(false);
    }
  }

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
      await loadBlogTraffic();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [loadBlogTraffic]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const ta = blogTrafficBySlug[a.slug]?.views ?? 0;
      const tb = blogTrafficBySlug[b.slug]?.views ?? 0;
      if (tb !== ta) return tb - ta;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [posts, blogTrafficBySlug]);

  /** Slot dropdown options when editing posts (includes calendar-friendly times). */
  const publishSlotOptions = useMemo(() => {
    if (!settings) return [];
    const s = new Set<string>([
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
    ]);
    for (const t of settings.publishSlotsIst) s.add(t);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [settings]);

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

  function changePostsPerDay(next: number) {
    if (!settings) return;
    const count = Math.min(5, Math.max(1, next));
    let slots = [...settings.publishSlotsIst];
    const defaults = defaultSlotsForCount(count);
    while (slots.length < count) {
      slots.push(defaults[slots.length] ?? "09:00");
    }
    slots = slots.slice(0, count);
    void saveSettings({ postsPerDay: count, publishSlotsIst: slots });
  }

  function changeSlotTime(index: number, value: string) {
    if (!settings || !value) return;
    const slots = [...settings.publishSlotsIst];
    slots[index] = value;
    void saveSettings({ publishSlotsIst: slots });
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

  async function generateNow(opts?: {
    runDaily?: boolean;
    runNextSlot?: boolean;
    title?: string;
  }) {
    setBusy("generate");
    setErr(null);
    setOkMsg(null);
    try {
      const data = await adminFetch("/api/admin/blog-generate", {
        method: "POST",
        body: JSON.stringify({
          runDaily: opts?.runDaily,
          runNextSlot: opts?.runNextSlot,
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
      setEditing((e) => (e?.slug === slug ? null : e));
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveEditedPost(opts?: { publishNow?: boolean }) {
    if (!editing) return;
    setBusy(`save-${editing.slug}`);
    setErr(null);
    try {
      await adminFetch("/api/admin/blog-posts", {
        method: "PATCH",
        body: JSON.stringify({
          ...editing,
          scheduledPublishAtIst: utcIsoToIstDatetimeLocalValue(
            editing.scheduledPublishAt,
          ),
          publishNow: opts?.publishNow === true,
        }),
      });
      setOkMsg(
        opts?.publishNow
          ? `Published /blog/${editing.slug}`
          : `Saved /blog/${editing.slug}`,
      );
      setEditing(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function publishPostNow(slug: string) {
    setBusy(`save-${slug}`);
    setErr(null);
    try {
      await adminFetch("/api/admin/blog-posts", {
        method: "PATCH",
        body: JSON.stringify({ slug, publishNow: true }),
      });
      setOkMsg(`Published /blog/${slug}`);
      setEditing((e) => (e?.slug === slug ? null : e));
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function prepareScheduledToday() {
    setBusy("prepare");
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/blog-generate", {
        method: "POST",
        body: JSON.stringify({ prepareToday: true }),
      });
      const n = data.prepared?.length ?? 0;
      setOkMsg(
        n > 0
          ? `Prepared ${n} scheduled post(s). Review below before auto-publish.`
          : "No new posts prepared (slots may already exist for today).",
      );
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Prepare failed");
    } finally {
      setBusy(null);
    }
  }

  async function uploadBlogImage(file: File | null) {
    if (!file || !editing) return;
    setBusy(`img-${editing.slug}`);
    setErr(null);
    try {
      const token = await adminToken();
      const fd = new FormData();
      fd.append("slug", editing.slug);
      fd.append("file", file);
      const res = await fetch("/api/admin/blog-image-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setEditing((e) =>
        e
          ? {
              ...e,
              featuredImageUrl: data.featuredImageUrl ?? e.featuredImageUrl,
              ogImageUrl: data.ogImageUrl ?? data.featuredImageUrl ?? e.ogImageUrl,
            }
          : e,
      );
      setOkMsg(
        "New image uploaded and saved to the live blog. Hard-refresh the public page if you still see the old photo.",
      );
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateBlogImageWithAi() {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) {
      setErr("Enter a blog title first, then generate the image.");
      return;
    }
    setBusy(`ai-img-${editing.slug}`);
    setErr(null);
    setOkMsg(null);
    try {
      const data = await adminFetch("/api/admin/blog-image-generate", {
        method: "POST",
        body: JSON.stringify({ slug: editing.slug, title }),
      });
      setEditing((e) =>
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
      setOkMsg(
        "AI image generated from the title, saved as WebP with logo bar, and applied to the live blog.",
      );
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "AI image generation failed");
    } finally {
      setBusy(null);
    }
  }

  const pending = queue.filter((q) => q.status === "pending");

  const automationHint = settings
    ? `${settings.enabled ? "Auto-publish on" : "Auto-publish off"} · ${settings.postsPerDay} post(s)/day · slots ${settings.publishSlotsIst.join(", ")}`
    : undefined;

  const titleQueueHint =
    pending.length === 0
      ? "No pending titles — auto topics will be used"
      : `${pending.length} title${pending.length === 1 ? "" : "s"} waiting in queue`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">
            Blog automation (SEO)
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Generates SEO blogs ahead of time as <strong>Scheduled</strong> (review & edit
            below), then auto-publishes at each IST slot. Published posts show exact publish
            time (IST).
          </p>
          <p className="mt-2 text-xs font-medium text-ocean-600">
            Build: v2-multi-slot-watermark (May 2026) — you should see time pickers below, not
            “Preferred hour”. Hard-refresh (Ctrl+Shift+R) after Vercel shows this commit live.
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
        <p className="mt-3 text-ocean-600">Loading…</p>
      ) : (
        <>
          <AdminCollapseSection title="Automation settings" hint={automationHint}>
            <div className="flex flex-wrap items-center gap-3">
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
                  onChange={(e) => changePostsPerDay(Number(e.target.value))}
                  disabled={busy === "settings"}
                />
              </label>
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium text-ocean-800">
                Publish times (IST) — one per post
              </p>
              <ul className="mt-2 flex flex-wrap gap-2.5">
                {settings.publishSlotsIst.map((slot, i) => (
                  <li key={`${i}-${settings.postsPerDay}`}>
                    <label className="block text-xs text-ocean-600">
                      Post {i + 1}
                      <input
                        type="time"
                        className="mt-1 block rounded-lg border border-ocean-200 px-3 py-2 text-sm"
                        value={slot}
                        disabled={busy === "settings"}
                        onChange={(e) => changeSlotTime(i, e.target.value)}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-2 text-xs text-ocean-500">
              Set{" "}
              <code className="rounded bg-sand px-1">CRON_SECRET</code>,{" "}
              <code className="rounded bg-sand px-1">OPENAI_API_KEY</code>,{" "}
              <code className="rounded bg-sand px-1">PEXELS_API_KEY</code> on Vercel.
            </p>
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <strong>External scheduler required:</strong> the single Vercel Hobby daily
              cron is reserved for the analytics fallback. To publish at every configured
              IST slot, use free{" "}
              <a
                href="https://cron-job.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                cron-job.org
              </a>{" "}
              to call{" "}
              <code className="rounded bg-white px-1">GET /api/cron/blog-publish</code> every{" "}
              <strong>30 minutes</strong> with{" "}
              <code className="rounded bg-white px-1">
                Authorization: Bearer YOUR_CRON_SECRET
              </code>
              . A correct test returns <strong>HTTP 202</strong>. HTTP 401 means the header
              is missing or does not exactly match Vercel&apos;s{" "}
              <code className="rounded bg-white px-1">CRON_SECRET</code>. Each run publishes{" "}
              <strong>at most 1</strong> post for the next due slot.
            </p>
            {settings.lastRunAt && (
              <p className="mt-2 text-xs text-ocean-600">
                Last run: {settings.lastRunAt} — {settings.lastRunStatus}
                {settings.lastRunError ? ` (${settings.lastRunError})` : ""}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy === "generate"}
                onClick={() => void generateNow({ title: titleInput.trim() || undefined })}
                className="rounded-full bg-ocean-gradient px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "generate" ? "Working…" : "Generate 1 post now"}
              </button>
              <button
                type="button"
                disabled={busy === "prepare"}
                onClick={() => void prepareScheduledToday()}
                className="rounded-full border border-sky-300 bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-900 disabled:opacity-50"
              >
                {busy === "prepare"
                  ? "Preparing…"
                  : "Prepare today's scheduled posts"}
              </button>
              <button
                type="button"
                disabled={busy === "generate"}
                onClick={() => void generateNow({ runNextSlot: true })}
                className="rounded-full border border-ocean-300 px-4 py-1.5 text-sm font-semibold text-ocean-800 disabled:opacity-50"
              >
                Run cron now (publish due)
              </button>
              <button
                type="button"
                disabled={busy === "generate"}
                onClick={() => {
                  if (
                    !confirm(
                      "Publish ALL remaining posts for today at once (ignores IST times). Use only for testing.",
                    )
                  ) {
                    return;
                  }
                  void generateNow({ runDaily: true });
                }}
                className="rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-950 disabled:opacity-50"
              >
                Publish all remaining today
              </button>
            </div>
          </AdminCollapseSection>

          <BlogDailySchedulePanel
            adminFetch={adminFetch}
            settings={settings}
            onMessage={(m) => {
              if (m.ok) setOkMsg(m.ok);
              if (m.err) setErr(m.err);
            }}
            onSaved={() => void refresh()}
          />

          <GoogleBusinessSection
            onMessage={(m) => {
              if (m.ok) setOkMsg(m.ok);
              if (m.err) setErr(m.err);
            }}
          />

          <AdminCollapseSection
            title="Title queue (admin priority)"
            hint={titleQueueHint}
          >
            <p className="text-xs text-ocean-600">
              Pending titles are used before auto-generated topics. One title per line for
              bulk add.
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
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
            <label className="mt-3 block text-sm text-ocean-800">
              Bulk titles (one per line)
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-lg border border-ocean-200 px-3 py-2 font-mono text-sm"
                value={bulkTitles}
                onChange={(e) => setBulkTitles(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={busy === "queue"}
              onClick={() => void addTitles()}
              className="mt-3 rounded-full border border-ocean-300 px-4 py-1.5 text-sm font-semibold text-ocean-800 disabled:opacity-50"
            >
              Add to queue
            </button>

            <details className="group mt-3 overflow-hidden rounded-xl border border-ocean-100 bg-sand/20 open:border-cyan-300 open:bg-cyan-50/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 marker:hidden transition hover:bg-ocean-50/80">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ocean-900">Pending queue titles</p>
                  <p className="mt-0.5 text-xs text-ocean-600">
                    {pending.length === 0
                      ? "No pending titles — auto topics will be used."
                      : `${pending.length} title${pending.length === 1 ? "" : "s"} waiting · click to expand`}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-base font-bold text-ocean-800 shadow-sm transition group-open:rotate-180 group-open:bg-cyan-100"
                >
                  ⌄
                </span>
              </summary>
              <ul className="space-y-2 border-t border-ocean-100 px-3 py-3">
                {pending.length === 0 ? (
                  <li className="text-sm text-ocean-500">
                    No pending titles — auto topics will be used.
                  </li>
                ) : (
                  pending.map((q, i) => (
                    <li
                      key={q.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ocean-100 bg-white px-3 py-2 text-sm"
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
            </details>
          </AdminCollapseSection>

          <BlogPostsTable
            posts={posts}
            sortedPosts={sortedPosts}
            publishSlots={publishSlotOptions}
            blogTrafficBySlug={blogTrafficBySlug}
            blogIndexTraffic={blogIndexTraffic}
            trafficLoading={trafficLoading}
            editing={editing}
            busy={busy}
            onEdit={setEditing}
            onCancelEdit={() => setEditing(null)}
            onChangeEditing={setEditing}
            onSave={(opts) => void saveEditedPost(opts)}
            onPublishNow={(slug) => void publishPostNow(slug)}
            onUnpublish={(slug) => void unpublishPost(slug)}
            onDelete={(slug) => void deletePost(slug)}
            onUploadImage={(file) => void uploadBlogImage(file)}
            onGenerateAiImage={() => void generateBlogImageWithAi()}
            onRefreshTraffic={() => void refreshTrafficOnly()}
            trafficRefreshing={trafficRefreshing}
          />
        </>
      )}
    </div>
  );
}
