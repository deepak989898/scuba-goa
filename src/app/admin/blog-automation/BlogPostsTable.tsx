"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { BlogPostFirestore } from "@/lib/blog-firestore";
import { isBlogScheduled } from "@/lib/blog-firestore";
import { formatUtcInIst } from "@/lib/blog-automation/schedule-ist";
import { getContentTrafficForSlug } from "@/lib/analytics-content-traffic";
import { BlogPostEditorPanel } from "./BlogPostEditorPanel";

type BlogTraffic = { views: number; visitors: number };

export type ServiceFilterOption = {
  slug: string;
  title: string;
  blogCount: number;
};

type Props = {
  posts: BlogPostFirestore[];
  sortedPosts: BlogPostFirestore[];
  publishSlots: string[];
  blogTrafficBySlug: Record<string, BlogTraffic>;
  blogIndexTraffic: BlogTraffic;
  trafficLoading: boolean;
  editing: BlogPostFirestore | null;
  busy: string | null;
  services?: ServiceFilterOption[];
  serviceFilter?: string;
  onServiceFilterChange?: (slug: string) => void;
  onEdit: (post: BlogPostFirestore) => void;
  onCancelEdit: () => void;
  onChangeEditing: (post: BlogPostFirestore) => void;
  onSave: (opts?: { publishNow?: boolean }) => void;
  onPublishNow: (slug: string) => void;
  onUnpublish: (slug: string) => void;
  onDelete: (slug: string) => void;
  onBulkAction: (
    action: "publish" | "unpublish" | "delete",
    slugs: string[],
  ) => Promise<boolean>;
  onUploadImage: (file: File | null) => void;
  onGenerateAiImage: () => void;
  /** Estimated 0–100 while AI image is generating; null when idle. */
  aiImageProgress?: number | null;
  onRefreshTraffic?: () => void;
  trafficRefreshing?: boolean;
};

function viewCountForPost(
  p: BlogPostFirestore,
  bySlug: Record<string, BlogTraffic>,
): number {
  const t = getContentTrafficForSlug(bySlug, p.slug);
  return Math.max(t?.views ?? 0, p.viewCount ?? 0);
}

function statusBadge(p: BlogPostFirestore) {
  if (p.published) {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        Live
      </span>
    );
  }
  if (isBlogScheduled(p)) {
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
        Scheduled
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
      Draft
    </span>
  );
}

