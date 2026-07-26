"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb, getFirebaseAuth, getFirebaseStorageClient } from "@/lib/firebase";
import { docToService, serviceToPayload } from "@/lib/service-firestore";
import type { ServiceItem, SubServiceItem } from "@/data/services";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";
import {
  AdminMediaUrlPreview,
  AdminSingleImagePreview,
} from "@/components/admin/AdminMediaUrlPreview";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";

type SubServiceFormRow = {
  subId: string;
  title: string;
  description: string;
  priceFrom: string;
  includes: string;
  slotsLeft: string;
  bookedToday: string;
};

const emptySubRow = (): SubServiceFormRow => ({
  subId: "",
  title: "",
  description: "",
  priceFrom: "",
  includes: "",
  slotsLeft: "",
  bookedToday: "",
});

/** Primary + gallery + post images for admin zoom slider (deduped, images only). */
function serviceImageUrls(s: ServiceItem): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | undefined) => {
    const u = (raw ?? "").trim();
    if (!u || seen.has(u)) return;
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return;
    seen.add(u);
    out.push(u);
  };
  push(s.image);
  for (const g of s.galleryUrls ?? []) push(g);
  for (const p of s.serviceMedia?.posts ?? []) push(p);
  return out;
}

export default function AdminServicesPage() {
  const db = getDb();
  const [list, setList] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingMediaType, setUploadingMediaType] = useState<
    "posts" | "reels" | "videos" | null
  >(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [subRows, setSubRows] = useState<SubServiceFormRow[]>([]);
  /** Inline price drafts for quick-edit column (document slug → input string) */
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPriceSlug, setSavingPriceSlug] = useState<string | null>(null);
  const [bulkDeltaInr, setBulkDeltaInr] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [imageZoom, setImageZoom] = useState<{
    title: string;
    urls: string[];
    index: number;
  } | null>(null);
  const triedAutoSeed = useRef(false);

  const empty = {
    slug: "",
    title: "",
    short: "",
    priceFrom: 1999,
    image: "",
    duration: "Half day",
    rating: 4.8,
    includes: "Pickup, Guide, Water",
    slotsLeft: 8,
    bookedToday: 3,
    sortOrder: 0,
    limitedSlots: true,
    mostBooked: false,
    detailContent: "",
    galleryUrls: "",
    mediaPosts: "",
    mediaReels: "",
    mediaVideos: "",
    active: true,
  };
  const [form, setForm] = useState(empty);

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "services"));
    const rows: ServiceItem[] = [];
    for (const d of snap.docs) {
      const s = docToService(d.id, d.data() as Record<string, unknown>);
      if (s) rows.push(s);
    }
    rows.sort(
      (a, b) =>
        (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
        a.slug.localeCompare(b.slug)
    );
    setList(rows);
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [db, refresh]);

  useEffect(() => {
    if (!db || loading || list.length > 0 || triedAutoSeed.current) return;
    triedAutoSeed.current = true;
    (async () => {
      const r = await fetch("/api/seed-catalog-if-empty", { method: "POST" });
      if (r.ok) await refresh();
    })();
  }, [db, loading, list.length, refresh]);

  useEffect(() => {
    if (!imageZoom) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setImageZoom(null);
        return;
      }
      if (e.key === "ArrowLeft") {
        setImageZoom((z) =>
          z && z.urls.length > 1
            ? {
                ...z,
                index: (z.index - 1 + z.urls.length) % z.urls.length,
              }
            : z,
        );
      }
      if (e.key === "ArrowRight") {
        setImageZoom((z) =>
          z && z.urls.length > 1
            ? { ...z, index: (z.index + 1) % z.urls.length }
            : z,
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageZoom]);

  function openServiceImages(s: ServiceItem, startIndex = 0) {
    const urls = serviceImageUrls(s);
    if (!urls.length) return;
    setImageZoom({
      title: s.title,
      urls,
      index: Math.min(Math.max(0, startIndex), urls.length - 1),
    });
  }

  function startEdit(s: ServiceItem) {
    setEditingSlug(s.slug);
    setForm({
      slug: s.slug,
      title: s.title,
      short: s.short,
      priceFrom: s.priceFrom,
      image: s.image,
      duration: s.duration,
      rating: s.rating,
      includes: s.includes.join(", "),
      slotsLeft: s.slotsLeft ?? 0,
      bookedToday: s.bookedToday ?? 0,
      sortOrder: s.sortOrder ?? 0,
      limitedSlots: s.limitedSlots ?? false,
      mostBooked: s.mostBooked ?? false,
      detailContent: s.detailContent ?? "",
      galleryUrls: s.galleryUrls?.join("\n") ?? "",
      mediaPosts: s.serviceMedia?.posts?.join("\n") ?? "",
      mediaReels: s.serviceMedia?.reels?.join("\n") ?? "",
      mediaVideos: s.serviceMedia?.videos?.join("\n") ?? "",
      active: s.active !== false,
    });
    setSubRows(
      s.subServices?.map((sub) => ({
        subId: sub.id ?? "",
        title: sub.title,
        description: sub.description ?? "",
        priceFrom:
          sub.priceFrom != null && Number.isFinite(sub.priceFrom)
            ? String(sub.priceFrom)
            : "",
        includes: sub.includes?.join(", ") ?? "",
        slotsLeft:
          sub.slotsLeft != null && Number.isFinite(sub.slotsLeft)
            ? String(sub.slotsLeft)
            : "",
        bookedToday:
          sub.bookedToday != null && Number.isFinite(sub.bookedToday)
            ? String(sub.bookedToday)
            : "",
      })) ?? []
    );
  }

  async function save() {
    if (!db) return;
    setFormError(null);
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug || !form.title.trim()) {
      setFormError("Slug and title are required.");
      return;
    }
    const subServices: SubServiceItem[] | undefined = (() => {
      const rows: SubServiceItem[] = [];
      for (const r of subRows) {
        const title = r.title.trim();
        if (!title) continue;
        let priceFrom: number | undefined;
        if (r.priceFrom.trim() !== "") {
          const n = Number(r.priceFrom);
          priceFrom = Number.isFinite(n) ? n : undefined;
        }
        const inc = r.includes
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        const row: SubServiceItem = {
          title,
          description: r.description.trim() || undefined,
          priceFrom,
          includes: inc.length ? inc : undefined,
        };
        const sid = r.subId.trim();
        if (sid) row.id = sid;
        if (r.slotsLeft.trim() !== "") {
          const n = Number(r.slotsLeft);
          if (Number.isFinite(n)) row.slotsLeft = n;
        }
        if (r.bookedToday.trim() !== "") {
          const n = Number(r.bookedToday);
          if (Number.isFinite(n)) row.bookedToday = n;
        }
        rows.push(row);
      }
      return rows.length ? rows : undefined;
    })();

    const primaryImg = form.image.trim();
    const galleryUrls = (() => {
      const parts = form.galleryUrls
        .split(/[\n,]+/)
        .map((x) => x.trim())
        .filter(Boolean);
      const dedup: string[] = [];
      for (const u of parts) {
        if (u === primaryImg) continue;
        if (!dedup.includes(u)) dedup.push(u);
      }
      return dedup.length ? dedup : undefined;
    })();

    const item: ServiceItem & { sortOrder: number } = {
      slug,
      title: form.title.trim(),
      short: form.short.trim(),
      priceFrom: Number(form.priceFrom),
      image: primaryImg,
      galleryUrls,
      duration: form.duration.trim(),
      rating: Number(form.rating),
      includes: form.includes
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      slotsLeft: Number(form.slotsLeft),
      bookedToday: Number(form.bookedToday),
      limitedSlots: form.limitedSlots,
      mostBooked: form.mostBooked,
      active: form.active,
      sortOrder: Number(form.sortOrder),
      detailContent: form.detailContent.trim() || undefined,
      subServices,
      serviceMedia: {
        posts: form.mediaPosts
          .split(/[\n,]+/)
          .map((x) => x.trim())
          .filter(Boolean),
        reels: form.mediaReels
          .split(/[\n,]+/)
          .map((x) => x.trim())
          .filter(Boolean),
        videos: form.mediaVideos
          .split(/[\n,]+/)
          .map((x) => x.trim())
          .filter(Boolean),
      },
    };
    const payload = serviceToPayload(item);
    if (editingSlug && editingSlug !== slug) {
      if (
        !confirm(
          "Slug changed — this creates a new page and leaves the old doc. Continue?"
        )
      )
        return;
      await deleteDoc(doc(db, "services", editingSlug));
    }
    await setDoc(doc(db, "services", slug), payload);
    setForm(empty);
    setSubRows([]);
    setEditingSlug(null);
    setPriceDrafts({});
    await refresh();
  }

  async function onMediaUpload(
    mediaType: "posts" | "reels" | "videos",
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;
    const storage = getFirebaseStorageClient();
    if (!storage) {
      setFormError("Firebase Storage not configured.");
      return;
    }
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) {
      setFormError("Set service slug first, then upload media.");
      return;
    }

    setFormError(null);
    setUploadingMediaType(mediaType);
    try {
      const uploadedUrls: string[] = [];
      const auth = getFirebaseAuth();
      let bearer: string | null = null;
      try {
        if (auth?.currentUser) {
          await auth.currentUser.getIdToken(true);
          bearer = await auth.currentUser.getIdToken();
        }
      } catch {
        bearer = null;
      }

      for (const file of Array.from(files)) {
        const isImage =
          mediaType === "posts" &&
          (file.type.startsWith("image/") ||
            /\.(jpe?g|png|webp|avif)$/i.test(file.name));

        if (isImage && bearer) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("profile", "card");
          fd.append("folder", `services/${slug}/${mediaType}`);
          const apiRes = await fetch("/api/admin/media-image-upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${bearer}` },
            body: fd,
          });
          if (apiRes.ok) {
            const data = (await apiRes.json()) as { url?: string };
            if (data.url) {
              uploadedUrls.push(data.url);
              continue;
            }
          }
          // Fall through to raw upload if server compress fails
        }

        const safeName = file.name.replace(/[^\w.-]+/g, "_");
        const path = `services/${slug}/${mediaType}/${Date.now()}_${safeName}`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, file, {
          contentType: file.type || undefined,
        });
        const url = await getDownloadURL(fileRef);
        uploadedUrls.push(url);
      }
      setForm((prev) => {
        const key =
          mediaType === "posts"
            ? "mediaPosts"
            : mediaType === "reels"
              ? "mediaReels"
              : "mediaVideos";
        const existing = (prev[key] as string)
          .split(/[\n,]+/)
          .map((x) => x.trim())
          .filter(Boolean);
        const merged = [...new Set([...existing, ...uploadedUrls])];
        return { ...prev, [key]: merged.join("\n") };
      });
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Failed to upload media file(s)."
      );
    } finally {
      setUploadingMediaType(null);
    }
  }

  async function remove(slug: string) {
    if (!db || !confirm(`Delete service "${slug}"?`)) return;
    await deleteDoc(doc(db, "services", slug));
    await refresh();
  }

  async function toggleServiceActive(s: ServiceItem) {
    if (!db) return;
    const next = s.active === false;
    await updateDoc(doc(db, "services", s.slug), { active: next });
    await refresh();
  }

  function priceDraftFor(s: ServiceItem): string {
    const d = priceDrafts[s.slug];
    if (d !== undefined) return d;
    return String(s.priceFrom ?? 0);
  }

  async function saveQuickPrice(s: ServiceItem) {
    if (!db) return;
    const raw = priceDrafts[s.slug] ?? String(s.priceFrom);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setFormError("Enter a valid price (0 or more).");
      return;
    }
    setFormError(null);
    setSavingPriceSlug(s.slug);
    try {
      await updateDoc(doc(db, "services", s.slug), { priceFrom: Math.round(n) });
      setFormError(null);
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[s.slug];
        return next;
      });
      await refresh();
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Could not save price. Try again."
      );
    } finally {
      setSavingPriceSlug(null);
    }
  }

  async function applyBulkPriceDelta() {
    if (!db || list.length === 0) return;
    const delta = Number(bulkDeltaInr);
    if (!Number.isFinite(delta) || delta === 0) {
      setFormError("Enter a non-zero amount to add (use negative to reduce).");
      return;
    }
    setFormError(null);
    setBulkSaving(true);
    try {
      for (const s of list) {
        const nextPrice = Math.max(0, Math.round(Number(s.priceFrom ?? 0) + delta));
        await updateDoc(doc(db, "services", s.slug), { priceFrom: nextPrice });
      }
      setFormError(null);
      setBulkDeltaInr("");
      setPriceDrafts({});
      await refresh();
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Bulk update failed. Try again."
      );
    } finally {
      setBulkSaving(false);
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
      <h1 className="font-display text-base font-bold text-ocean-900">Services</h1>
      <p className="mt-2 text-sm text-ocean-700">
        Home page &amp; /services cards. Document ID = URL slug (e.g.{" "}
        <code className="text-xs">scuba-diving</code>). Turn off{" "}
        <strong>Active</strong> to hide a service everywhere on the public site
        (including its detail URL) without deleting the document.
      </p>

      <AdminCollapseSection
        key={editingSlug ? `edit-${editingSlug}` : "add-service"}
        title={editingSlug ? `Edit service (${editingSlug})` : "Add service"}
        hint={
          editingSlug
            ? "Editing — update fields below, then save"
            : "Collapsed — click to add a new service"
        }
        defaultOpen={Boolean(editingSlug)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`text-sm ${editingSlug ? "opacity-60" : ""}`}>
            Slug (URL) — lowercase-with-hyphens
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.slug}
              disabled={Boolean(editingSlug)}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))
              }
              placeholder="scuba-diving"
            />
          </label>
          <label className="text-sm">
            Sort order (0 = first)
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
            Title
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Short description
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.short}
              onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Price from (INR)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.priceFrom}
              onChange={(e) =>
                setForm((f) => ({ ...f, priceFrom: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm">
            Duration
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.duration}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration: e.target.value }))
              }
            />
          </label>
          <AdminSingleImagePreview
            label="Image URL"
            value={form.image}
            onChange={(image) => setForm((f) => ({ ...f, image }))}
            placeholder="https://… (direct link to .jpg / .webp etc.)"
            hint="Preview updates as you paste a URL. Use a full https:// link or a /public path."
          />
          <div className="sm:col-span-2">
            <AdminMediaUrlPreview
              label="Extra images (detail slider)"
              value={form.galleryUrls}
              onChange={(galleryUrls) => setForm((f) => ({ ...f, galleryUrls }))}
              kind="image"
              placeholder="One URL per line or comma-separated"
            />
          </div>
          <label className="text-sm">
            Rating
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.rating}
              onChange={(e) =>
                setForm((f) => ({ ...f, rating: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Includes (comma-separated)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.includes}
              onChange={(e) =>
                setForm((f) => ({ ...f, includes: e.target.value }))
              }
            />
            <span className="mt-1 block text-xs text-ocean-700">
              All items show on cards and detail; separate with commas.
            </span>
          </label>
          <label className="text-sm sm:col-span-2">
            Detail page copy
            <textarea
              rows={6}
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 font-sans text-sm"
              value={form.detailContent}
              onChange={(e) =>
                setForm((f) => ({ ...f, detailContent: e.target.value }))
              }
              placeholder="Shown on /services/your-slug. Leave blank to use the default text. Use a blank line between paragraphs."
            />
          </label>
          <div className="rounded-xl border border-ocean-100 bg-ocean-50/50 p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-ocean-900">
              Detail media tabs (Posts / Reels / Videos)
            </p>
            <p className="mt-1 text-xs text-ocean-700">
              Upload files to Firebase Storage or paste URLs below. These appear on
              the service detail page bottom section.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                Upload post images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2 text-xs"
                  onChange={(e) => void onMediaUpload("posts", e.target.files)}
                />
              </label>
              <label className="text-sm">
                Upload reels
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2 text-xs"
                  onChange={(e) => void onMediaUpload("reels", e.target.files)}
                />
              </label>
              <label className="text-sm">
                Upload videos
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2 text-xs"
                  onChange={(e) => void onMediaUpload("videos", e.target.files)}
                />
              </label>
            </div>
            {uploadingMediaType ? (
              <p className="mt-2 text-xs text-ocean-700">
                Uploading {uploadingMediaType}...
              </p>
            ) : null}
            <AdminMediaUrlPreview
              label="Post images"
              value={form.mediaPosts}
              onChange={(mediaPosts) => setForm((f) => ({ ...f, mediaPosts }))}
              kind="image"
              placeholder="One image URL per line"
            />
            <AdminMediaUrlPreview
              label="Reels"
              value={form.mediaReels}
              onChange={(mediaReels) => setForm((f) => ({ ...f, mediaReels }))}
              kind="video"
              placeholder="One reel video URL per line"
            />
            <AdminMediaUrlPreview
              label="Videos"
              value={form.mediaVideos}
              onChange={(mediaVideos) => setForm((f) => ({ ...f, mediaVideos }))}
              kind="video"
              placeholder="One long video URL per line"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ocean-900">
                Sub-services (detail page)
              </span>
              <button
                type="button"
                className="rounded-lg border border-ocean-200 px-3 py-1.5 text-xs font-semibold text-ocean-800 hover:bg-ocean-50"
                onClick={() => setSubRows((rows) => [...rows, emptySubRow()])}
              >
                Add sub-service
              </button>
            </div>
            <p className="mt-1 text-xs text-ocean-700">
              Optional variants on the detail page. Set a price (&gt; 0) to show Add to
              cart. Each sub-service gets its own SEO page from the{" "}
              <strong>title</strong> (example: title{" "}
              <code className="text-[11px]">Scuba diving in Grand Island</code> →{" "}
              <code className="text-[11px]">
                /services/scuba-diving-in-grand-island
              </code>
              ). <strong>Cart id</strong> stays the stable cart/booking key if you
              reorder rows — it is not the public URL.
            </p>
            <ul className="mt-3 space-y-2.5">
              {subRows.map((row, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-ocean-100 bg-ocean-50/50 p-4"
                >
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 hover:underline"
                      onClick={() =>
                        setSubRows((rows) => rows.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Cart id (optional)
                      <input
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2 font-mono text-xs"
                        value={row.subId}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, subId: e.target.value } : r
                            )
                          )
                        }
                        placeholder="e.g. try-dive"
                      />
                    </label>
                    <label className="text-sm">
                      Title
                      <input
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.title}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, title: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      Description
                      <textarea
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2 text-sm"
                        value={row.description}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx
                                ? { ...r, description: e.target.value }
                                : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm">
                      From price (INR, optional)
                      <input
                        type="number"
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.priceFrom}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, priceFrom: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Slots left (optional)
                      <input
                        type="number"
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.slotsLeft}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, slotsLeft: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Booked today (optional)
                      <input
                        type="number"
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.bookedToday}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, bookedToday: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      Includes (comma-separated)
                      <input
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.includes}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, includes: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <label className="text-sm">
            Slots left
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.slotsLeft}
              onChange={(e) =>
                setForm((f) => ({ ...f, slotsLeft: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm">
            Booked today
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.bookedToday}
              onChange={(e) =>
                setForm((f) => ({ ...f, bookedToday: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.limitedSlots}
              onChange={(e) =>
                setForm((f) => ({ ...f, limitedSlots: e.target.checked }))
              }
            />
            Limited slots badge
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.mostBooked}
              onChange={(e) =>
                setForm((f) => ({ ...f, mostBooked: e.target.checked }))
              }
            />
            Most booked badge
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
            />
            Active (visible on site)
          </label>
        </div>
        {formError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="min-h-11 rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white"
          >
            {editingSlug ? "Update" : "Add"}
          </button>
          {editingSlug ? (
            <button
              type="button"
              onClick={() => {
                setEditingSlug(null);
                setForm(empty);
                setSubRows([]);
              }}
              className="min-h-11 rounded-full border border-ocean-200 px-5 py-2 text-sm font-semibold text-ocean-800"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </AdminCollapseSection>

      <div className="mt-4 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
        <h2 className="font-semibold text-ocean-900">Quick price (existing services)</h2>
        <p className="mt-1 text-sm text-ocean-700">
          Change the main <strong>From ₹</strong> shown on cards—saved instantly to
          Firestore. Sub-service variant prices are still edited in the full form below.
        </p>
        {loading || list.length === 0 ? null : (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-ocean-100 bg-ocean-50/40 p-4">
            <label className="text-sm text-ocean-900">
              Add to <strong>all</strong> services (₹)
              <input
                type="number"
                className="mt-1 block w-36 rounded-lg border border-ocean-200 bg-white px-2 py-2"
                value={bulkDeltaInr}
                onChange={(e) => setBulkDeltaInr(e.target.value)}
                placeholder="e.g. 100 or -50"
                disabled={bulkSaving}
              />
            </label>
            <button
              type="button"
              disabled={bulkSaving || list.length === 0}
              onClick={() => void applyBulkPriceDelta()}
              className="min-h-11 rounded-full bg-ocean-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {bulkSaving ? "Applying…" : "Apply to all"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-ocean-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-3 text-ocean-700">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-3 text-ocean-700">
            No Firestore documents — website shows default services from code. Add one
            above to override.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 bg-ocean-50 text-ocean-800">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="min-w-[200px] p-3">From ₹ (quick edit)</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const imgs = serviceImageUrls(s);
                const thumb = imgs[0];
                return (
                <tr
                  key={s.slug}
                  className={`border-b border-ocean-50 ${
                    s.active === false ? "bg-ocean-50/80 opacity-90" : ""
                  }`}
                >
                  <td className="p-2 align-middle">
                    {thumb ? (
                      <button
                        type="button"
                        onClick={() => openServiceImages(s, 0)}
                        className="relative h-14 w-20 overflow-hidden rounded-lg border border-ocean-200 bg-ocean-100 shadow-sm transition hover:ring-2 hover:ring-cyan-400"
                        title={
                          imgs.length > 1
                            ? `Zoom · ${imgs.length} images`
                            : "Zoom image"
                        }
                        aria-label={`Zoom images for ${s.title}`}
                      >
                        <CmsRemoteImage
                          src={thumb}
                          alt={s.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                        {imgs.length > 1 ? (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                            {imgs.length}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <span className="inline-flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-ocean-200 text-[10px] text-ocean-400">
                        No image
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-ocean-700">{s.slug}</td>
                  <td className="p-3 font-medium text-ocean-900">{s.title}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => toggleServiceActive(s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        s.active === false
                          ? "bg-ocean-200 text-ocean-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {s.active === false ? "Inactive" : "Active"}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="w-28 rounded-lg border border-ocean-200 px-2 py-1.5 font-medium tabular-nums"
                        value={priceDraftFor(s)}
                        onChange={(e) =>
                          setPriceDrafts((prev) => ({
                            ...prev,
                            [s.slug]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveQuickPrice(s);
                          }
                        }}
                        disabled={savingPriceSlug === s.slug}
                        aria-label={`Price from INR for ${s.slug}`}
                      />
                      <button
                        type="button"
                        className="rounded-lg bg-ocean-800 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        disabled={savingPriceSlug === s.slug}
                        onClick={() => void saveQuickPrice(s)}
                      >
                        {savingPriceSlug === s.slug ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-ocean-700 hover:underline"
                      onClick={() => startEdit(s)}
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-ocean-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => remove(s.slug)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {imageZoom ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Images: ${imageZoom.title}`}
          onClick={() => setImageZoom(null)}
        >
          <div
            className="relative flex w-full max-w-4xl flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="truncate font-semibold">{imageZoom.title}</p>
                <p className="text-xs text-white/70">
                  {imageZoom.index + 1} / {imageZoom.urls.length} · ← → to slide ·
                  Esc to close
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
                onClick={() => setImageZoom(null)}
              >
                Close
              </button>
            </div>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-black">
              <CmsRemoteImage
                src={imageZoom.urls[imageZoom.index]!}
                alt={`${imageZoom.title} ${imageZoom.index + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
              {imageZoom.urls.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg font-bold text-white hover:bg-black/80"
                    aria-label="Previous image"
                    onClick={() =>
                      setImageZoom((z) =>
                        z
                          ? {
                              ...z,
                              index:
                                (z.index - 1 + z.urls.length) % z.urls.length,
                            }
                          : z,
                      )
                    }
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg font-bold text-white hover:bg-black/80"
                    aria-label="Next image"
                    onClick={() =>
                      setImageZoom((z) =>
                        z
                          ? { ...z, index: (z.index + 1) % z.urls.length }
                          : z,
                      )
                    }
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>
            {imageZoom.urls.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imageZoom.urls.map((url, i) => (
                  <button
                    key={`${i}-${url.slice(0, 40)}`}
                    type="button"
                    onClick={() =>
                      setImageZoom((z) => (z ? { ...z, index: i } : z))
                    }
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                      i === imageZoom.index
                        ? "border-cyan-400"
                        : "border-white/30"
                    }`}
                  >
                    <CmsRemoteImage
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
