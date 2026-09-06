"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogPostFirestore } from "@/lib/blog-firestore";
import type { BlogAutomationSettings } from "@/lib/blog-automation/settings";
import { BlogPostsTable } from "@/app/admin/blog-automation/BlogPostsTable";
import { GuidesScheduleTable } from "@/app/admin/blog-automation/GuidesScheduleTable";
import { ContentOverviewBar } from "@/app/admin/blog-automation/ContentOverviewBar";
import { utcIsoToIstDatetimeLocalValue } from "@/lib/blog-automation/schedule-ist";
import { AdminContentSeoNav } from "@/components/admin/AdminContentSeoNav";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";
import type { ContentOverview } from "@/lib/admin-content-overview";
import { getContentTrafficForSlug } from "@/lib/analytics-content-traffic";
import type { SeoPageFirestore } from "@/lib/seo-page-firestore";
import {
  DEFAULT_BULK_SEO_IMPROVE_BATCH,
  MAX_BULK_SEO_IMPROVE_PER_REQUEST,
} from "@/lib/gsc-indexing-agent/blog-ranking-improve-ui";

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
  const [posts, setPosts] = useState<BlogPostFirestore[]>([]);
  const [blogTrafficBySlug, setBlogTrafficBySlug] = useState<
    Record<string, BlogTraffic>
  >({});
  const [blogIndexTraffic, setBlogIndexTraffic] = useState<BlogTraffic>({
    views: 0,
    visitors: 0,
  });
  const [guidePages, setGuidePages] = useState<SeoPageFirestore[]>([]);
  const [guideTrafficBySlug, setGuideTrafficBySlug] = useState<
    Record<string, BlogTraffic>
  >({});
  const [guidesIndexTraffic, setGuidesIndexTraffic] = useState<BlogTraffic>({
    views: 0,
    visitors: 0,
  });
  const [guideTrafficLoading, setGuideTrafficLoading] = useState(false);
  const [guideTrafficRefreshing, setGuideTrafficRefreshing] = useState(false);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficRefreshing, setTrafficRefreshing] = useState(false);
  const [editing, setEditing] = useState<BlogPostFirestore | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [overview, setOverview] = useState<ContentOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("");
  /** Avoid refresh↔posts dependency loop (continuous re-fetch). */
  const postsRef = useRef<BlogPostFirestore[]>([]);
  postsRef.current = posts;
  const blogsLoadedRef = useRef(false);
  const guidesLoadedRef = useRef(false);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [guidesLoaded, setGuidesLoaded] = useState(false);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [guidesLoading, setGuidesLoading] = useState(false);
  /** Estimated % while OpenAI image generation runs (API has no real progress stream). */
  const [aiImageProgress, setAiImageProgress] = useState<number | null>(null);

  /**
   * Cheap traffic load: one aggregated collection read + merge blogPosts.viewCount
   * from memory. Never N×slug precise queries (those burned Firestore quota).
   */
  const loadBlogTraffic = useCallback(
    async (opts?: { silent?: boolean; posts?: BlogPostFirestore[] }) => {
      if (!opts?.silent) setTrafficLoading(true);
      try {
        const data = await adminFetch(
          "/api/admin/blog-traffic?mode=aggregated",
        );
        const bySlug = {
          ...((data.bySlug ?? {}) as Record<string, BlogTraffic>),
        };
        const index = (data.index ?? {
          views: 0,
          visitors: 0,
        }) as BlogTraffic;

        const list = opts?.posts ?? postsRef.current;
        for (const p of list) {
          const vc = Math.max(0, Math.round(Number(p.viewCount) || 0));
          if (vc <= 0) continue;
          const key = p.slug.trim().toLowerCase();
          const cur = bySlug[key] ?? { views: 0, visitors: 0 };
          bySlug[key] = {
            views: Math.max(cur.views, vc),
            visitors: Math.max(cur.visitors, vc > 0 ? 1 : 0),
          };
        }

        setBlogTrafficBySlug(bySlug);
        setBlogIndexTraffic({
          views: Math.max(0, Math.round(Number(index.views) || 0)),
          visitors: Math.max(0, Math.round(Number(index.visitors) || 0)),
        });
      } catch {
        setBlogTrafficBySlug({});
        setBlogIndexTraffic({ views: 0, visitors: 0 });
      } finally {
        // Always clear — silent loads were leaving Views stuck on "…"
        setTrafficLoading(false);
      }
    },
    [],
  );

  const loadGuideTraffic = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setGuideTrafficLoading(true);
    try {
      const data = await adminFetch("/api/admin/guide-traffic");
      setGuideTrafficBySlug(
        (data.bySlug ?? {}) as Record<string, BlogTraffic>,
      );
      setGuidesIndexTraffic({
        views: Math.max(0, Math.round(Number(data.index?.views) || 0)),
        visitors: Math.max(0, Math.round(Number(data.index?.visitors) || 0)),
      });
    } catch {
      setGuideTrafficBySlug({});
      setGuidesIndexTraffic({ views: 0, visitors: 0 });
    } finally {
      setGuideTrafficLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = (await adminFetch(
        "/api/admin/content-overview",
      )) as ContentOverview;
      setOverview(data);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadBlogs = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setBlogsLoading(true);
      try {
        const p = await adminFetch("/api/admin/blog-posts");
        const loadedPosts = (p.posts ?? []) as BlogPostFirestore[];
        setPosts(loadedPosts);
        blogsLoadedRef.current = true;
        setBlogsLoaded(true);
        setEditing((current) => {
          if (!current) return current;
          const match = loadedPosts.find((post) => post.slug === current.slug);
          return match ?? current;
        });
        await loadBlogTraffic({ silent: true, posts: loadedPosts });
        return loadedPosts;
      } finally {
        setBlogsLoading(false);
      }
    },
    [loadBlogTraffic],
  );

  const loadGuides = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setGuidesLoading(true);
      try {
        const guidesRes = await adminFetch("/api/admin/seo-pages").catch(() => ({
          pages: [],
        }));
        setGuidePages((guidesRes.pages ?? []) as SeoPageFirestore[]);
        guidesLoadedRef.current = true;
        setGuidesLoaded(true);
        await loadGuideTraffic({ silent: true });
      } finally {
        setGuidesLoading(false);
      }
    },
    [loadGuideTraffic],
  );

  async function refreshTrafficOnly() {
    setTrafficRefreshing(true);
    try {
      await loadBlogTraffic({ silent: true, posts: postsRef.current });
      setOkMsg("View counts updated (low-read mode).");
    } catch {
      setErr("Could not refresh view counts.");
    } finally {
      setTrafficRefreshing(false);
    }
  }

  async function refreshGuideTrafficOnly() {
    setGuideTrafficRefreshing(true);
    try {
      await loadGuideTraffic({ silent: true });
      setOkMsg("Guide view counts updated.");
    } catch {
      setErr("Could not refresh guide views.");
    } finally {
      setGuideTrafficRefreshing(false);
    }
  }

  /**
   * silent: refresh lists without flipping `loading` (keeps editor mounted /
   * scroll position after image upload or save).
   */
  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    if (!silent) setErr(null);
    try {
      const s = await adminFetch("/api/admin/blog-automation");
      setSettings(s.settings);

      if (blogsLoadedRef.current) {
        await loadBlogs({ silent: true });
      }
      if (guidesLoadedRef.current) {
        await loadGuides({ silent: true });
      }

      if (!silent) {
        await loadOverview();
      }

      if (!silent && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const editSlug = params.get("edit")?.trim();
        if (editSlug) {
          const loadedPosts = blogsLoadedRef.current
            ? postsRef.current
            : await loadBlogs();
          const match = (loadedPosts ?? postsRef.current).find(
            (post) => post.slug === editSlug,
          );
          if (match) {
            setEditing(match);
            setOkMsg(`Editing /blog/${editSlug}`);
          } else {
            setErr(`Blog “${editSlug}” not found in Blog automation list.`);
          }
          params.delete("edit");
          const qs = params.toString();
          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${qs ? `?${qs}` : ""}`,
          );
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadBlogs, loadGuides, loadOverview]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleBlogsSectionOpen(open: boolean) {
    if (open && !blogsLoadedRef.current && !blogsLoading) {
      void loadBlogs();
    }
  }

  function handleGuidesSectionOpen(open: boolean) {
    if (open && !guidesLoadedRef.current && !guidesLoading) {
      void loadGuides();
    }
  }

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const ta = Math.max(
        getContentTrafficForSlug(blogTrafficBySlug, a.slug)?.views ?? 0,
        a.viewCount ?? 0,
      );
      const tb = Math.max(
        getContentTrafficForSlug(blogTrafficBySlug, b.slug)?.views ?? 0,
        b.viewCount ?? 0,
      );
      if (tb !== ta) return tb - ta;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [posts, blogTrafficBySlug]);

  /** Freeze row order while editing so save/publish doesn't reshuffle the open editor. */
  const [frozenEditOrder, setFrozenEditOrder] = useState<string[] | null>(null);

  const displayPosts = useMemo(() => {
    let list: BlogPostFirestore[];
    if (!editing || !frozenEditOrder?.length) {
      list = sortedPosts;
    } else {
      const bySlug = new Map(posts.map((p) => [p.slug, p]));
      const out: BlogPostFirestore[] = [];
      for (const slug of frozenEditOrder) {
        const p = bySlug.get(slug);
        if (p) out.push(p);
      }
      for (const p of posts) {
        if (!frozenEditOrder.includes(p.slug)) out.push(p);
      }
      list = out;
    }
    if (serviceFilter === "__none__") {
      return list.filter((p) => !String(p.serviceSlug || "").trim());
    }
    if (serviceFilter) {
      return list.filter((p) => p.serviceSlug === serviceFilter);
    }
    return list;
  }, [editing, frozenEditOrder, posts, sortedPosts, serviceFilter]);

  const serviceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const key = String(p.serviceSlug || "").trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (overview?.services?.length) {
      return overview.services.map((s) => ({
        ...s,
        blogCount: counts.get(s.slug) ?? s.blogCount,
      }));
    }
    return [...counts.entries()]
      .map(([slug, blogCount]) => ({ slug, title: slug, blogCount }))
      .sort((a, b) => a.blogCount - b.blogCount);
  }, [overview, posts]);

  function beginEdit(post: BlogPostFirestore) {
    setFrozenEditOrder(sortedPosts.map((p) => p.slug));
    setEditing(post);
  }

  function cancelEdit() {
    setEditing(null);
    setFrozenEditOrder(null);
  }

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
      setEditing((e) => {
        if (e?.slug === slug) {
          setFrozenEditOrder(null);
          return null;
        }
        return e;
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveEditedPost(opts?: { publishNow?: boolean }) {
    if (!editing) return;
    const slug = editing.slug;
    const scrollY =
      typeof window !== "undefined" ? window.scrollY : 0;
    setBusy(`save-${slug}`);
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
          ? `Saved & published /blog/${slug} — editor stays open.`
          : `Saved /blog/${slug}`,
      );
      // Stay on the same editor; silent refresh avoids jump-to-top remount
      await refresh({ silent: true });
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      }
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
      setOkMsg(`Published /blog/${slug} — editor stays open.`);
      await refresh({ silent: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function bulkBlogAction(
    action: "publish" | "unpublish" | "delete",
    slugs: string[],
  ): Promise<boolean> {
    if (slugs.length === 0) return false;
    const labels = {
      publish: "publish",
      unpublish: "unpublish",
      delete: "DELETE permanently",
    } as const;
    if (
      !confirm(
        `${labels[action]} ${slugs.length} selected blog${slugs.length === 1 ? "" : "s"}?`,
      )
    ) {
      return false;
    }
    setBusy("bulk");
    setErr(null);
    setOkMsg(null);
    try {
      const data = await adminFetch("/api/admin/blog-posts/bulk", {
        method: "POST",
        body: JSON.stringify({ action, slugs }),
      });
      const okN = Number(data.successCount ?? 0);
      const failN = Number(data.failCount ?? 0);
      const failed =
        (data.failed as { slug: string; error: string }[] | undefined) ?? [];
      if (failN > 0) {
        setErr(
          `${okN} succeeded, ${failN} failed` +
            (failed[0] ? `: ${failed[0].slug} — ${failed[0].error}` : ""),
        );
      }
      setOkMsg(
        failN === 0
          ? `${action === "delete" ? "Deleted" : action === "publish" ? "Published" : "Unpublished"} ${okN} blog${okN === 1 ? "" : "s"}.`
          : `Bulk ${action}: ${okN} ok, ${failN} failed.`,
      );
      if (action === "delete") {
        setEditing((e) => {
          if (e && slugs.includes(e.slug)) {
            setFrozenEditOrder(null);
            return null;
          }
          return e;
        });
      }
      await refresh({ silent: Boolean(editing) });
      return okN > 0;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk action failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function generateBlogSeoImprove(slug: string) {
    setBusy(`seo-${slug}`);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/blog-automation/ranking-update", {
        method: "POST",
        body: JSON.stringify({ action: "generate", slug }),
      });
      const pct = data.improve?.estimatedPct;
      setOkMsg(
        `SEO improved /blog/${slug}${pct != null ? ` (~${pct}% estimated uplift)` : ""}. Title, meta & content updated — images unchanged.`,
      );
      await refresh({ silent: Boolean(editing) });
      await loadOverview();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "SEO improve failed");
    } finally {
      setBusy(null);
    }
  }

  async function bulkGenerateBlogSeoImprove(slugs: string[]): Promise<boolean> {
    if (slugs.length === 0) return false;
    const batchSize = DEFAULT_BULK_SEO_IMPROVE_BATCH;
    if (
      !confirm(
        `Generate SEO improvements for ${slugs.length} blog${slugs.length === 1 ? "" : "s"}? Updates title, meta & content only (no images). Processes ${batchSize} per batch (max ${MAX_BULK_SEO_IMPROVE_PER_REQUEST} per API call).`,
      )
    ) {
      return false;
    }
    setBusy("seo-bulk");
    setErr(null);
    let totalOk = 0;
    let totalFail = 0;
  try {
      for (let i = 0; i < slugs.length; i += batchSize) {
        const batch = slugs.slice(i, i + batchSize);
        setOkMsg(
          `SEO improve: processing ${i + 1}–${i + batch.length} of ${slugs.length}…`,
        );
        const data = await adminFetch(
          "/api/admin/blog-automation/ranking-update",
          {
            method: "POST",
            body: JSON.stringify({
              action: "generateBulk",
              slugs: batch,
              maxJobs: batch.length,
            }),
          },
        );
        totalOk += Number(data.succeeded ?? 0);
        totalFail += Number(data.failed ?? 0);
      }
      setOkMsg(
        `SEO improve bulk complete: ${totalOk} updated · ${totalFail} failed (${slugs.length} selected, ${batchSize}/batch).`,
      );
      await refresh({ silent: Boolean(editing) });
      await loadOverview();
      return totalOk > 0;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk SEO improve failed");
      if (totalOk > 0) {
        setOkMsg(
          `Partial SEO improve: ${totalOk} updated before error · ${totalFail} failed.`,
        );
      }
      return totalOk > 0;
    } finally {
      setBusy(null);
    }
  }

  async function uploadBlogImage(file: File | null) {
    if (!file || !editing) return;
    const scrollY =
      typeof window !== "undefined" ? window.scrollY : 0;
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
      const featuredImageUrl =
        (data.featuredImageUrl as string | undefined) ?? undefined;
      const ogImageUrl =
        (data.ogImageUrl as string | undefined) ?? featuredImageUrl;
      setEditing((e) =>
        e
          ? {
              ...e,
              featuredImageUrl: featuredImageUrl ?? e.featuredImageUrl,
              ogImageUrl: ogImageUrl ?? e.ogImageUrl,
            }
          : e,
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.slug === editing.slug
            ? {
                ...p,
                featuredImageUrl: featuredImageUrl ?? p.featuredImageUrl,
                ogImageUrl: ogImageUrl ?? p.ogImageUrl,
              }
            : p,
        ),
      );
      setOkMsg(
        "Image uploaded. You can keep editing — page stays here.",
      );
      await refresh({ silent: true });
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      }
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
    setAiImageProgress(3);

    // OpenAI does not stream image % — advance an estimate so admin can wait calmly.
    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started;
      // ~45s typical; asymptote toward 92% until the request finishes.
      const estimated = Math.min(
        92,
        Math.round(3 + 89 * (1 - Math.exp(-elapsed / 18000))),
      );
      setAiImageProgress((prev) =>
        prev == null ? estimated : Math.max(prev, estimated),
      );
    }, 400);

    const scrollY =
      typeof window !== "undefined" ? window.scrollY : 0;
    try {
      const data = await adminFetch("/api/admin/blog-image-generate", {
        method: "POST",
        body: JSON.stringify({ slug: editing.slug, title, forceOpenAi: true }),
      });
      window.clearInterval(tick);
      setAiImageProgress(100);
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
        "AI image saved. You can keep editing — page stays here.",
      );
      await refresh({ silent: true });
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      }
      window.setTimeout(() => setAiImageProgress(null), 900);
    } catch (e) {
      window.clearInterval(tick);
      setAiImageProgress(null);
      setErr(e instanceof Error ? e.message : "AI image generation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {aiImageProgress != null ? (
        <div
          className="fixed bottom-5 right-5 z-[200] w-[min(100%-2rem,20rem)] rounded-2xl border border-cyan-200 bg-cyan-800 px-4 py-3 text-white shadow-xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span>
              {aiImageProgress >= 100
                ? "Image ready"
                : "Generating AI image…"}
            </span>
            <span className="tabular-nums">{aiImageProgress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cyan-950/40">
            <div
              className="h-full rounded-full bg-cyan-300 transition-[width] duration-300 ease-out"
              style={{ width: `${aiImageProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-cyan-100">
            {aiImageProgress >= 100
              ? "Saved as WebP with top-left logo"
              : aiImageProgress < 20
                ? "Starting OpenAI…"
                : aiImageProgress < 70
                  ? "Creating image from title — please wait"
                  : aiImageProgress < 92
                    ? "Almost done — compressing & uploading WebP"
                    : "Finalizing on live blog…"}
          </p>
        </div>
      ) : null}

      <AdminContentSeoNav />
      <h1 className="font-display text-lg font-bold text-ocean-900">
        Blog posts & schedule
      </h1>

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
          <div className="mt-3">
            <ContentOverviewBar
              overview={overview}
              loading={overviewLoading}
            />
          </div>

          <AdminCollapseSection
            title="Blog posts"
            hint={
              blogsLoaded
                ? `${posts.length} total — search, edit, schedule & publish`
                : "Collapsed — expand to load all blogs (~1 read per post)"
            }
            defaultOpen={false}
            onOpenChange={handleBlogsSectionOpen}
            badge={
              blogsLoaded ? (
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-cyan-900">
                  {posts.length}
                </span>
              ) : (
                <span className="rounded-full bg-ocean-100 px-2 py-0.5 text-[10px] font-medium text-ocean-600">
                  Load on expand
                </span>
              )
            }
          >
            {blogsLoading ? (
              <p className="text-sm text-ocean-600">Loading blog posts…</p>
            ) : !blogsLoaded ? (
              <p className="text-sm text-ocean-500">
                Expand this section when you need to browse or edit blogs. Keeping it
                collapsed avoids loading ~1,200 Firestore documents on every visit.
              </p>
            ) : (
              <BlogPostsTable
                posts={posts}
                sortedPosts={displayPosts}
                publishSlots={publishSlotOptions}
                blogTrafficBySlug={blogTrafficBySlug}
                blogIndexTraffic={blogIndexTraffic}
                trafficLoading={trafficLoading}
                editing={editing}
                busy={busy}
                blogGscBySlug={overview?.blogGscBySlug ?? {}}
                services={serviceOptions}
                serviceFilter={serviceFilter}
                onServiceFilterChange={setServiceFilter}
                onEdit={beginEdit}
                onCancelEdit={cancelEdit}
                onChangeEditing={setEditing}
                onSave={(opts) => void saveEditedPost(opts)}
                onPublishNow={(slug) => void publishPostNow(slug)}
                onUnpublish={(slug) => void unpublishPost(slug)}
                onDelete={(slug) => void deletePost(slug)}
                onBulkAction={bulkBlogAction}
                onUploadImage={(file) => void uploadBlogImage(file)}
                onGenerateAiImage={() => void generateBlogImageWithAi()}
                aiImageProgress={aiImageProgress}
                onRefreshTraffic={() => void refreshTrafficOnly()}
                trafficRefreshing={trafficRefreshing}
                onGenerateSeoImprove={(slug) => generateBlogSeoImprove(slug)}
                onBulkGenerateSeoImprove={(slugs) =>
                  bulkGenerateBlogSeoImprove(slugs)
                }
              />
            )}
          </AdminCollapseSection>

          <GuidesScheduleTable
            pages={guidePages}
            guideTrafficBySlug={guideTrafficBySlug}
            guidesIndexTraffic={guidesIndexTraffic}
            trafficLoading={guideTrafficLoading}
            guideGscBySlug={overview?.guideGscBySlug ?? {}}
            onRefreshTraffic={() => void refreshGuideTrafficOnly()}
            trafficRefreshing={guideTrafficRefreshing}
            listLoading={guidesLoading}
            listLoaded={guidesLoaded}
            onOpenChange={handleGuidesSectionOpen}
          />
        </>
      )}
    </div>
  );
}
