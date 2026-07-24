"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";
import type { StaticBlogListItem } from "@/lib/blog-automation/static-code-blogs";
import type { BlogPostFirestore } from "@/lib/blog-firestore";

type Props = {
  adminFetch: (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;
  /** Open this post in the blog editor (after import if needed). */
  onEdit: (post: BlogPostFirestore) => void;
  busy: string | null;
  setBusy: (v: string | null) => void;
  setErr: (v: string | null) => void;
  setOkMsg: (v: string | null) => void;
  /** Refresh Firestore posts list after import. */
  onImported: () => Promise<void>;
};

export function StaticCodeBlogsPanel({
  adminFetch,
  onEdit,
  busy,
  setBusy,
  setErr,
  setOkMsg,
  onImported,
}: Props) {
  const [posts, setPosts] = useState<StaticBlogListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/api/admin/static-blogs");
      setPosts((data.posts as StaticBlogListItem[]) ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load static blogs");
    } finally {
      setLoading(false);
    }
  }, [adminFetch, setErr]);

  useEffect(() => {
    void load();
  }, [load]);

  async function editStatic(slug: string) {
    setBusy(`static-edit-${slug}`);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/static-blogs", {
        method: "POST",
        body: JSON.stringify({ slug, published: true }),
      });
      const post = data.post as BlogPostFirestore;
      if (!post) throw new Error("Import failed — no post returned");
      if (data.alreadyExists) {
        setOkMsg(
          `Opened “${post.title}” from Firestore (already imported — edits save to admin).`,
        );
      } else {
        setOkMsg(
          `Imported “${post.title}” into Blog posts. Edits now save in admin and override the code version.`,
        );
        await onImported();
        await load();
      }
      onEdit(post);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open static blog for edit");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminCollapseSection
      title="Static / code blogs"
      hint={`${posts.length || "…"} posts built into the website code (pillars first). Edit imports a copy into Firestore.`}
      defaultOpen={false}
    >
      <p className="mb-3 text-xs text-ocean-700">
        These live on the public site from code files (e.g.{" "}
        <code className="rounded bg-ocean-50 px-1">posts-diving.ts</code>). They do
        not appear in the table below until you <strong>Edit</strong> — that copies
        them into Firestore so you can change text/images here. After import,
        Firestore wins over code for that slug.
      </p>
      {loading ? (
        <p className="text-sm text-ocean-600">Loading static blogs…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-ocean-600">No static blogs found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ocean-100">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 bg-ocean-50 text-ocean-800">
              <tr>
                <th className="p-2.5">Title</th>
                <th className="p-2.5">Slug</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.slug}
                  className="border-b border-ocean-50 last:border-0"
                >
                  <td className="max-w-[16rem] p-2.5">
                    <span className="font-medium text-ocean-900">{p.title}</span>
                    {p.pillar ? (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                        Pillar
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2.5 font-mono text-xs text-ocean-600">
                    {p.slug}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-xs text-ocean-600">
                    {p.date}
                  </td>
                  <td className="p-2.5 text-xs">
                    {p.inFirestore ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                        In admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-ocean-100 px-2 py-0.5 font-semibold text-ocean-700">
                        Code only
                      </span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-ocean-700 hover:underline"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        disabled={busy === `static-edit-${p.slug}`}
                        onClick={() => void editStatic(p.slug)}
                        className="text-xs font-semibold text-cyan-800 hover:underline disabled:opacity-50"
                      >
                        {busy === `static-edit-${p.slug}`
                          ? "Opening…"
                          : p.inFirestore
                            ? "Edit"
                            : "Edit (import)"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCollapseSection>
  );
}
