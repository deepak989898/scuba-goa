"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { BlogLanguage, BlogPostFirestore } from "@/lib/blog-firestore";
import { isBlogScheduled } from "@/lib/blog-firestore";
import {
  formatUtcInIst,
  utcIsoToIstDatetimeLocalValue,
} from "@/lib/blog-automation/schedule-ist";

type BlogTraffic = { views: number; visitors: number };

type Props = {
  posts: BlogPostFirestore[];
  sortedPosts: BlogPostFirestore[];
  publishSlots: string[];
  blogTrafficBySlug: Record<string, BlogTraffic>;
  blogIndexTraffic: BlogTraffic;
  trafficLoading: boolean;
  editing: BlogPostFirestore | null;
  busy: string | null;
  onEdit: (post: BlogPostFirestore) => void;
  onCancelEdit: () => void;
  onChangeEditing: (post: BlogPostFirestore) => void;
  onSave: (opts?: { publishNow?: boolean }) => void;
  onPublishNow: (slug: string) => void;
  onUnpublish: (slug: string) => void;
  onDelete: (slug: string) => void;
  onUploadImage: (file: File | null) => void;
  onRefreshTraffic?: () => void;
  trafficRefreshing?: boolean;
};

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
  onEdit,
  onCancelEdit,
  onChangeEditing,
  onSave,
  onPublishNow,
  onUnpublish,
  onDelete,
  onUploadImage,
  onRefreshTraffic,
  trafficRefreshing,
}: Props) {
  const scheduledCount = posts.filter((p) => isBlogScheduled(p)).length;
  const liveCount = posts.filter((p) => p.published).length;
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  useEffect(() => {
    if (!zoomedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [zoomedImage]);

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm">
      <div className="border-b border-ocean-100 px-6 py-4">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          All blogs ({posts.length})
        </h2>
        <p className="mt-1 text-sm text-ocean-600">
          {liveCount} live · {scheduledCount} scheduled · review and edit before
          auto-publish. Blog index:{" "}
          {trafficLoading
            ? "…"
            : `${blogIndexTraffic.views.toLocaleString("en-IN")} views · ${blogIndexTraffic.visitors.toLocaleString("en-IN")} visitors`}
        </p>
        {onRefreshTraffic ? (
          <button
            type="button"
            disabled={trafficLoading || trafficRefreshing}
            onClick={onRefreshTraffic}
            className="mt-2 rounded-full border border-ocean-300 px-3 py-1 text-xs font-semibold text-ocean-800 disabled:opacity-50"
          >
            {trafficLoading || trafficRefreshing ? "Refreshing…" : "Refresh view counts"}
          </button>
        ) : null}
      </div>
      {posts.length === 0 ? (
        <p className="p-6 text-sm text-ocean-500">No Firestore blogs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 text-ocean-800">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Title</th>
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
                  <tr className="border-b border-ocean-100">
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
                    <td className="p-3 align-top text-right tabular-nums">
                      {p.published
                        ? trafficLoading
                          ? "—"
                          : (blogTrafficBySlug[p.slug]?.views ?? 0).toLocaleString(
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
                            disabled={busy === `post-${p.slug}`}
                            onClick={() => onUnpublish(p.slug)}
                          >
                            Unpublish
                          </button>
                        ) : isBlogScheduled(p) ? (
                          <button
                            type="button"
                            className="font-semibold text-emerald-800 hover:underline"
                            disabled={busy === `save-${p.slug}`}
                            onClick={() => onPublishNow(p.slug)}
                          >
                            Publish now
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          disabled={busy === `del-${p.slug}`}
                          onClick={() => onDelete(p.slug)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing?.slug === p.slug ? (
                    <tr className="bg-ocean-50/50">
                      <td colSpan={8} className="p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-700">
                          Edit blog post
                        </p>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <label className="block text-sm text-ocean-800">
                            Title
                            <input
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              value={editing.title}
                              onChange={(e) =>
                                onChangeEditing({ ...editing, title: e.target.value })
                              }
                            />
                          </label>
                          <label className="block text-sm text-ocean-800">
                            Language
                            <select
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              value={editing.language}
                              onChange={(e) =>
                                onChangeEditing({
                                  ...editing,
                                  language: e.target.value as BlogLanguage,
                                })
                              }
                            >
                              <option value="hinglish">Hinglish</option>
                              <option value="en">English</option>
                              <option value="hi">Hindi</option>
                            </select>
                          </label>
                          <label className="block text-sm text-ocean-800">
                            IST slot
                            <select
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              value={editing.publishSlotIst ?? ""}
                              onChange={(e) =>
                                onChangeEditing({
                                  ...editing,
                                  publishSlotIst: e.target.value,
                                })
                              }
                            >
                              <option value="">—</option>
                              {publishSlots.map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot} IST
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm text-ocean-800">
                            Schedule date (IST)
                            <input
                              type="date"
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              value={editing.scheduleDateIst ?? editing.date}
                              onChange={(e) =>
                                onChangeEditing({
                                  ...editing,
                                  scheduleDateIst: e.target.value,
                                  date: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="block text-sm text-ocean-800 lg:col-span-2">
                            Auto-publish at (IST)
                            <input
                              type="datetime-local"
                              className="mt-1 w-full max-w-md rounded-lg border border-ocean-200 px-3 py-2"
                              value={utcIsoToIstDatetimeLocalValue(
                                editing.scheduledPublishAt,
                              )}
                              onChange={(e) => {
                                const v = e.target.value;
                                onChangeEditing({
                                  ...editing,
                                  scheduledPublishAt: v
                                    ? new Date(`${v}:00+05:30`).toISOString()
                                    : undefined,
                                });
                              }}
                            />
                          </label>
                          <label className="block text-sm text-ocean-800 lg:col-span-2">
                            Meta title
                            <input
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              value={editing.metaTitle}
                              onChange={(e) =>
                                onChangeEditing({ ...editing, metaTitle: e.target.value })
                              }
                            />
                          </label>
                          <label className="block text-sm text-ocean-800 lg:col-span-2">
                            Meta description
                            <textarea
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              rows={2}
                              value={editing.metaDescription}
                              onChange={(e) =>
                                onChangeEditing({
                                  ...editing,
                                  metaDescription: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="block text-sm text-ocean-800 lg:col-span-2">
                            Excerpt
                            <textarea
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              rows={2}
                              value={editing.excerpt}
                              onChange={(e) =>
                                onChangeEditing({ ...editing, excerpt: e.target.value })
                              }
                            />
                          </label>
                          <label className="block text-sm text-ocean-800 lg:col-span-2">
                            Keywords (comma separated)
                            <input
                              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                              value={editing.keywords.join(", ")}
                              onChange={(e) =>
                                onChangeEditing({
                                  ...editing,
                                  keywords: e.target.value
                                    .split(/,\s*/)
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </label>
                          <label className="block text-sm text-ocean-800 lg:col-span-2">
                            Content (markdown)
                            <textarea
                              className="mt-1 min-h-[200px] w-full rounded-lg border border-ocean-200 px-3 py-2 font-mono text-sm"
                              value={editing.content}
                              onChange={(e) =>
                                onChangeEditing({ ...editing, content: e.target.value })
                              }
                            />
                          </label>
                          <div className="lg:col-span-2">
                            <p className="text-sm font-medium text-ocean-800">
                              Featured image (WebP + logo bar)
                            </p>
                            {editing.featuredImageUrl ? (
                              <a
                                href={editing.featuredImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-xs text-ocean-600 underline"
                              >
                                View current image
                              </a>
                            ) : null}
                            <input
                              type="file"
                              accept="image/*"
                              className="mt-2 block w-full text-sm"
                              disabled={busy === `img-${editing.slug}`}
                              onChange={(e) => onUploadImage(e.target.files?.[0] ?? null)}
                            />
                          </div>
                          {editing.publishedAt ? (
                            <p className="text-sm text-ocean-600 lg:col-span-2">
                              Published at (IST):{" "}
                              <strong>{formatUtcInIst(editing.publishedAt, "long")}</strong>
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={busy === `save-${editing.slug}`}
                            onClick={() => onSave()}
                            className="rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {busy === `save-${editing.slug}` ? "Saving…" : "Save changes"}
                          </button>
                          {!editing.published ? (
                            <button
                              type="button"
                              disabled={busy === `save-${editing.slug}`}
                              onClick={() => onSave({ publishNow: true })}
                              className="rounded-full border border-emerald-600 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-50"
                            >
                              Save & publish now
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-full border border-ocean-300 px-5 py-2 text-sm font-semibold text-ocean-800"
                            onClick={onCancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
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
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${zoomedImage.alt}`}
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative h-[min(82vh,850px)] w-full max-w-6xl overflow-hidden rounded-2xl bg-black shadow-2xl"
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
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent p-4 text-white">
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
