"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogPostFirestore } from "@/lib/blog-firestore";
import type { SeoPageFirestore } from "@/lib/seo-page-firestore";
import type { SocialPlatform } from "@/lib/social-media/types";
import type { SocialAutomationFlags } from "@/lib/social-media/settings";
import { GoogleBusinessSection } from "@/app/admin/blog-automation/GoogleBusinessSection";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";

type MetaPageOption = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessId: string;
  instagramUsername: string;
};

type StatusResponse = {
  automation: SocialAutomationFlags;
  googleBusiness: {
    settings: {
      hasRefreshToken: boolean;
      configured: boolean;
      locationTitle: string;
      enabled: boolean;
    };
  };
  meta: {
    settings: {
      connected: boolean;
      pageName: string;
      instagramConnected: boolean;
      instagramUsername: string;
      lastPostAt: string | null;
      lastPostError: string | null;
    };
    configured: boolean;
  };
  youtube: {
    settings: {
      connected: boolean;
      channelTitle: string;
      lastPostAt: string | null;
      lastPostError: string | null;
    };
    configured: boolean;
  };
  recentPosts: Array<{
    id?: string;
    title?: string;
    slug?: string;
    contentType?: string;
    trigger?: string;
    createdAt?: string;
    results?: Array<{ platform: string; ok: boolean; posted: boolean; message: string }>;
  }>;
};

const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "googleBusiness", label: "Google Business" },
  { id: "facebook", label: "Facebook Page" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];

