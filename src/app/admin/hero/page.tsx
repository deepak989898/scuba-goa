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
  imageUrl: string;
  videoUrl: string;
  alt: string;
  sortOrder: number;
};

export default function AdminHeroPage() {
  const db = getDb();
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    imageUrl: "",
    videoUrl: "",
    alt: "",
    sortOrder: 0,
  });

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "heroSlides"));
    const rows = snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        imageUrl: String(x.imageUrl ?? ""),
        videoUrl: String(x.videoUrl ?? ""),
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
    const img = form.imageUrl.trim();
    const vid = form.videoUrl.trim();
    if (!db || (!img && !vid)) return;
    await addDoc(collection(db, "heroSlides"), {
      imageUrl: img,
      videoUrl: vid,
      alt: form.alt.trim() || "Hero slide",
      sortOrder: Number(form.sortOrder),
    });
    setForm({ imageUrl: "", videoUrl: "", alt: "", sortOrder: list.length });
    await refresh();
  }

  async function remove(id: string) {
    if (!db || !confirm("Remove this slide?")) return;
    await deleteDoc(doc(db, "heroSlides", id));
    await refresh();
  }

  async function patchSort(id: string, sortOrder: number) {
    if (!db) return;
    await updateDoc(doc(db, "heroSlides", id), { sortOrder });
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
        Homepage hero slider
      </h1>
      <p className="mt-2 text-sm text-ocean-600">
        Slides rotate on the home hero. Add an image URL (recommended as poster), and
        optionally a video URL — direct MP4/WebM or a YouTube watch/share link. If this list
        is empty, the site uses built-in defaults. Lower sort order shows earlier.
      </p>

      <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ocean-900">Add slide</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Image URL (poster / fallback)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.imageUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, imageUrl: e.target.value }))
              }
              placeholder="https://… (required if no video)"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Video URL (optional)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.videoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, videoUrl: e.target.value }))
              }
              placeholder="MP4/WebM link or YouTube URL"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Alt text
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.alt}
              onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
            />
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
        </div>
        <button
          type="button"
          onClick={saveNew}
          className="mt-4 rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white"
        >
          Add slide
        </button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-ocean-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-ocean-600">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-ocean-600">
            No slides — homepage uses code defaults. Add one above.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 bg-ocean-50 text-ocean-800">
              <tr>
                <th className="p-3">Sort</th>
                <th className="p-3">Preview</th>
                <th className="p-3">Type</th>
                <th className="p-3">Alt</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-ocean-50">
                  <td className="p-3">
                    <input
                      type="number"
                      className="w-20 rounded border border-ocean-200 px-2 py-1"
                      defaultValue={r.sortOrder}
                      onBlur={(e) =>
                        patchSort(r.id, Number(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td className="p-3">
                    {r.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={r.imageUrl}
                        alt=""
                        className="h-14 w-24 rounded object-cover"
                      />
                    ) : (
                      <span className="text-xs text-ocean-500">—</span>
                    )}
                  </td>
                  <td className="max-w-[8rem] p-3 text-xs text-ocean-700">
                    {r.videoUrl.trim() ? (
                      <span className="font-semibold text-ocean-900">Video</span>
                    ) : (
                      <span>Image</span>
                    )}
                  </td>
                  <td className="max-w-xs p-3 text-xs text-ocean-700">
                    {r.alt}
                    {r.imageUrl ? (
                      <div className="mt-1 truncate font-mono text-[10px] text-ocean-500">
                        {r.imageUrl}
                      </div>
                    ) : null}
                    {r.videoUrl.trim() ? (
                      <div className="mt-1 truncate font-mono text-[10px] text-ocean-500">
                        {r.videoUrl}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">
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
