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
import {
  getDb,
  getFirebaseAuth,
  getFirebaseStorageClient,
} from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

type Row = {
  id: string;
  imageUrl: string;
  videoUrl: string;
  alt: string;
  sortOrder: number;
  useAmbientMusic: boolean;
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
    useAmbientMusic: false,
  });
  const [uploadBusy, setUploadBusy] = useState<"video" | "poster" | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "heroSlides"));
    const rows = snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        imageUrl: String(x.imageUrl ?? ""),
        videoUrl: String(x.videoUrl ?? x.videoURL ?? x.video_url ?? ""),
        alt: String(x.alt ?? ""),
        sortOrder: Number(x.sortOrder ?? 0),
        useAmbientMusic: Boolean(x.useAmbientMusic),
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
      useAmbientMusic: form.useAmbientMusic,
    });
    setForm({
      imageUrl: "",
      videoUrl: "",
      alt: "",
      sortOrder: list.length,
      useAmbientMusic: false,
    });
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

  async function patchUseAmbientMusic(id: string, useAmbientMusic: boolean) {
    if (!db) return;
    await updateDoc(doc(db, "heroSlides", id), { useAmbientMusic });
    await refresh();
  }

  async function uploadHeroFile(
    file: File | null,
    kind: "video" | "poster",
  ) {
    if (!file) return;
    const storage = getFirebaseStorageClient();
    if (!storage) {
      setUploadErr("Firebase Storage is not configured (bucket env var).");
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      setUploadErr(
        "Not signed in. Open /admin/login on this site, then try again.",
      );
      return;
    }
    setUploadErr(null);
    setUploadBusy(kind);
    try {
      await auth.currentUser.getIdToken(true);
      const safe = file.name.replace(/[^\w.-]+/g, "_");
      const folder = kind === "video" ? "hero/videos" : "hero/posters";
      const path = `${folder}/${Date.now()}_${safe}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file, {
        contentType: file.type || undefined,
      });
      const url = await getDownloadURL(fileRef);
      if (kind === "video") {
        setForm((f) => ({ ...f, videoUrl: url }));
      } else {
        setForm((f) => ({ ...f, imageUrl: url }));
      }
    } catch (e) {
      setUploadErr(
        e instanceof Error ? e.message : "Upload failed. Check Storage rules.",
      );
    } finally {
      setUploadBusy(null);
    }
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
        optionally a video URL or an uploaded file — direct MP4/WebM, Firebase URL, or a
        YouTube / Shorts link. If this list is empty, the site uses built-in defaults. Lower
        sort order shows earlier. For silent videos (or Chrome, which cannot detect an audio
        track), set <code className="text-xs">NEXT_PUBLIC_HERO_FALLBACK_MUSIC_URL</code> and
        use &quot;Site music&quot; on that slide.
      </p>

      <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ocean-900">Add slide</h2>
        {uploadErr ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {uploadErr}
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Image URL (poster / fallback)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.imageUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, imageUrl: e.target.value }))
              }
              placeholder="https://… (recommended for video poster)"
            />
          </label>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-ocean-900">Poster image upload</p>
            <p className="text-xs text-ocean-600">
              Optional — fills the image URL field with a Firebase download link.
            </p>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-ocean-700 file:mr-3 file:rounded-lg file:border-0 file:bg-ocean-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ocean-900 hover:file:bg-ocean-200"
              disabled={uploadBusy !== null}
              onChange={(e) =>
                void uploadHeroFile(e.target.files?.[0] ?? null, "poster")
              }
            />
            {uploadBusy === "poster" ? (
              <p className="mt-1 text-xs text-ocean-600">Uploading…</p>
            ) : null}
          </div>
          <label className="text-sm sm:col-span-2">
            Video URL (optional)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.videoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, videoUrl: e.target.value }))
              }
              placeholder="MP4/WebM link, YouTube, or upload below"
            />
          </label>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-ocean-900">Hero video upload</p>
            <p className="text-xs text-ocean-600">
              MP4 or WebM — stored in Firebase Storage; URL is pasted into the field
              automatically.
            </p>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              className="mt-1 block w-full text-sm text-ocean-700 file:mr-3 file:rounded-lg file:border-0 file:bg-ocean-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ocean-900 hover:file:bg-ocean-200"
              disabled={uploadBusy !== null}
              onChange={(e) =>
                void uploadHeroFile(e.target.files?.[0] ?? null, "video")
              }
            />
            {uploadBusy === "video" ? (
              <p className="mt-1 text-xs text-ocean-600">Uploading…</p>
            ) : null}
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.useAmbientMusic}
              onChange={(e) =>
                setForm((f) => ({ ...f, useAmbientMusic: e.target.checked }))
              }
              disabled={!form.videoUrl.trim()}
            />
            <span>
              <span className="font-medium text-ocean-900">Site music</span>
              <span className="mt-0.5 block text-xs font-normal text-ocean-600">
                Mute this video and play{" "}
                <code className="text-[10px]">NEXT_PUBLIC_HERO_FALLBACK_MUSIC_URL</code>{" "}
                instead (silent clips, or when the browser cannot use the video&apos;s own audio).
              </span>
            </span>
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
                <th className="p-3">Site music</th>
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
                  <td className="p-3">
                    <input
                      type="checkbox"
                      title="Site music (muted video + fallback URL)"
                      checked={r.useAmbientMusic}
                      disabled={!r.videoUrl.trim()}
                      onChange={(e) =>
                        void patchUseAmbientMusic(r.id, e.target.checked)
                      }
                      aria-label="Use site music for this slide"
                    />
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