async function adminFetch(path: string, init?: RequestInit) {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in at /admin/login first.");
  const token = await user.getIdToken();
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

export default function AdminSocialMediaPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [blogs, setBlogs] = useState<BlogPostFirestore[]>([]);
  const [guides, setGuides] = useState<SeoPageFirestore[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [metaPages, setMetaPages] = useState<MetaPageOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");

  const [postContentType, setPostContentType] = useState<"blog" | "guide">("blog");
  const [postSlug, setPostSlug] = useState("");
  const [postPlatforms, setPostPlatforms] = useState<Set<SocialPlatform>>(
    () => new Set(["googleBusiness", "facebook"]),
  );

  const loadStatus = useCallback(async () => {
    const data = await adminFetch("/api/admin/social-media/status");
    setStatus(data as StatusResponse);
    return data as StatusResponse;
  }, []);

  const loadContent = useCallback(async () => {
    const [blogData, guideData] = await Promise.all([
      adminFetch("/api/admin/blog-posts").catch(() => ({ posts: [] })),
      adminFetch("/api/admin/seo-pages").catch(() => ({ pages: [] })),
    ]);
    setBlogs((blogData.posts ?? []) as BlogPostFirestore[]);
    setGuides((guideData.pages ?? []) as SeoPageFirestore[]);
  }, []);

  useEffect(() => {
    loadStatus().catch((e) =>
      setMsg({ err: e instanceof Error ? e.message : "Failed to load" }),
    );
    loadContent().catch(() => {});
  }, [loadStatus, loadContent]);

  useEffect(() => {
    const gbp = searchParams.get("gbp");
    const meta = searchParams.get("meta");
    const youtube = searchParams.get("youtube");
    const errMsg = searchParams.get("msg");
    if (gbp === "connected") {
      setMsg({ ok: "Google Business account connected. Select your location below." });
      void loadStatus();
    } else if (gbp === "error") {
      setMsg({ err: `Google OAuth failed: ${errMsg ?? "unknown"}` });
    }
    if (meta === "connected") {
      setMsg({ ok: "Facebook connected. Load pages and pick your Facebook Page." });
      void loadStatus();
    } else if (meta === "error") {
      setMsg({ err: `Facebook OAuth failed: ${errMsg ?? "unknown"}` });
    }
    if (youtube === "connected") {
      setMsg({ ok: "YouTube channel connected." });
      void loadStatus();
    } else if (youtube === "error") {
      setMsg({ err: `YouTube OAuth failed: ${errMsg ?? "unknown"}` });
    }
  }, [searchParams, loadStatus]);

  const publishedBlogs = useMemo(
    () => blogs.filter((b) => b.published).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [blogs],
  );
  const publishedGuides = useMemo(
    () => guides.filter((g) => g.published).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [guides],
  );

  async function saveAutomation(patch: Partial<SocialAutomationFlags>) {
    if (!status) return;
    setBusy("automation");
    try {
      const automation = { ...status.automation, ...patch };
      await adminFetch("/api/admin/social-media/status", {
        method: "PATCH",
        body: JSON.stringify({ automation }),
      });
      await loadStatus();
      setMsg({ ok: "Automation settings saved." });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(null);
    }
  }

  async function connectMeta() {
    setBusy("meta-connect");
    try {
      const data = await adminFetch("/api/admin/social-media/meta/auth-url", {
        method: "POST",
      });
      window.location.href = data.url;
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Connect failed" });
      setBusy(null);
    }
  }

  async function loadMetaPages() {
    setBusy("meta-pages");
    try {
      const data = await adminFetch("/api/admin/social-media/meta/pages");
      const pages = (data.pages ?? []) as MetaPageOption[];
      setMetaPages(pages);
      if (pages.length === 1) setSelectedPageId(pages[0].pageId);
      setMsg({
        ok: pages.length
          ? `Found ${pages.length} Facebook Page(s). Select one below.`
          : "No Facebook Pages found for this account.",
      });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Could not load pages" });
    } finally {
      setBusy(null);
    }
  }

  async function selectMetaPage() {
    const page = metaPages.find((p) => p.pageId === selectedPageId);
    if (!page) {
      setMsg({ err: "Select a Facebook Page first." });
      return;
    }
    setBusy("meta-select");
    try {
      await adminFetch("/api/admin/social-media/meta/select-page", {
        method: "POST",
        body: JSON.stringify(page),
      });
      await loadStatus();
      setMsg({
        ok: `Connected: ${page.pageName}${page.instagramBusinessId ? ` + @${page.instagramUsername}` : ""}`,
      });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Save page failed" });
    } finally {
      setBusy(null);
    }
  }

  async function disconnectMeta() {
    if (!confirm("Disconnect Facebook & Instagram?")) return;
    setBusy("meta-disconnect");
    try {
      await adminFetch("/api/admin/social-media/meta/select-page", { method: "DELETE" });
      setMetaPages([]);
      setSelectedPageId("");
      await loadStatus();
      setMsg({ ok: "Facebook disconnected." });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Disconnect failed" });
    } finally {
      setBusy(null);
    }
  }

  async function connectYouTube() {
    setBusy("youtube-connect");
    try {
      const data = await adminFetch("/api/admin/social-media/youtube/auth-url", {
        method: "POST",
      });
      window.location.href = data.url;
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Connect failed" });
      setBusy(null);
    }
  }

  async function disconnectYouTube() {
    if (!confirm("Disconnect YouTube channel?")) return;
    setBusy("youtube-disconnect");
    try {
      await adminFetch("/api/admin/social-media/youtube/disconnect", { method: "DELETE" });
      await loadStatus();
      setMsg({ ok: "YouTube disconnected." });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Disconnect failed" });
    } finally {
      setBusy(null);
    }
  }

  function togglePostPlatform(id: SocialPlatform) {
    setPostPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function postNow() {
    if (!postSlug) {
      setMsg({ err: "Select content to post." });
      return;
    }
    if (!postPlatforms.size) {
      setMsg({ err: "Select at least one platform." });
      return;
    }
    setBusy("post");
    try {
      const data = await adminFetch("/api/admin/social-media/post", {
        method: "POST",
        body: JSON.stringify({
          contentType: postContentType,
          slug: postSlug,
          platforms: [...postPlatforms],
        }),
      });
      const results = (data.log?.results ?? []) as Array<{
        platform: string;
        ok: boolean;
        posted: boolean;
        message: string;
      }>;
      const summary = results
        .map((r) => `${r.platform}: ${r.posted ? "posted" : r.message}`)
        .join(" · ");
      await loadStatus();
      setMsg({ ok: summary || "Post dispatched." });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Post failed" });
    } finally {
      setBusy(null);
    }
  }

  const meta = status?.meta;
  const youtube = status?.youtube;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ocean-950">Social media</h1>
        <p className="mt-2 text-sm text-ocean-700">
          Connect accounts once, then post any blog or guide manually — or turn on automation to
          share new publishes automatically.
        </p>
      </header>

      {msg.ok ? (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {msg.ok}
        </p>
      ) : null}
      {msg.err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {msg.err}
        </p>
      ) : null}

      <section className="mb-8 rounded-xl border border-ocean-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ocean-950">Auto-post on publish</h2>
        <p className="mt-1 text-sm text-ocean-600">
          When a blog or guide is published, post to the platforms you enable below.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLATFORMS.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ocean-100 px-4 py-3"
            >
              <input
                type="checkbox"
                checked={status?.automation[p.id] === true}
                disabled={!status || busy === "automation"}
                onChange={(e) => void saveAutomation({ [p.id]: e.target.checked })}
              />
              <span className="text-sm font-medium text-ocean-900">{p.label}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        <GoogleBusinessSection onMessage={setMsg} hideAutoPostToggle />

        <AdminCollapseSection
          title="Facebook Page & Instagram"
          hint={
            meta?.settings.connected
              ? `${meta.settings.pageName}${meta.settings.instagramConnected ? ` · @${meta.settings.instagramUsername}` : ""}`
              : "Not connected"
          }
        >
          <p className="text-sm text-ocean-700">
            One Meta login connects your <strong>Facebook Page</strong>. If an Instagram Business
            account is linked to that page, Instagram posting is enabled too.
          </p>
          {!meta?.configured ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add <code className="text-xs">META_APP_ID</code> and{" "}
              <code className="text-xs">META_APP_SECRET</code> in Vercel env, then redeploy.
            </p>
          ) : null}
          <ul className="mt-4 space-y-1 text-sm text-ocean-800">
            <li>
              Status:{" "}
              {meta?.settings.connected ? (
                <span className="font-semibold text-green-700">Connected</span>
              ) : (
                <span className="text-amber-700">Not connected</span>
              )}
            </li>
            {meta?.settings.lastPostError ? (
              <li className="text-red-700">Last error: {meta.settings.lastPostError}</li>
            ) : null}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!meta?.configured || busy != null}
              onClick={() => void connectMeta()}
              className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-800 disabled:opacity-50"
            >
              {busy === "meta-connect" ? "Redirecting…" : "Connect Facebook"}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void loadMetaPages()}
              className="rounded-lg border border-ocean-300 px-4 py-2 text-sm font-medium text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
            >
              {busy === "meta-pages" ? "Loading…" : "Load pages"}
            </button>
            {meta?.settings.connected ? (
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void disconnectMeta()}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Disconnect
              </button>
            ) : null}
          </div>
          {metaPages.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block text-sm">
                <span className="text-ocean-700">Facebook Page</span>
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="mt-1 block min-w-[240px] rounded border border-ocean-200 px-3 py-2"
                >
                  <option value="">Select…</option>
                  {metaPages.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {p.pageName}
                      {p.instagramUsername ? ` (@${p.instagramUsername})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!selectedPageId || busy != null}
                onClick={() => void selectMetaPage()}
                className="rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-700 disabled:opacity-50"
              >
                Use this page
              </button>
            </div>
          ) : null}
        </AdminCollapseSection>

        <AdminCollapseSection
          title="YouTube"
          hint={
            youtube?.settings.connected
              ? youtube.settings.channelTitle
              : "Not connected"
          }
        >
          <p className="text-sm text-ocean-700">
            YouTube Community posts are not available via API. When connected, automation logs a
            ready-to-paste caption and link for YouTube Studio → Community.
          </p>
          {!youtube?.configured ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Set <code className="text-xs">GOOGLE_YOUTUBE_CLIENT_ID</code> /{" "}
              <code className="text-xs">GOOGLE_YOUTUBE_CLIENT_SECRET</code> (or reuse Google
              Business OAuth credentials).
            </p>
          ) : null}
          <ul className="mt-4 space-y-1 text-sm text-ocean-800">
            <li>
              Channel:{" "}
              {youtube?.settings.connected ? (
                <span className="font-medium">{youtube.settings.channelTitle}</span>
              ) : (
                <span className="text-ocean-500">Not connected</span>
              )}
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!youtube?.configured || busy != null}
              onClick={() => void connectYouTube()}
              className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-800 disabled:opacity-50"
            >
              {busy === "youtube-connect" ? "Redirecting…" : "Connect YouTube"}
            </button>
            {youtube?.settings.connected ? (
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void disconnectYouTube()}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </AdminCollapseSection>
      </div>

      <section className="mt-10 rounded-xl border border-ocean-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ocean-950">Post now</h2>
        <p className="mt-1 text-sm text-ocean-600">
          Pick a published blog or guide and share it immediately.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="text-ocean-700">Content type</span>
            <select
              value={postContentType}
              onChange={(e) => {
                setPostContentType(e.target.value as "blog" | "guide");
                setPostSlug("");
              }}
              className="mt-1 block rounded border border-ocean-200 px-3 py-2"
            >
              <option value="blog">Blog post</option>
              <option value="guide">Guide page</option>
            </select>
          </label>
          <label className="min-w-[280px] text-sm">
            <span className="text-ocean-700">Content</span>
            <select
              value={postSlug}
              onChange={(e) => setPostSlug(e.target.value)}
              className="mt-1 block w-full rounded border border-ocean-200 px-3 py-2"
            >
              <option value="">Select…</option>
              {(postContentType === "blog" ? publishedBlogs : publishedGuides).map((item) => (
                <option
                  key={item.slug}
                  value={item.slug}
                >
                  {postContentType === "blog"
                    ? (item as BlogPostFirestore).title
                    : (item as SeoPageFirestore).headline}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={postPlatforms.has(p.id)}
                onChange={() => togglePostPlatform(p.id)}
              />
              {p.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void postNow()}
          className="mt-5 rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
        >
          {busy === "post" ? "Posting…" : "Post now"}
        </button>
      </section>

      {status?.recentPosts?.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-ocean-950">Recent activity</h2>
          <ul className="mt-3 space-y-2">
            {status.recentPosts.map((row, i) => (
              <li
                key={row.id ?? i}
                className="rounded-lg border border-ocean-100 bg-ocean-50/50 px-4 py-3 text-sm"
              >
                <div className="font-medium text-ocean-900">
                  {row.title ?? row.slug}{" "}
                  <span className="font-normal text-ocean-500">
                    ({row.contentType} · {row.trigger})
                  </span>
                </div>
                <div className="mt-1 text-ocean-600">
                  {(row.results ?? [])
                    .map((r) => `${r.platform}: ${r.posted ? "✓" : r.message}`)
                    .join(" · ")}
                </div>
                {row.createdAt ? (
                  <div className="mt-1 text-xs text-ocean-400">
                    {new Date(row.createdAt).toLocaleString("en-IN")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
