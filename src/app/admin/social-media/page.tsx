"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogPostFirestore } from "@/lib/blog-firestore";
import type { SeoPageFirestore } from "@/lib/seo-page-firestore";
import type { SocialPlatform } from "@/lib/social-media/types";
import type { SocialAutomationFlags } from "@/lib/social-media/settings";
import type { SocialQueueItem, SocialScheduleSettings } from "@/lib/social-media/schedule";
import { GoogleBusinessSection } from "@/app/admin/blog-automation/GoogleBusinessSection";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";
import {
  SocialPlatformIcon,
  socialPlatformLabel,
} from "@/components/admin/SocialPlatformIcon";

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

type GalleryMediaOption = {
  id: string;
  title: string;
  contentType: "video" | "reel";
  mediaUrl: string;
  posterUrl?: string;
  category?: string;
};

type PostContentType = "blog" | "guide" | "video" | "reel";

type WhatsAppAgentStatus = {
  settings: {
    enabled: boolean;
    maxRepliesPerUserPerHour: number;
    handoffCooldownHours: number;
    businessIntro: string;
  };
  configured: boolean;
  webhookUrl: string;
  verifyTokenSet: boolean;
  openAiSet: boolean;
};

const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "googleBusiness", label: "Google Business" },
  { id: "facebook", label: "Facebook Page" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];

