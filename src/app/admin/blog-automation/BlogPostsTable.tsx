"use client";

import { Fragment } from "react";
import Link from "next/link";
import type { BlogLanguage, BlogPostFirestore } from "@/lib/blog-firestore";

type BlogTraffic = { views: number; visitors: number };

type Props = {
  posts: BlogPostFirestore[];
  sortedPosts: BlogPostFirestore[];
  blogTrafficBySlug: Record<string, BlogTraffic>;
  blogIndexTraffic: BlogTraffic;
  trafficLoading: boolean;
  editing: BlogPostFirestore | null;
  busy: string | null;
  onEdit: (post: BlogPostFirestore) => void;
  onCancelEdit: () => void;
  onChangeEditing: (post: BlogPostFirestore) => void;
  onSave: () => void;
  onUnpublish: (slug: string) => void;
  onDelete: (slug: string) => void;
  onUploadImage: (file: File | null) => void;
};

export function BlogPostsTable({
  posts,
  sortedPosts,
  blogTrafficBySlug,
  blogIndexTraffic,
  trafficLoading,
  editing,
  busy,
  onEdit,
  onCancelEdit,
  onChangeEditing,
  onSave,
  onUnpublish,
  onDelete,
  onUploadImage,
}: Props) {
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm">
      <div className="border-b border-ocean-100 px-6 py-4">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          Published blogs ({posts.length})
        </h2>
        <p className="mt-1 text-sm text-ocean-600">
          Blog index:{" "}
          {trafficLoading
            ? "…"
            : `${blogIndexTraffic.views.toLocaleString("en-IN")} views · ${blogIndexTraffic.visitors.toLocaleString("en-IN")} visitors`}
        </p>
      </div>
      {posts.length === 0 ? (
        <p className="p-6 text-sm text-ocean-500">No Firestore blogs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 text-ocean-800">
              <tr>
                <th className="p-3">Slug</th>
                <th className="p-3">Title</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3 text-right">Visitors</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((p) => (
                <Fragment key={p.slug}>
                  <tr className="border-b border-ocean-100">
                    <td className="p-3 align-top font-mono text-xs">{p.slug}</td>
                    <td className="p-3 align-top text-ocean-900">{p.title}</td>
                    <td className="p-3 align-top text-right tabular-nums">
                      {trafficLoading
                        ? "—"
                        : (blogTrafficBySlug[p.slug]?.views ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 align-top text-right tabular-nums">
                      {trafficLoading
                        ? "—"
                        : (blogTrafficBySlug[p.slug]?.visitors ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 align-top">
                      {p.published ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Live
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          Draft
                        </span>
                      )}
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
                      <td colSpan={6} className="p-4">
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
                              Featured image (WebP + logo on left, bookscubagoa.com on right)
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
                          <label className="flex items-center gap-2 text-sm text-ocean-800">
                            <input
                              type="checkbox"
                              checked={editing.published}
                              onChange={(e) =>
                                onChangeEditing({ ...editing, published: e.target.checked })
                              }
                            />
                            Published (live on site)
                          </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={busy === `save-${editing.slug}`}
                            onClick={onSave}
                            className="rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {busy === `save-${editing.slug}` ? "Saving…" : "Save changes"}
                          </button>
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
    </section>
  );
}
