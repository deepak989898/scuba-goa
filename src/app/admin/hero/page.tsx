"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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
import type { ServiceItem } from "@/data/services";
import {
  encodePackageOption,
  encodeServiceBaseOption,
  encodeServiceSubOption,
} from "@/lib/booking-selection";
import { docToService } from "@/lib/service-firestore";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";
import type { PackageDoc } from "@/lib/types";
import {
  getPricedSubServicesWithIndex,
  getSubServiceCartKey,
} from "@/lib/service-sub-helpers";

type Row = {
  id: string;
  imageUrl: string;
  videoUrl: string;
  videoThumbnailUrl: string;
  alt: string;
  sortOrder: number;
  useAmbientMusic: boolean;
  bookingOption: string;
};

type UploadKind = "video" | "poster" | "thumbnail";

type BookingSelectOption = { value: string; label: string; group: string };

export default function AdminHeroPage() {
  const db = getDb();
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogPackages, setCatalogPackages] = useState<PackageDoc[]>([]);
  const [catalogServices, setCatalogServices] = useState<ServiceItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [form, setForm] = useState({
    imageUrl: "",
    videoUrl: "",
    videoThumbnailUrl: "",
    alt: "",
    sortOrder: 0,
    useAmbientMusic: false,
    bookingOption: "",
  });
  const [uploadBusy, setUploadBusy] = useState<{
    kind: UploadKind;
    rowId?: string;
  } | null>(null);
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
        videoThumbnailUrl: String(
          x.videoThumbnailUrl ?? x.video_thumbnail_url ?? "",
        ),
        alt: String(x.alt ?? ""),
        sortOrder: Number(x.sortOrder ?? 0),
        useAmbientMusic: Boolean(x.useAmbientMusic),
        bookingOption: String(
          x.bookingOption ?? x.booking_option ?? "",
        ).trim(),
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

  const loadBookingCatalog = useCallback(async () => {
    if (!db) {
      setCatalogLoading(false);
      return;
    }
    setCatalogLoading(true);
    try {
      const [pkgSnap, svcSnap] = await Promise.all([
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "services")),
      ]);
      const pkgs: PackageDoc[] = pkgSnap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        const imageTrim =
          x.imageUrl != null ? String(x.imageUrl).trim() : "";
        return {
          id: d.id,
          name: String(x.name ?? ""),
          price: Number(x.price ?? 0),
          duration: String(x.duration ?? ""),
          includes: parseFirestoreIncludes(x.includes),
          rating: Number(x.rating ?? 0),
          slotsLeft: x.slotsLeft != null ? Number(x.slotsLeft) : undefined,
          bookedToday: x.bookedToday != null ? Number(x.bookedToday) : undefined,
          imageUrl: imageTrim || undefined,
          category: x.category ? String(x.category) : undefined,
          isCombo: Boolean(x.isCombo),
          discountPct: x.discountPct != null ? Number(x.discountPct) : undefined,
          limitedSlots: Boolean(x.limitedSlots),
          active: x.active !== false,
        };
      });
      pkgs.sort((a, b) => a.price - b.price);
      const svcs: ServiceItem[] = [];
      for (const d of svcSnap.docs) {
        const s = docToService(d.id, d.data() as Record<string, unknown>);
        if (s) svcs.push(s);
      }
      svcs.sort(
        (a, b) =>
          (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
          a.slug.localeCompare(b.slug),
      );
      setCatalogPackages(pkgs);
      setCatalogServices(svcs);
    } finally {
      setCatalogLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void loadBookingCatalog();
  }, [loadBookingCatalog]);

  const bookingSelectOptions: BookingSelectOption[] = (() => {
    const out: BookingSelectOption[] = [
      {
        value: "",
        label: "Default — general / scuba booking page",
        group: "Recommended",
      },
    ];
    for (const p of catalogPackages) {
      if (p.active === false) continue;
      out.push({
        value: encodePackageOption(p.id),
        label: `${p.name} — ₹${p.price.toLocaleString("en-IN")}`,
        group: "Packages",
      });
    }
    for (const s of catalogServices) {
      if (s.active === false) continue;
      const subs = getPricedSubServicesWithIndex(s);
      if (subs.length) {
        for (const { sub, index } of subs) {
          const key = getSubServiceCartKey(sub, index);
          const price = sub.priceFrom ?? 0;
          out.push({
            value: encodeServiceSubOption(s.slug, key),
            label: `${s.title} — ${sub.title} — ₹${price.toLocaleString("en-IN")}`,
            group: "Services",
          });
        }
      } else if (s.priceFrom > 0) {
        out.push({
          value: encodeServiceBaseOption(s.slug),
          label: `${s.title} — ₹${s.priceFrom.toLocaleString("en-IN")}`,
          group: "Services",
        });
      }
    }
    return out;
  })();

  async function saveNew() {
    const img = form.imageUrl.trim();
    const vid = form.videoUrl.trim();
    const thumb = form.videoThumbnailUrl.trim();
    if (!db || (!img && !vid)) return;
    const bo = form.bookingOption.trim();
    await addDoc(collection(db, "heroSlides"), {
      imageUrl: img,
      videoUrl: vid,
      ...(vid && thumb ? { videoThumbnailUrl: thumb } : {}),
      alt: form.alt.trim() || "Hero slide",
      sortOrder: Number(form.sortOrder),
      useAmbientMusic: form.useAmbientMusic,
      ...(bo ? { bookingOption: bo } : {}),
    });
    setForm({
      imageUrl: "",
      videoUrl: "",
      videoThumbnailUrl: "",
      alt: "",
      sortOrder: list.length,
      useAmbientMusic: false,
      bookingOption: "",
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

  async function patchBookingOption(id: string, bookingOption: string) {
    if (!db) return;
    const v = bookingOption.trim();
    await updateDoc(
      doc(db, "heroSlides", id),
      v ? { bookingOption: v } : { bookingOption: deleteField() },
    );
    await refresh();
  }

  async function patchHeroSlide(
    id: string,
    patch: Partial<
      Pick<Row, "imageUrl" | "videoUrl" | "videoThumbnailUrl" | "alt">
    >,
  ) {
    if (!db) return;
    const payload: Record<string, unknown> = {};
    if (patch.imageUrl !== undefined) {
      payload.imageUrl = patch.imageUrl.trim();
    }
    if (patch.videoUrl !== undefined) {
      const v = patch.videoUrl.trim();
      payload.videoUrl = v;
    }
    if (patch.videoThumbnailUrl !== undefined) {
      const t = patch.videoThumbnailUrl.trim();
      payload.videoThumbnailUrl = t ? t : deleteField();
    }
    if (patch.alt !== undefined) {
      payload.alt = patch.alt.trim() || "Hero slide";
    }
    if (Object.keys(payload).length === 0) return;
    await updateDoc(doc(db, "heroSlides", id), payload);
    await refresh();
  }

  async function applyUploadUrl(
    url: string,
    kind: UploadKind,
    rowId?: string,
  ) {
    if (!db) return;
    if (rowId) {
      if (kind === "video") {
        await updateDoc(doc(db, "heroSlides", rowId), { videoUrl: url });
      } else if (kind === "thumbnail") {
        await updateDoc(doc(db, "heroSlides", rowId), {
          videoThumbnailUrl: url,
        });
      } else {
        await updateDoc(doc(db, "heroSlides", rowId), { imageUrl: url });
      }
      await refresh();
      return;
    }
    if (kind === "video") {
      setForm((f) => ({ ...f, videoUrl: url }));
    } else if (kind === "thumbnail") {
      setForm((f) => ({ ...f, videoThumbnailUrl: url }));
    } else {
      setForm((f) => ({ ...f, imageUrl: url }));
    }
  }

  async function uploadHeroFile(
    file: File | null,
    kind: UploadKind,
    rowId?: string,
  ) {
    if (!file) return;
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      setUploadErr(
        "Not signed in. Open /admin/login on this site, then try again.",
      );
      return;
    }
    setUploadErr(null);
    setUploadBusy({ kind, rowId });
    try {
      await auth.currentUser.getIdToken(true);
      const token = await auth.currentUser.getIdToken();
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const apiRes = await fetch("/api/admin/hero-media-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (apiRes.ok) {
        const data = (await apiRes.json()) as { url?: string };
        if (data.url) {
          await applyUploadUrl(data.url, kind, rowId);
          return;
        }
      }
      if (apiRes.status === 401 || apiRes.status === 403) {
        const err = await apiRes.json().catch(() => ({}));
        setUploadErr(
          String((err as { error?: string }).error ?? "Not authorized for server upload."),
        );
        return;
      }

      const storage = getFirebaseStorageClient();
      if (!storage) {
        setUploadErr(
          "Firebase Storage is not configured (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET), and server upload did not succeed.",
        );
        return;
      }

      const safe = file.name.replace(/[^\w.-]+/g, "_");
      const folder =
        kind === "video"
          ? "hero/videos"
          : kind === "thumbnail"
            ? "hero/thumbnails"
            : "hero/posters";
      const path = `${folder}/${Date.now()}_${safe}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file, {
        contentType: file.type || undefined,
      });
      const url = await getDownloadURL(fileRef);
      await applyUploadUrl(url, kind, rowId);
    } catch (e) {
      setUploadErr(
        e instanceof Error
          ? e.message
          : "Upload failed. For production: set FIREBASE_SERVICE_ACCOUNT_KEY, or apply storage.cors.json to your bucket (see repo) for browser upload.",
      );
    } finally {
      setUploadBusy(null);
    }
  }

  const anyUpload = uploadBusy !== null;

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
        Slides rotate on the home hero. Add an image URL (default poster for videos), and
        optionally a video. For videos you can set a separate{" "}
        <strong>video thumbnail</strong> URL or upload — if empty, the image URL above is
        used. You can upload a thumbnail anytime (even before adding the video URL). Edit
        existing slides in the table below. YouTube / MP4 / WebM supported. Use{" "}
        <strong>Book CTA</strong> so each slide opens <code className="text-xs">/booking</code>{" "}
        with the matching package or service already in the cart.
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
              disabled={anyUpload}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void uploadHeroFile(f, "poster").finally(() => {
                  e.target.value = "";
                });
              }}
            />
            {uploadBusy?.kind === "poster" && !uploadBusy.rowId ? (
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
              disabled={anyUpload}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void uploadHeroFile(f, "video").finally(() => {
                  e.target.value = "";
                });
              }}
            />
            {uploadBusy?.kind === "video" && !uploadBusy.rowId ? (
              <p className="mt-1 text-xs text-ocean-600">Uploading…</p>
            ) : null}
          </div>
          <label className="text-sm sm:col-span-2">
            Video thumbnail URL (optional)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.videoThumbnailUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, videoThumbnailUrl: e.target.value }))
              }
              placeholder="Shown before video plays — defaults to image URL above"
            />
          </label>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-ocean-900">Video thumbnail upload</p>
            <p className="text-xs text-ocean-600">
              JPG/PNG/WebP → hero/thumbnails. Works even if you have not pasted a video URL
              yet; save the slide after you add the video.
            </p>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-ocean-700 file:mr-3 file:rounded-lg file:border-0 file:bg-ocean-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ocean-900 hover:file:bg-ocean-200"
              disabled={anyUpload}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void uploadHeroFile(f, "thumbnail").finally(() => {
                  e.target.value = "";
                });
              }}
            />
            {uploadBusy?.kind === "thumbnail" && !uploadBusy.rowId ? (
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
          <label className="text-sm sm:col-span-2">
            <span className="font-medium text-ocean-900">Book CTA for this slide</span>
            <span className="mt-0.5 block text-xs font-normal text-ocean-600">
              When visitors tap Book on this slide, they go to checkout with this item
              pre-added (packages and priced services).
            </span>
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 text-sm"
              value={form.bookingOption}
              disabled={catalogLoading}
              onChange={(e) =>
                setForm((f) => ({ ...f, bookingOption: e.target.value }))
              }
            >
              {(["Recommended", "Packages", "Services"] as const).map((g) => {
                const opts = bookingSelectOptions.filter((o) => o.group === g);
                if (!opts.length) return null;
                return (
                  <optgroup key={g} label={g}>
                    {opts.map((o, idx) => (
                      <option key={`${g}-${idx}-${o.value}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {catalogLoading ? (
              <p className="mt-1 text-xs text-ocean-500">Loading packages & services…</p>
            ) : null}
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
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-b border-ocean-100">
                    <td className="p-3 align-top">
                      <input
                        type="number"
                        className="w-20 rounded border border-ocean-200 px-2 py-1"
                        defaultValue={r.sortOrder}
                        onBlur={(e) =>
                          patchSort(r.id, Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-3 align-top">
                      {(() => {
                        const poster =
                          r.videoUrl.trim() && r.videoThumbnailUrl.trim()
                            ? r.videoThumbnailUrl
                            : r.imageUrl;
                        return poster ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={poster}
                            alt=""
                            className="h-14 w-24 rounded object-cover"
                          />
                        ) : (
                          <span className="text-xs text-ocean-500">—</span>
                        );
                      })()}
                    </td>
                    <td className="p-3 align-top text-xs text-ocean-700">
                      {r.videoUrl.trim() ? (
                        <span className="font-semibold text-ocean-900">Video</span>
                      ) : (
                        <span>Image</span>
                      )}
                    </td>
                    <td className="p-3 align-top">
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
                  <tr className="border-b border-ocean-50 bg-ocean-50/40">
                    <td colSpan={5} className="p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-700">
                        Edit slide
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="text-xs font-medium text-ocean-800 sm:col-span-2 lg:col-span-3">
                          Book CTA (cart pre-fill for this slide)
                          <select
                            key={`bo-${r.id}-${r.bookingOption}`}
                            className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-xs"
                            defaultValue={r.bookingOption}
                            disabled={catalogLoading}
                            onChange={(e) =>
                              void patchBookingOption(r.id, e.target.value)
                            }
                          >
                            {(
                              ["Recommended", "Packages", "Services"] as const
                            ).map((g) => {
                              const opts = bookingSelectOptions.filter(
                                (o) => o.group === g,
                              );
                              if (!opts.length) return null;
                              return (
                                <optgroup key={g} label={g}>
                                  {opts.map((o, idx) => (
                                    <option
                                      key={`${g}-${idx}-${o.value}`}
                                      value={o.value}
                                    >
                                      {o.label}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-ocean-800">
                          Image / poster URL
                          <input
                            key={`img-${r.id}-${r.imageUrl}`}
                            type="url"
                            className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-xs"
                            defaultValue={r.imageUrl}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v === r.imageUrl.trim()) return;
                              void patchHeroSlide(r.id, { imageUrl: v });
                            }}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="mt-1 block w-full text-[11px] text-ocean-700 file:mr-2 file:rounded file:border-0 file:bg-ocean-200 file:px-2 file:py-1 file:text-[11px] file:font-semibold"
                            disabled={anyUpload}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              void uploadHeroFile(f, "poster", r.id).finally(
                                () => {
                                  e.target.value = "";
                                },
                              );
                            }}
                          />
                          {uploadBusy?.rowId === r.id &&
                          uploadBusy.kind === "poster" ? (
                            <p className="mt-0.5 text-[10px] text-ocean-600">
                              Uploading…
                            </p>
                          ) : null}
                        </label>
                        <label className="text-xs font-medium text-ocean-800">
                          Video URL
                          <input
                            key={`vid-${r.id}-${r.videoUrl}`}
                            type="url"
                            className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-xs"
                            defaultValue={r.videoUrl}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v === r.videoUrl.trim()) return;
                              void patchHeroSlide(r.id, { videoUrl: v });
                            }}
                          />
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                            className="mt-1 block w-full text-[11px] text-ocean-700 file:mr-2 file:rounded file:border-0 file:bg-ocean-200 file:px-2 file:py-1 file:text-[11px] file:font-semibold"
                            disabled={anyUpload}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              void uploadHeroFile(f, "video", r.id).finally(
                                () => {
                                  e.target.value = "";
                                },
                              );
                            }}
                          />
                          {uploadBusy?.rowId === r.id &&
                          uploadBusy.kind === "video" ? (
                            <p className="mt-0.5 text-[10px] text-ocean-600">
                              Uploading…
                            </p>
                          ) : null}
                        </label>
                        <label className="text-xs font-medium text-ocean-800">
                          Video thumbnail URL
                          <input
                            key={`vt-${r.id}-${r.videoThumbnailUrl}`}
                            type="url"
                            className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-xs"
                            defaultValue={r.videoThumbnailUrl}
                            placeholder="Optional — uses poster if empty"
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v === r.videoThumbnailUrl.trim()) return;
                              void patchHeroSlide(r.id, {
                                videoThumbnailUrl: v,
                              });
                            }}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="mt-1 block w-full text-[11px] text-ocean-700 file:mr-2 file:rounded file:border-0 file:bg-ocean-200 file:px-2 file:py-1 file:text-[11px] file:font-semibold"
                            disabled={anyUpload}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              void uploadHeroFile(f, "thumbnail", r.id).finally(
                                () => {
                                  e.target.value = "";
                                },
                              );
                            }}
                          />
                          {uploadBusy?.rowId === r.id &&
                          uploadBusy.kind === "thumbnail" ? (
                            <p className="mt-0.5 text-[10px] text-ocean-600">
                              Uploading…
                            </p>
                          ) : null}
                        </label>
                        <label className="text-xs font-medium text-ocean-800 sm:col-span-2 lg:col-span-3">
                          Alt text
                          <input
                            key={`alt-${r.id}-${r.alt}`}
                            type="text"
                            className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-xs"
                            defaultValue={r.alt}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v === r.alt.trim()) return;
                              void patchHeroSlide(r.id, { alt: v });
                            }}
                          />
                        </label>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