export function BlogPostsTable({
  posts,
  sortedPosts,
  publishSlots,
  blogTrafficBySlug,
  blogIndexTraffic,
  trafficLoading,
  editing,
  busy,
  services = [],
  serviceFilter = "",
  onServiceFilterChange,
  onEdit,
  onCancelEdit,
  onChangeEditing,
  onSave,
  onPublishNow,
  onUnpublish,
  onDelete,
  onBulkAction,
  onUploadImage,
  onGenerateAiImage,
  aiImageProgress = null,
  onRefreshTraffic,
  trafficRefreshing,
}: Props) {
  const scheduledCount = posts.filter((p) => isBlogScheduled(p)).length;
  const liveCount = posts.filter((p) => p.published).length;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const serviceTitleBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of services) m.set(s.slug, s.title);
    return m;
  }, [services]);

  const unassignedCount = useMemo(
    () => posts.filter((p) => !String(p.serviceSlug || "").trim()).length,
    [posts],
  );

  const visibleSlugs = useMemo(
    () => sortedPosts.map((p) => p.slug),
    [sortedPosts],
  );
  const allVisibleSelected =
    visibleSlugs.length > 0 && visibleSlugs.every((s) => selected.has(s));
  const someVisibleSelected =
    visibleSlugs.some((s) => selected.has(s)) && !allVisibleSelected;

  useEffect(() => {
    // Drop selections for posts that disappeared after refresh/delete.
    setSelected((prev) => {
      const next = new Set<string>();
      const known = new Set(posts.map((p) => p.slug));
      for (const slug of prev) {
        if (known.has(slug)) next.add(slug);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [posts]);

  useEffect(() => {
    if (!zoomedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [zoomedImage]);

  function toggleSlug(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const slug of visibleSlugs) next.delete(slug);
      } else {
        for (const slug of visibleSlugs) next.add(slug);
      }
      return next;
    });
  }

  function runBulk(action: "publish" | "unpublish" | "delete") {
    const slugs = [...selected];
    if (slugs.length === 0) return;
    void (async () => {
      const done = await onBulkAction(action, slugs);
      if (done) setSelected(new Set());
    })();
  }

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm">
      <div className="border-b border-ocean-100 px-3 py-4">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          All blogs ({sortedPosts.length}
          {serviceFilter ? ` of ${posts.length}` : ` · ${posts.length} total`})
        </h2>
        <p className="mt-1 text-sm text-ocean-600">
          {liveCount} live · {scheduledCount} scheduled · review and edit before
          auto-publish. Blog index:{" "}
          {trafficLoading
            ? "…"
            : `${blogIndexTraffic.views.toLocaleString("en-IN")} views · ${blogIndexTraffic.visitors.toLocaleString("en-IN")} visitors`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onServiceFilterChange ? (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-ocean-800">
              <span className="whitespace-nowrap">Service</span>
              <select
                value={serviceFilter}
                onChange={(e) => onServiceFilterChange(e.target.value)}
                className="max-w-[16rem] rounded-lg border border-ocean-200 bg-white px-2 py-1.5 text-xs font-medium text-ocean-900"
              >
                <option value="">All services</option>
                <option value="__none__">
                  Unassigned ({unassignedCount})
                </option>
                {services.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.title} ({s.blogCount})
                    {s.blogCount === 0 ? " · low" : s.blogCount < 3 ? " · few" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {onRefreshTraffic ? (
            <button
              type="button"
              disabled={trafficLoading || trafficRefreshing}
              onClick={onRefreshTraffic}
              className="rounded-full border border-ocean-300 px-3 py-1 text-xs font-semibold text-ocean-800 disabled:opacity-50"
            >
              {trafficLoading || trafficRefreshing ? "Refreshing…" : "Refresh view counts"}
            </button>
          ) : null}
        </div>
        {selected.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5">
            <span className="text-xs font-semibold text-cyan-950 sm:text-sm">
              {selected.size} selected
            </span>
            <button
              type="button"
              disabled={busy === "bulk"}
              onClick={() => runBulk("publish")}
              className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "bulk" ? "Working…" : "Publish"}
            </button>
            <button
              type="button"
              disabled={busy === "bulk"}
              onClick={() => runBulk("unpublish")}
              className="rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 disabled:opacity-50"
            >
              Unpublish
            </button>
            <button
              type="button"
              disabled={busy === "bulk"}
              onClick={() => runBulk("delete")}
              className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              disabled={busy === "bulk"}
              onClick={() => setSelected(new Set())}
              className="rounded-full border border-ocean-200 px-3 py-1 text-xs font-semibold text-ocean-700 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-ocean-500">
            Select blogs with checkboxes to publish, unpublish, or delete together.
          </p>
        )}
      </div>
      {posts.length === 0 ? (
        <p className="p-3 text-sm text-ocean-500">No Firestore blogs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 text-ocean-800">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all blogs"
                    className="h-4 w-4 accent-cyan-700"
                  />
                </th>
                <th className="p-3">Image</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Title</th>
                <th className="p-3">Service</th>
                <th className="p-3">Status</th>
                <th className="p-3">Scheduled (IST)</th>
                <th className="p-3">Published (IST)</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((p) => (
                <Fragment key={p.slug}>
                  <tr
                    className={`border-b border-ocean-100 ${
                      selected.has(p.slug) ? "bg-cyan-50/60" : ""
                    }`}
                  >
                    <td className="p-3 align-top">
                      <input
                        type="checkbox"
                        checked={selected.has(p.slug)}
                        onChange={() => toggleSlug(p.slug)}
                        aria-label={`Select ${p.title}`}
                        className="h-4 w-4 accent-cyan-700"
                      />
                    </td>
                    <td className="p-3 align-top">
                      {p.featuredImageUrl || p.ogImageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              src: p.featuredImageUrl || p.ogImageUrl,
                              alt: p.featuredImageAlt || p.title,
                            })
                          }
                          className="group relative block h-14 w-20 overflow-hidden rounded-lg border border-ocean-200 bg-ocean-50 shadow-sm transition hover:scale-105 hover:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                          aria-label={`Zoom image for ${p.title}`}
                          title="Click to zoom"
                        >
                          <CmsRemoteImage
                            src={p.featuredImageUrl || p.ogImageUrl}
                            alt={p.featuredImageAlt || p.title}
                            fill
                            className="object-cover transition group-hover:brightness-90"
                            sizes="80px"
                            loading="lazy"
                          />
                          <span
                            aria-hidden
                            className="absolute bottom-1 right-1 rounded bg-slate-950/75 px-1 text-[10px] text-white"
                          >
                            ⤢
                          </span>
                        </button>
                      ) : (
                        <span className="flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-ocean-200 bg-ocean-50 text-[10px] text-ocean-500">
                          No image
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top font-mono text-xs">{p.slug}</td>
                    <td className="max-w-[14rem] p-3 align-top text-ocean-900">
                      {p.title}
                    </td>
                    <td className="max-w-[9rem] p-3 align-top text-xs text-ocean-700">
                      {p.serviceSlug ? (
                        <span
                          className="line-clamp-2"
                          title={p.serviceSlug}
                        >
                          {serviceTitleBySlug.get(p.serviceSlug) ||
                            p.serviceSlug}
                        </span>
                      ) : (
                        <span className="text-orange-700">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 align-top">{statusBadge(p)}</td>
                    <td className="p-3 align-top text-xs text-ocean-700">
                      {isBlogScheduled(p) ? (
                        <>
                          <span className="font-medium">
                            {formatUtcInIst(p.scheduledPublishAt)}
                          </span>
                          {p.publishSlotIst ? (
                            <span className="mt-0.5 block text-ocean-500">
                              Slot {p.publishSlotIst} IST
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 align-top text-xs text-ocean-700">
                      {p.publishedAt
                        ? formatUtcInIst(p.publishedAt, "long")
                        : "—"}
                    </td>
                    <td className="p-3 align-top text-right tabular-nums font-semibold text-ocean-900">
                      {p.published
                        ? trafficLoading
                          ? "…"
                          : viewCountForPost(p, blogTrafficBySlug).toLocaleString(
                              "en-IN",
                            )
                        : "—"}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        {p.published ? (
                          <Link
                            href={`/blog/${p.slug}`}
                            target="_blank"
                            className="text-ocean-700 underline"
                          >
                            View
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="text-ocean-800 hover:underline"
                          onClick={() => onEdit({ ...p })}
                        >
                          Edit
                        </button>
                        {p.published ? (
                          <button
                            type="button"
                            className="text-amber-700 hover:underline"
                            disabled={busy === `post-${p.slug}` || busy === "bulk"}
                            onClick={() => onUnpublish(p.slug)}
                          >
                            Unpublish
                          </button>
                        ) : isBlogScheduled(p) ? (
                          <button
                            type="button"
                            className="font-semibold text-emerald-800 hover:underline"
                            disabled={busy === `save-${p.slug}` || busy === "bulk"}
                            onClick={() => onPublishNow(p.slug)}
                          >
                            Publish now
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          disabled={busy === `del-${p.slug}` || busy === "bulk"}
                          onClick={() => onDelete(p.slug)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing?.slug === p.slug ? (
                    <tr
                      id={`blog-editor-${p.slug}`}
                      className="bg-ocean-50/50"
                    >
                      <td colSpan={10} className="p-4">
                        <BlogPostEditorPanel
                          editing={editing}
                          busy={busy}
                          publishSlots={publishSlots}
                          aiImageProgress={aiImageProgress}
                          services={services}
                          onChangeEditing={onChangeEditing}
                          onSave={onSave}
                          onCancelEdit={onCancelEdit}
                          onUploadImage={onUploadImage}
                          onGenerateAiImage={onGenerateAiImage}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {zoomedImage ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${zoomedImage.alt}`}
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative h-[min(82vh,850px)] w-full max-w-6xl overflow-hidden rounded-xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CmsRemoteImage
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              fill
              className="object-contain"
              sizes="95vw"
              priority
            />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2.5 bg-gradient-to-b from-black/80 to-transparent p-4 text-white">
              <p className="max-w-3xl text-sm font-semibold sm:text-base">
                {zoomedImage.alt}
              </p>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-slate-950 shadow-lg transition hover:bg-cyan-200"
                aria-label="Close image preview"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