function PlatformCheckbox({
  platform,
  label,
  checked,
  disabled,
  onChange,
}: {
  platform: SocialPlatform;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-ocean-100 px-4 py-3 transition hover:border-ocean-200 hover:bg-ocean-50/50"
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="shrink-0"
      />
      <SocialPlatformIcon platform={platform} size={24} />
      <span className="text-sm font-medium text-ocean-900">{label}</span>
    </label>
  );
}

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

  const [postContentType, setPostContentType] = useState<PostContentType>("blog");
  const [postSlug, setPostSlug] = useState("");
  const [galleryVideos, setGalleryVideos] = useState<GalleryMediaOption[]>([]);
  const [galleryReels, setGalleryReels] = useState<GalleryMediaOption[]>([]);
  const [postPlatforms, setPostPlatforms] = useState<Set<SocialPlatform>>(
    () => new Set(["googleBusiness", "facebook"]),
  );
  const [waStatus, setWaStatus] = useState<WhatsAppAgentStatus | null>(null);
  const [waIntro, setWaIntro] = useState("");
  const [schedule, setSchedule] = useState<SocialScheduleSettings | null>(null);
  const [scheduleLabels, setScheduleLabels] = useState<{
    nextRunAtLabel?: string;
    lastRunAtLabel?: string;
  }>({});
  const [queueDraft, setQueueDraft] = useState<SocialQueueItem[]>([]);
  const [queueAddType, setQueueAddType] = useState<PostContentType>("blog");
  const [queueAddRef, setQueueAddRef] = useState("");

  const loadStatus = useCallback(async () => {
    const data = await adminFetch("/api/admin/social-media/status");
    setStatus(data as StatusResponse);
    return data as StatusResponse;
  }, []);

  const loadWhatsApp = useCallback(async () => {
    const data = await adminFetch("/api/admin/social-media/whatsapp");
    setWaStatus(data as WhatsAppAgentStatus);
    setWaIntro(String((data as WhatsAppAgentStatus).settings?.businessIntro ?? ""));
    return data as WhatsAppAgentStatus;
  }, []);

  const loadSchedule = useCallback(async () => {
    const data = await adminFetch("/api/admin/social-media/schedule");
    const s = data.schedule as SocialScheduleSettings;
    setSchedule(s);
    setQueueDraft([...(s.queue ?? [])].sort((a, b) => a.order - b.order));
    setScheduleLabels({
      nextRunAtLabel: String(data.nextRunAtLabel ?? ""),
      lastRunAtLabel: String(data.lastRunAtLabel ?? ""),
    });
    return data;
  }, []);

  const loadContent = useCallback(async () => {
    const [blogData, guideData, galleryData] = await Promise.all([
      adminFetch("/api/admin/blog-posts").catch(() => ({ posts: [] })),
      adminFetch("/api/admin/seo-pages").catch(() => ({ pages: [] })),
      adminFetch("/api/admin/social-media/gallery-media").catch(() => ({ items: [] })),
    ]);
    setBlogs((blogData.posts ?? []) as BlogPostFirestore[]);
    setGuides((guideData.pages ?? []) as SeoPageFirestore[]);
    const items = (galleryData.items ?? []) as GalleryMediaOption[];
    setGalleryVideos(items.filter((i) => i.contentType === "video"));
    setGalleryReels(items.filter((i) => i.contentType === "reel"));
  }, []);

  useEffect(() => {
    loadStatus().catch((e) =>
      setMsg({ err: e instanceof Error ? e.message : "Failed to load" }),
    );
    loadContent().catch(() => {});
    loadWhatsApp().catch(() => {});
    loadSchedule().catch(() => {});
  }, [loadStatus, loadContent, loadWhatsApp, loadSchedule]);

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

  const postMediaOptions = useMemo(() => {
    if (postContentType === "blog") return publishedBlogs;
    if (postContentType === "guide") return publishedGuides;
    if (postContentType === "video") return galleryVideos;
    return galleryReels;
  }, [postContentType, publishedBlogs, publishedGuides, galleryVideos, galleryReels]);

  async function saveSchedule(patch: Partial<SocialScheduleSettings>) {
    setBusy("schedule");
    try {
      const data = await adminFetch("/api/admin/social-media/schedule", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const s = data.schedule as SocialScheduleSettings;
      setSchedule(s);
      setQueueDraft([...(s.queue ?? [])].sort((a, b) => a.order - b.order));
      await loadSchedule();
      setMsg({ ok: "Scheduled auto-post settings saved." });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(null);
    }
  }

  function queueAddOptions(): { id: string; title: string }[] {
    if (queueAddType === "blog") {
      return publishedBlogs.map((b) => ({ id: b.slug, title: b.title }));
    }
    if (queueAddType === "guide") {
      return publishedGuides.map((g) => ({ id: g.slug, title: g.headline }));
    }
    if (queueAddType === "video") {
      return galleryVideos.map((v) => ({ id: v.id, title: v.title }));
    }
    return galleryReels.map((r) => ({ id: r.id, title: r.title }));
  }

  function addToQueue() {
    if (!queueAddRef) {
      setMsg({ err: "Select content to add to the queue." });
      return;
    }
    const options = queueAddOptions();
    const picked = options.find((o) => o.id === queueAddRef);
    if (!picked) return;
    const exists = queueDraft.some(
      (q) => q.contentType === queueAddType && q.refId === queueAddRef,
    );
    if (exists) {
      setMsg({ err: "This item is already in the queue." });
      return;
    }
    const item: SocialQueueItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      contentType: queueAddType,
      refId: queueAddRef,
      title: picked.title,
      order: queueDraft.length,
      addedAt: new Date().toISOString(),
      postCount: 0,
    };
    setQueueDraft((prev) => [...prev, item]);
    setQueueAddRef("");
    setMsg({ ok: `Added "${picked.title}" to queue. Click Save queue & start.` });
  }

  function removeFromQueue(id: string) {
    setQueueDraft((prev) =>
      prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i })),
    );
  }

  function moveQueueItem(id: string, dir: -1 | 1) {
    setQueueDraft((prev) => {
      const list = [...prev].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((q) => q.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= list.length) return prev;
      const a = list[idx];
      const b = list[next];
      list[idx] = { ...b, order: idx };
      list[next] = { ...a, order: next };
      return list;
    });
  }

  async function saveQueueAndSettings(enabled?: boolean) {
    if (!schedule) return;
    await saveSchedule({
      enabled: enabled ?? schedule.enabled,
      frequency: schedule.frequency,
      timeIst: schedule.timeIst,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      platforms: schedule.platforms,
      queue: queueDraft.map((q, i) => ({ ...q, order: i })),
    });
  }

  async function runScheduleNow() {
    setBusy("schedule-run");
    try {
      const data = await adminFetch("/api/admin/social-media/schedule", {
        method: "POST",
        body: JSON.stringify({ force: true }),
      });
      await loadSchedule();
      await loadStatus();
      const summary = String(data.result?.summary ?? "Schedule run completed.");
      setMsg({ ok: summary });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Run failed" });
    } finally {
      setBusy(null);
    }
  }

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

  async function saveWhatsAppSettings(patch: {
    enabled?: boolean;
    maxRepliesPerUserPerHour?: number;
    businessIntro?: string;
  }) {
    setBusy("wa-settings");
    try {
      const data = await adminFetch("/api/admin/social-media/whatsapp", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setWaStatus((prev) =>
        prev ? { ...prev, settings: data.settings } : prev,
      );
      setMsg({ ok: "WhatsApp agent settings saved." });
    } catch (e) {
      setMsg({ err: e instanceof Error ? e.message : "Save failed" });
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
        .map((r) => {
          if (r.platform === "youtube") {
            return r.posted
              ? "youtube: posted"
              : "youtube: manual — paste caption in YouTube Studio → Community (see Recent activity)";
          }
          return `${r.platform}: ${r.posted ? "posted" : r.message}`;
        })
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
  const recentCount = status?.recentPosts?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ocean-950">Social media</h1>
        <p className="mt-2 text-sm text-ocean-700">
          Connect accounts once, post blogs/guides to social platforms, and let the WhatsApp AI
          agent reply to customer chats like a real team member — prices, packages & booking help.
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
          When a blog or guide is <strong>first published</strong>, post immediately to these
          platforms (one-time per publish).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLATFORMS.map((p) => (
            <PlatformCheckbox
              key={p.id}
              platform={p.id}
              label={p.label}
              checked={status?.automation[p.id] === true}
              disabled={!status || busy === "automation"}
              onChange={(on) => void saveAutomation({ [p.id]: on })}
            />
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50/40 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ocean-950">Scheduled auto-post</h2>
            <p className="mt-1 max-w-2xl text-sm text-ocean-600">
              Build a queue from blogs, guides, videos &amp; reels. Pick how often to post (daily /
              weekly / monthly), set IST time, choose platforms, then start — the next item posts
              automatically (cron ~10:00 AM IST daily on Vercel).
            </p>
          </div>
          {schedule?.enabled ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Running
            </span>
          ) : (
            <span className="rounded-full bg-ocean-100 px-3 py-1 text-xs font-medium text-ocean-600">
              Stopped
            </span>
          )}
        </div>

        {schedule ? (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className="text-ocean-700">Frequency</span>
                <select
                  value={schedule.frequency}
                  onChange={(e) =>
                    setSchedule({
                      ...schedule,
                      frequency: e.target.value as SocialScheduleSettings["frequency"],
                    })
                  }
                  className="mt-1 block w-full rounded border border-ocean-200 px-3 py-2"
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-ocean-700">Time (IST)</span>
                <input
                  type="time"
                  value={schedule.timeIst}
                  onChange={(e) => setSchedule({ ...schedule, timeIst: e.target.value })}
                  className="mt-1 block w-full rounded border border-ocean-200 px-3 py-2"
                />
              </label>
              {schedule.frequency === "weekly" ? (
                <label className="text-sm">
                  <span className="text-ocean-700">Day of week</span>
                  <select
                    value={schedule.dayOfWeek}
                    onChange={(e) =>
                      setSchedule({ ...schedule, dayOfWeek: Number(e.target.value) })
                    }
                    className="mt-1 block w-full rounded border border-ocean-200 px-3 py-2"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </label>
              ) : null}
              {schedule.frequency === "monthly" ? (
                <label className="text-sm">
                  <span className="text-ocean-700">Day of month</span>
                  <select
                    value={schedule.dayOfMonth}
                    onChange={(e) =>
                      setSchedule({ ...schedule, dayOfMonth: Number(e.target.value) })
                    }
                    className="mt-1 block w-full rounded border border-ocean-200 px-3 py-2"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-ocean-500">
              Next run: {scheduleLabels.nextRunAtLabel || "—"} · Last run:{" "}
              {scheduleLabels.lastRunAtLabel || "—"}
              {schedule.lastRunSummary ? ` · ${schedule.lastRunSummary}` : ""}
            </p>

            <h3 className="mt-6 text-sm font-semibold text-ocean-900">Platforms for schedule</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {PLATFORMS.map((p) => (
                <PlatformCheckbox
                  key={`sched-${p.id}`}
                  platform={p.id}
                  label={p.label}
                  checked={schedule.platforms[p.id] === true}
                  disabled={busy === "schedule"}
                  onChange={(on) =>
                    setSchedule({
                      ...schedule,
                      platforms: { ...schedule.platforms, [p.id]: on },
                    })
                  }
                />
              ))}
            </div>

            <h3 className="mt-6 text-sm font-semibold text-ocean-900">Post queue</h3>
            <p className="mt-1 text-xs text-ocean-500">
              Items post in order, then loop back to the start. One item per scheduled run.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <select
                value={queueAddType}
                onChange={(e) => {
                  setQueueAddType(e.target.value as PostContentType);
                  setQueueAddRef("");
                }}
                className="rounded border border-ocean-200 px-3 py-2 text-sm"
              >
                <option value="blog">Blog</option>
                <option value="guide">Guide</option>
                <option value="video">Video</option>
                <option value="reel">Reel</option>
              </select>
              <select
                value={queueAddRef}
                onChange={(e) => setQueueAddRef(e.target.value)}
                className="min-w-[220px] rounded border border-ocean-200 px-3 py-2 text-sm"
              >
                <option value="">Select to add…</option>
                {queueAddOptions().map((o) => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => addToQueue()}
                className="rounded-lg border border-ocean-300 px-4 py-2 text-sm font-medium text-ocean-800 hover:bg-ocean-50"
              >
                Add to queue
              </button>
            </div>

            {queueDraft.length > 0 ? (
              <ol className="mt-4 space-y-2">
                {queueDraft
                  .sort((a, b) => a.order - b.order)
                  .map((item, idx) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-ocean-100 bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs text-ocean-400">{idx + 1}.</span>
                      <span className="rounded bg-ocean-100 px-2 py-0.5 text-xs text-ocean-700">
                        {item.contentType}
                      </span>
                      <span className="flex-1 font-medium text-ocean-900">{item.title}</span>
                      {item.postCount > 0 ? (
                        <span className="text-xs text-ocean-500">posted {item.postCount}×</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => moveQueueItem(item.id, -1)}
                        className="rounded border border-ocean-200 px-2 py-0.5 text-xs"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQueueItem(item.id, 1)}
                        className="rounded border border-ocean-200 px-2 py-0.5 text-xs"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromQueue(item.id)}
                        className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-ocean-500">Queue is empty — add blogs, guides, videos or reels.</p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy != null || queueDraft.length === 0}
                onClick={() => void saveQueueAndSettings(true)}
                className="rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
              >
                {busy === "schedule" ? "Saving…" : "Save & start schedule"}
              </button>
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void saveQueueAndSettings(false)}
                className="rounded-lg border border-ocean-300 px-5 py-2.5 text-sm font-medium text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
              >
                Save & stop
              </button>
              <button
                type="button"
                disabled={busy != null || queueDraft.length === 0}
                onClick={() => void runScheduleNow()}
                className="rounded-lg border border-cyan-300 px-5 py-2.5 text-sm font-medium text-cyan-900 hover:bg-cyan-50 disabled:opacity-50"
              >
                {busy === "schedule-run" ? "Posting…" : "Run next item now"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-ocean-500">Loading schedule…</p>
        )}
      </section>

      <div className="space-y-6">
        <GoogleBusinessSection
          onMessage={setMsg}
          hideAutoPostToggle
          titleIcon={<SocialPlatformIcon platform="googleBusiness" size={22} />}
        />

        <AdminCollapseSection
          title="Facebook Page & Instagram"
          icon={
            <span className="flex items-center gap-1">
              <SocialPlatformIcon platform="facebook" size={22} />
              <SocialPlatformIcon platform="instagram" size={20} />
            </span>
          }
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
          icon={<SocialPlatformIcon platform="youtube" size={22} />}
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

        <AdminCollapseSection
          title="WhatsApp AI agent"
          icon={<SocialPlatformIcon platform="whatsapp" size={22} />}
          hint={
            waStatus?.settings.enabled
              ? "Auto-reply ON — answers enquiries & guides booking"
              : waStatus?.configured
                ? "Configured — turn on auto-reply below"
                : "Not configured"
          }
          defaultOpen={false}
        >
          <p className="text-sm text-ocean-700">
            When customers message your WhatsApp Business number, the AI replies automatically
            with real prices from your catalog, answers scuba questions, collects date/people, and
            sends your <strong>/booking</strong> link — like a human travel desk in Baga.
          </p>

          <ul className="mt-4 space-y-1 text-sm text-ocean-800">
            <li>
              Cloud API:{" "}
              {waStatus?.configured ? (
                <span className="font-semibold text-green-700">Configured</span>
              ) : (
                <span className="text-amber-700">Missing env vars</span>
              )}
            </li>
            <li>
              OpenAI:{" "}
              {waStatus?.openAiSet ? (
                <span className="text-green-700">Ready</span>
              ) : (
                <span className="text-amber-700">Add OPENAI_API_KEY</span>
              )}
            </li>
            <li>
              Auto-reply:{" "}
              {waStatus?.settings.enabled ? (
                <span className="font-semibold text-green-700">Enabled</span>
              ) : (
                <span className="text-ocean-500">Disabled</span>
              )}
            </li>
          </ul>

          {waStatus?.webhookUrl ? (
            <p className="mt-3 rounded-lg border border-ocean-100 bg-ocean-50 px-3 py-2 text-xs text-ocean-700">
              <strong>Meta webhook URL</strong> (WhatsApp → Configuration → Webhook):<br />
              <code className="break-all">{waStatus.webhookUrl}</code>
              <br />
              Verify token: <code>META_WHATSAPP_VERIFY_TOKEN</code> in Vercel
            </p>
          ) : null}

          {!waStatus?.configured ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Set in Vercel: <code className="text-xs">META_WHATSAPP_TOKEN</code>,{" "}
              <code className="text-xs">META_WHATSAPP_PHONE_NUMBER_ID</code>,{" "}
              <code className="text-xs">META_WHATSAPP_VERIFY_TOKEN</code>
            </p>
          ) : null}

          <label className="mt-5 flex items-center gap-3 text-sm font-medium text-ocean-900">
            <input
              type="checkbox"
              checked={waStatus?.settings.enabled === true}
              disabled={!waStatus?.configured || busy === "wa-settings"}
              onChange={(e) => void saveWhatsAppSettings({ enabled: e.target.checked })}
            />
            Enable WhatsApp auto-reply (human-style AI)
          </label>

          <label className="mt-4 block text-sm">
            <span className="text-ocean-700">Custom intro (optional)</span>
            <textarea
              value={waIntro}
              onChange={(e) => setWaIntro(e.target.value)}
              rows={2}
              placeholder="e.g. Hi, I'm Priya from Book Scuba Goa Baga office..."
              className="mt-1 block w-full rounded-lg border border-ocean-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void saveWhatsAppSettings({ businessIntro: waIntro })}
            className="mt-2 rounded-lg border border-ocean-300 px-4 py-2 text-sm font-medium text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
          >
            Save intro
          </button>

          <p className="mt-4 text-xs text-ocean-500">
            If a customer asks for a human, auto-reply pauses and your team can reply manually in
            WhatsApp Business app. View chats in{" "}
            <a href="/admin/chat-logs" className="text-cyan-700 underline">
              Chat logs
            </a>{" "}
            and{" "}
            <a href="/admin/recovery-agent" className="text-cyan-700 underline">
              Recovery agent
            </a>
            . For the business phone (without Meta webhook), use the Android app in{" "}
            <code className="text-xs">android/whatsapp-auto-reply</code> — separate from Cloud API
            settings above.
          </p>
        </AdminCollapseSection>
      </div>

      <section className="mt-10 rounded-xl border border-ocean-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ocean-950">Post now</h2>
        <p className="mt-1 text-sm text-ocean-600">
          Share a blog, guide, gallery video, or reel from your website. Captions include live
          prices, Baga/Goa location, phone &amp; booking link. Videos post natively to Facebook
          &amp; Instagram (reels use Instagram Reels).
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="text-ocean-700">Content type</span>
            <select
              value={postContentType}
              onChange={(e) => {
                const next = e.target.value as PostContentType;
                setPostContentType(next);
                setPostSlug("");
                if (next === "reel" || next === "video") {
                  setPostPlatforms((prev) => {
                    const platforms = new Set(prev);
                    platforms.add("instagram");
                    platforms.add("facebook");
                    return platforms;
                  });
                }
              }}
              className="mt-1 block rounded border border-ocean-200 px-3 py-2"
            >
              <option value="blog">Blog post</option>
              <option value="guide">Guide page</option>
              <option value="video">Gallery video</option>
              <option value="reel">Gallery reel</option>
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
              {postContentType === "blog"
                ? publishedBlogs.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.title}</option>
                  ))
                : null}
              {postContentType === "guide"
                ? publishedGuides.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.headline}</option>
                  ))
                : null}
              {postContentType === "video"
                ? galleryVideos.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))
                : null}
              {postContentType === "reel"
                ? galleryReels.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))
                : null}
            </select>
          </label>
        </div>
        {(postContentType === "video" || postContentType === "reel") &&
        postMediaOptions.length === 0 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No {postContentType === "reel" ? "reels" : "videos"} in gallery yet. Add them in{" "}
            <a href="/admin/gallery" className="font-medium text-cyan-800 underline">
              Gallery admin
            </a>{" "}
            (type: Video, category: {postContentType === "reel" ? "Reels" : "Customer videos"}).
          </p>
        ) : null}
        {(postContentType === "video" || postContentType === "reel") &&
        postMediaOptions.length > 0 ? (
          <p className="mt-3 text-xs text-ocean-500">
            Video must be a public HTTPS MP4 URL (Firebase Storage works). Instagram reels may take
            1–2 minutes to process after you click Post.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <PlatformCheckbox
              key={p.id}
              platform={p.id}
              label={socialPlatformLabel(p.id)}
              checked={postPlatforms.has(p.id)}
              onChange={() => togglePostPlatform(p.id)}
            />
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

      <AdminCollapseSection
        className="mt-10"
        title="Recent activity"
        hint={
          recentCount > 0
            ? `${recentCount} successful post${recentCount === 1 ? "" : "s"} — click to expand`
            : "No successful posts yet"
        }
        defaultOpen={false}
      >
        <p className="text-sm text-ocean-600">
          Only content that was successfully published to a connected platform.
        </p>
        {recentCount > 0 ? (
          <ul className="mt-3 space-y-2">
            {status!.recentPosts.map((row, i) => (
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {(row.results ?? [])
                    .filter((r) => r.posted)
                    .map((r) => (
                      <span
                        key={r.platform}
                        className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-900"
                      >
                        <SocialPlatformIcon platform={r.platform} size={16} />
                        {socialPlatformLabel(r.platform)}
                      </span>
                    ))}
                </div>
                {row.createdAt ? (
                  <div className="mt-2 text-xs text-ocean-400">
                    {new Date(row.createdAt).toLocaleString("en-IN")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ocean-500">
            Post a blog, guide, video, or reel to Facebook, Google Business, or Instagram to see it
            here.
          </p>
        )}
      </AdminCollapseSection>
    </div>
  );
}
