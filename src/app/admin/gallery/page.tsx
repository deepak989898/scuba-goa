"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

type Row = {
  id: string;
  type: "image" | "video";
  mediaUrl: string;
  posterUrl: string;
  alt: string;
  sortOrder: number;
};

export default function AdminGalleryPage() {
  const db = getDb();
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{
    type: "image" | "video";
    mediaUrl: string;
    posterUrl: string;
    alt: string;
    sortOrder: number;
  }>({
    type: "image",
    mediaUrl: "",
    posterUrl: "",
    alt: "",
    sortOrder: 0,
  });

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "homeGallery"));
    const rows: Row[] = snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      const t = String(x.type ?? "image").toLowerCase() === "video" ? "video" : "image";
      return {
        id: d.id,
        type: t,
        mediaUrl: String(x.mediaUrl ?? x.imageUrl ?? ""),
        posterUrl: String(x.posterUrl ?? ""),
        alt: String(x.alt ?? ""),
        sortOrder: Number(x.sortOrder ?? 0),
      };
    });
    rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    setList(rows);
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [db, refresh]);

  async function saveNew() {
    if (!db || !form.mediaUrl.trim()) return;
    await addDoc(collection(db, "homeGallery"), {
      type: form.type,
      mediaUrl: form.mediaUrl.trim(),
      posterUrl: form.type === "video" ? form.posterUrl.trim() : "",
      alt: form.alt.trim() || "Gallery",
      sortOrder: Number(form.sortOrder),
    });
    setForm({
      type: "image",
      mediaUrl: "",
      posterUrl: "",
      alt: "",
      sortOrder: list.length,
    });
    await refresh();
  }

  async function remove(id: string) {
    if (!db || !confirm("Remove this item?")) return;
    await deleteDoc(doc(db, "homeGallery", id));
    await refresh();
  }

  async function patch(id: string, patch: Partial<Row>) {
    if (!db) return;
    await updateDoc(doc(db, "homeGallery", id), patch);
    await refresh();
  }

  async function move(id: string, dir: -1 | 1) {
    const sorted = [...list].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
    );
    const idx = sorted.findIndex((r) => r.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[j]!;
    await updateDoc(doc(db!, "homeGallery", a.id), { sortOrder: b.sortOrder });
    await updateDoc(doc(db!, "homeGallery", b.id), { sortOrder: a.sortOrder });
    await refresh();
  }

  if (!db) {
    return (
      <p className="text-ocean-700">
        Firebase client not configured. Add NEXT_PUBLIC_FIREBASE_* variables.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">
        Homepage gallery
      </h1>
      <p className="mt-2 text-sm text-ocean-600">
        Images and video reels for the home &quot;Gallery &amp; moments&quot; block.
        Use direct URLs (Firebase Storage, Cloudinary, etc.). For videos, add a{" "}
        <strong>poster</strong> image URL for thumbnails. Lower sort order appears
        first. Use Move up / down to reorder quickly.
      </p>

      <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ocean-900">Add item</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Type
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value === "video" ? "video" : "image",
                }))
              }
            >
              <option value="image">Image</option>
              <option value="video">Video reel</option>
            </select>
          </label>
          <label className="text-sm">
            Sort order
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
            {form.type === "video" ? "Video URL (.mp4, etc.)" : "Image URL"}
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.mediaUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, mediaUrl: e.target.value }))
              }
              placeholder="https://…"
            />
          </label>
          {form.type === "video" ? (
            <label className="text-sm sm:col-span-2">
              Poster image URL (for grid thumbnail)
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
                value={form.posterUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, posterUrl: e.target.value }))
                }
                placeholder="https://… (recommended)"
              />
            </label>
          ) : null}
          <label className="text-sm sm:col-span-2">
            Alt text
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.alt}
              onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={saveNew}
          className="mt-4 rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white"
        >
          Add to gallery
        </button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-ocean-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-ocean-600">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-ocean-600">
            No items — homepage uses built-in default photos until you add some.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 bg-ocean-50 text-ocean-800">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Type</th>
                <th className="p-3">Preview</th>
                <th className="p-3">Details</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, idx) => (
                <tr key={r.id} className="border-b border-ocean-50">
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        className="w-20 rounded border border-ocean-200 px-2 py-1"
                        defaultValue={r.sortOrder}
                        onBlur={(e) =>
                          patch(r.id, { sortOrder: Number(e.target.value) || 0 })
                        }
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded border border-ocean-200 px-2 py-0.5 text-xs disabled:opacity-40"
                          disabled={idx === 0}
                          onClick={() => move(r.id, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="rounded border border-ocean-200 px-2 py-0.5 text-xs disabled:opacity-40"
                          disabled={idx === list.length - 1}
                          onClick={() => move(r.id, 1)}
                        >
                          Down
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 align-top capitalize text-ocean-800">
                    {r.type}
                  </td>
                  <td className="p-3 align-top">
                    {r.type === "video" ? (
                      r.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.posterUrl}
                          alt=""
                          className="h-14 w-24 rounded object-cover"
                        />
                      ) : (
                        <span className="text-xs text-ocean-500">No poster</span>
                      )
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.mediaUrl}
                        alt=""
                        className="h-14 w-24 rounded object-cover"
                      />
                    )}
                  </td>
                  <td className="max-w-xs p-3 align-top text-xs text-ocean-700">
                    <p className="font-medium text-ocean-900">{r.alt}</p>
                    <p className="mt-1 truncate font-mono text-[10px] text-ocean-500">
                      {r.mediaUrl}
                    </p>
                  </td>
                  <td className="p-3 align-top">
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => remove(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
