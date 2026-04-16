"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
import {
  isValidSeoSlug,
  normalizeSeoSlugInput,
  parseSeoPageFromFirestore,
  seoPageToFirestorePayload,
  type SeoPageFirestore,
} from "@/lib/seo-page-firestore";

type BookingSelectOption = { value: string; label: string; group: string };

type GuideTraffic = { views: number; visitors: number };

export default function AdminSeoPagesPage() {
  const db = getDb();
  const [list, setList] = useState<SeoPageFirestore[]>([]);
  const [loading, setLoading] = useState(true);
  const [guideTrafficBySlug, setGuideTrafficBySlug] = useState<
    Record<string, GuideTraffic>
  >({});
  const [guidesIndexTraffic, setGuidesIndexTraffic] = useState<GuideTraffic>({
    views: 0,
    visitors: 0,
  });
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [trafficError, setTrafficError] = useState<string | null>(null);
  const [catalogPackages, setCatalogPackages] = useState<PackageDoc[]>([]);
  const [catalogServices, setCatalogServices] = useState<ServiceItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [editing, setEditing] = useState<SeoPageFirestore | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<"og" | "hero" | null>(null);

  const [newPage, setNewPage] = useState({
    slug: "",
    headline: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    ogImageUrl: "",
    heroImageUrl: "",
    bodyContent: "",
    bookingOption: "",
    published: false,
  });

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "seoPages"));
    const rows: SeoPageFirestore[] = [];
    for (const d of snap.docs) {
      const p = parseSeoPageFromFirestore(d.id, d.data() as Record<string, unknown>, {
        requirePublished: false,
      });
      if (p) rows.push(p);
    }
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setList(rows);
  }, [db]);

  const loadGuideTraffic = useCallback(async () => {
    if (!db) {
      setTrafficLoading(false);
      return;
    }
    setTrafficError(null);
    setTrafficLoading(true);
    try {
      const snap = await getDocs(collection(db, "analyticsGuideTraffic"));
      const record: Record<string, GuideTraffic> = {};
      let index: GuideTraffic = { views: 0, visitors: 0 };
      for (const row of snap.docs) {
        const data = row.data() as Record<string, unknown>;
        const path = String(data.path ?? "").trim();
        const slug = String(data.slug ?? "").trim();
        const views = Number(data.views ?? 0);
        const visitors = Number(data.visitors ?? 0);
        const traffic = {
          views: Number.isFinite(views) ? Math.max(0, Math.round(views)) : 0,
          visitors: Number.isFinite(visitors) ? Math.max(0, Math.round(visitors)) : 0,
        };
        if (path === "/guides") {
          index = traffic;
          continue;
        }
        if (slug) record[slug] = traffic;
      }
      setGuideTrafficBySlug(record);
      setGuidesIndexTraffic(index);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "code" in e
          ? `${String((e as { code?: string }).code)}: ${String((e as { message?: string }).message ?? e)}`
          : String(e);
      setTrafficError(msg);
      setGuideTrafficBySlug({});
      setGuidesIndexTraffic({ views: 0, visitors: 0 });
    } finally {
      setTrafficLoading(false);
    }
  }, [db]);

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
    if (!db) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [db, refresh]);

  useEffect(() => {
    void loadGuideTraffic();
  }, [loadGuideTraffic]);

  useEffect(() => {
    void loadBookingCatalog();
  }, [loadBookingCatalog]);

  const sortedList = useMemo(() => {
    return [...list].sort((a, b) => {
      const ta = guideTrafficBySlug[a.slug]?.views ?? 0;
      const tb = guideTrafficBySlug[b.slug]?.views ?? 0;
      if (tb !== ta) return tb - ta;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [list, guideTrafficBySlug]);

  const bookingSelectOptions: BookingSelectOption[] = useMemo(() => {
    const out: BookingSelectOption[] = [
      {
        value: "",
        label: "No default cart line (general /booking)",
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
  }, [catalogPackages, catalogServices]);

  async function savePage(page: SeoPageFirestore, isNew: boolean) {
    if (!db) return;
    setSaveErr(null);
    const slug = normalizeSeoSlugInput(page.slug);
    if (!isValidSeoSlug(slug)) {
      setSaveErr("URL slug must be 2+ characters: lowercase letters, numbers, hyphens only.");
      return;
    }
    if (!page.headline.trim()) {
      setSaveErr("Headline (on-page H1) is required.");
      return;
    }
    const now = new Date().toISOString();
    const payload = seoPageToFirestorePayload({
      ...page,
      slug,
      headline: page.headline.trim(),
      metaTitle: page.metaTitle.trim(),
      metaDescription: page.metaDescription.trim(),
      ogImageUrl: page.ogImageUrl.trim(),
      heroImageUrl: page.heroImageUrl.trim(),
      bodyContent: page.bodyContent.trim(),
      bookingOption: page.bookingOption.trim(),
      updatedAt: now,
      createdAt: isNew ? now : page.createdAt,
    });
    await setDoc(doc(db, "seoPages", slug), payload, { merge: true });
    await refresh();
    setEditing(null);
    if (isNew) {
      setNewPage({
        slug: "",
        headline: "",
        metaTitle: "",
        metaDescription: "",
        keywords: "",
        ogImageUrl: "",
        heroImageUrl: "",
        bodyContent: "",
        bookingOption: "",
        published: false,
      });
    }
  }

  async function createNew() {
    if (!db) return;
    const slug = normalizeSeoSlugInput(newPage.slug);
    const snap = await getDoc(doc(db, "seoPages", slug));
    if (snap.exists()) {
      setSaveErr("That slug is already in use. Pick another URL slug.");
      return;
    }
    const keywords = newPage.keywords
      .split(/[,|\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await savePage(
      {
        slug,
        headline: newPage.headline.trim(),
        metaTitle: newPage.metaTitle.trim(),
        metaDescription: newPage.metaDescription.trim(),
        keywords,
        ogImageUrl: newPage.ogImageUrl.trim(),
        heroImageUrl: newPage.heroImageUrl.trim(),
        bodyContent: newPage.bodyContent.trim(),
        bookingOption: newPage.bookingOption.trim(),
        published: newPage.published,
        updatedAt: "",
        createdAt: undefined,
      },
      true,
    );
  }

  async function remove(slug: string) {
    if (!db || !confirm(`Delete guide “${slug}” permanently?`)) return;
    await deleteDoc(doc(db, "seoPages", slug));
    setEditing((e) => (e?.slug === slug ? null : e));
    await refresh();
  }

  async function uploadSeoImage(file: File | null, kind: "og" | "hero", target: "new" | "edit") {
    if (!file) return;
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      setUploadErr("Sign in at /admin/login first.");
      return;
    }
    setUploadErr(null);
    setUploadBusy(kind);
    try {
      await auth.currentUser.getIdToken(true);
      const token = await auth.currentUser.getIdToken();
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const apiRes = await fetch("/api/admin/seo-image-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (apiRes.ok) {
        const data = (await apiRes.json()) as { url?: string };
        if (data.url) {
          if (target === "new") {
            setNewPage((f) =>
              kind === "og"
                ? { ...f, ogImageUrl: data.url! }
                : { ...f, heroImageUrl: data.url! },
            );
          } else if (editing) {
            setEditing((e) =>
              e
                ? {
                    ...e,
                    ...(kind === "og"
                      ? { ogImageUrl: data.url! }
                      : { heroImageUrl: data.url! }),
                  }
                : null,
            );
          }
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
          "Firebase Storage is not configured; server upload did not succeed.",
        );
        return;
      }
      const safe = file.name.replace(/[^\w.-]+/g, "_");
      const folder = kind === "og" ? "seo/og" : "seo/hero";
      const path = `${folder}/${Date.now()}_${safe}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file, {
        contentType: file.type || undefined,
      });
      const url = await getDownloadURL(fileRef);
      if (target === "new") {
        setNewPage((f) =>
          kind === "og" ? { ...f, ogImageUrl: url } : { ...f, heroImageUrl: url },
        );
      } else if (editing) {
        setEditing((e) =>
          e
            ? {
                ...e,
                ...(kind === "og" ? { ogImageUrl: url } : { heroImageUrl: url }),
              }
            : null,
        );
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadBusy(null);
    }
  }

  const bookingSelect = (
    value: string,
    onChange: (v: string) => void,
    disabled?: boolean,
  ) => (
    <select
      className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 text-sm"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
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
  );

  if (!db) {
    return (
      <p className="text-ocean-700">
        Firebase client not configured. Add NEXT_PUBLIC_FIREBASE_* variables.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">SEO guide pages</h1>
      <p className="mt-2 max-w-3xl text-sm text-ocean-600">
        Create public URLs at{" "}
        <code className="rounded bg-ocean-50 px-1 text-xs">/guides/your-slug</code> with proper
        titles, meta descriptions, optional hero and Open Graph images, and an optional
        default booking line. Drafts stay private until you tick{" "}
        <strong>Published</strong>. Live pages require{" "}
        <code className="rounded bg-ocean-50 px-1 text-xs">FIREBASE_SERVICE_ACCOUNT_KEY</code> on
        the server for search engines to render metadata (same as dynamic services).
      </p>

      {saveErr ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {saveErr}
        </p>
      ) : null}
      {uploadErr ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {uploadErr}
        </p>
      ) : null}

      <div className="mt-10 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ocean-900">Add guide page</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            URL slug (lowercase, hyphens)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={newPage.slug}
              onChange={(e) =>
                setNewPage((f) => ({ ...f, slug: normalizeSeoSlugInput(e.target.value) }))
              }
              placeholder="e.g. scuba-diving-price-goa-monsoon"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Headline (visible H1)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={newPage.headline}
              onChange={(e) => setNewPage((f) => ({ ...f, headline: e.target.value }))}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Meta title (browser tab / Google title — optional, defaults to headline)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={newPage.metaTitle}
              onChange={(e) => setNewPage((f) => ({ ...f, metaTitle: e.target.value }))}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Meta description (≈150 characters recommended)
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={newPage.metaDescription}
              onChange={(e) =>
                setNewPage((f) => ({ ...f, metaDescription: e.target.value }))
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Keywords (comma-separated)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={newPage.keywords}
              onChange={(e) => setNewPage((f) => ({ ...f, keywords: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            OG / share image URL
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 text-xs"
              value={newPage.ogImageUrl}
              onChange={(e) => setNewPage((f) => ({ ...f, ogImageUrl: e.target.value }))}
            />
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-xs"
              disabled={uploadBusy !== null}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void uploadSeoImage(f, "og", "new").finally(() => {
                  e.target.value = "";
                });
              }}
            />
          </label>
          <label className="text-sm">
            Hero image URL (optional — top of page)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 text-xs"
              value={newPage.heroImageUrl}
              onChange={(e) =>
                setNewPage((f) => ({ ...f, heroImageUrl: e.target.value }))
              }
            />
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-xs"
              disabled={uploadBusy !== null}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void uploadSeoImage(f, "hero", "new").finally(() => {
                  e.target.value = "";
                });
              }}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Page body (same simple format as blog: paragraphs separated by a blank line,{" "}
            <code className="text-xs">##</code> for h2, lists with{" "}
            <code className="text-xs">- </code> lines)
            <textarea
              className="mt-1 min-h-[200px] w-full rounded-lg border border-ocean-200 px-2 py-2 font-mono text-xs"
              value={newPage.bodyContent}
              onChange={(e) => setNewPage((f) => ({ ...f, bodyContent: e.target.value }))}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Default booking target (optional)
            {bookingSelect(newPage.bookingOption, (v) =>
              setNewPage((f) => ({ ...f, bookingOption: v })),
              catalogLoading,
            )}
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={newPage.published}
              onChange={(e) =>
                setNewPage((f) => ({ ...f, published: e.target.checked }))
              }
            />
            <span>
              <span className="font-medium text-ocean-900">Published</span>
              <span className="mt-0.5 block text-xs text-ocean-600">
                Only published pages are visible on the public site and in the sitemap.
              </span>
            </span>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void createNew()}
          className="mt-4 rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white"
        >
          Save new page
        </button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-ocean-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-ocean-100 bg-ocean-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-ocean-900">Existing pages</h2>
          <button
            type="button"
            disabled={trafficLoading || !db}
            onClick={() => void loadGuideTraffic()}
            className="self-start rounded-full border border-ocean-300 bg-white px-3 py-1 text-xs font-semibold text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
          >
            {trafficLoading ? "Loading traffic…" : "Refresh traffic"}
          </button>
        </div>
        <div className="border-b border-ocean-100 bg-white px-4 py-3 text-xs text-ocean-600">
          <p>
            <strong className="text-ocean-800">/guides</strong> (all guides index):{" "}
            {trafficLoading ? (
              "…"
            ) : (
              <>
                <span className="font-semibold text-ocean-900">
                  {guidesIndexTraffic.views.toLocaleString("en-IN")}
                </span>{" "}
                page views ·{" "}
                <span className="font-semibold text-ocean-900">
                  {guidesIndexTraffic.visitors.toLocaleString("en-IN")}
                </span>{" "}
                unique visitors
              </>
            )}
          </p>
          <p className="mt-1">
            Per-guide numbers are stored as running totals from live{" "}
            <code className="text-[10px]">view</code> events on{" "}
            <code className="text-[10px]">/guides/your-slug</code>. Sorting is by page views
            (highest first) so you can spot growing pages quickly.
          </p>
          {trafficError ? (
            <p className="mt-2 font-mono text-[11px] text-red-700">{trafficError}</p>
          ) : null}
        </div>
        {loading ? (
          <p className="p-6 text-ocean-600">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-ocean-600">No SEO pages yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 text-ocean-800">
              <tr>
                <th className="p-3">Slug</th>
                <th className="p-3">Headline</th>
                <th className="p-3 text-right">Page views</th>
                <th className="p-3 text-right">Visitors</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedList.map((r) => (
                <Fragment key={r.slug}>
                  <tr className="border-b border-ocean-100">
                    <td className="p-3 align-top font-mono text-xs text-ocean-800">
                      {r.slug}
                    </td>
                    <td className="p-3 align-top text-ocean-900">{r.headline}</td>
                    <td className="p-3 align-top text-right tabular-nums text-ocean-900">
                      {trafficLoading
                        ? "—"
                        : (guideTrafficBySlug[r.slug]?.views ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 align-top text-right tabular-nums text-ocean-800">
                      {trafficLoading
                        ? "—"
                        : (guideTrafficBySlug[r.slug]?.visitors ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 align-top">
                      {r.published ? (
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
                        {r.published ? (
                          <Link
                            href={`/guides/${r.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ocean-700 underline"
                          >
                            View
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="text-ocean-800 hover:underline"
                          onClick={() => setEditing({ ...r })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => void remove(r.slug)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing?.slug === r.slug ? (
                    <tr className="border-b border-ocean-50 bg-ocean-50/50">
                      <td colSpan={6} className="p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-700">
                          Edit — slug is fixed ({editing.slug})
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-medium text-ocean-800 sm:col-span-2">
                            Headline
                            <input
                              className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-sm"
                              value={editing.headline}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x ? { ...x, headline: e.target.value } : null,
                                )
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-ocean-800 sm:col-span-2">
                            Meta title
                            <input
                              className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-sm"
                              value={editing.metaTitle}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x ? { ...x, metaTitle: e.target.value } : null,
                                )
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-ocean-800 sm:col-span-2">
                            Meta description
                            <textarea
                              className="mt-1 min-h-[72px] w-full rounded border border-ocean-200 px-2 py-1.5 text-sm"
                              value={editing.metaDescription}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x
                                    ? { ...x, metaDescription: e.target.value }
                                    : null,
                                )
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-ocean-800 sm:col-span-2">
                            Keywords (comma-separated)
                            <input
                              className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-sm"
                              value={editing.keywords.join(", ")}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x
                                    ? {
                                        ...x,
                                        keywords: e.target.value
                                          .split(/[,|\n]+/)
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      }
                                    : null,
                                )
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-ocean-800">
                            OG image URL
                            <input
                              className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-xs"
                              value={editing.ogImageUrl}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x ? { ...x, ogImageUrl: e.target.value } : null,
                                )
                              }
                            />
                            <input
                              type="file"
                              accept="image/*"
                              className="mt-1 block w-full text-[11px]"
                              disabled={uploadBusy !== null}
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                void uploadSeoImage(f, "og", "edit").finally(() => {
                                  e.target.value = "";
                                });
                              }}
                            />
                          </label>
                          <label className="text-xs font-medium text-ocean-800">
                            Hero image URL
                            <input
                              className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5 text-xs"
                              value={editing.heroImageUrl}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x ? { ...x, heroImageUrl: e.target.value } : null,
                                )
                              }
                            />
                            <input
                              type="file"
                              accept="image/*"
                              className="mt-1 block w-full text-[11px]"
                              disabled={uploadBusy !== null}
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                void uploadSeoImage(f, "hero", "edit").finally(() => {
                                  e.target.value = "";
                                });
                              }}
                            />
                          </label>
                          <label className="text-xs font-medium text-ocean-800 sm:col-span-2">
                            Body
                            <textarea
                              className="mt-1 min-h-[160px] w-full rounded border border-ocean-200 px-2 py-1.5 font-mono text-[11px]"
                              value={editing.bodyContent}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x ? { ...x, bodyContent: e.target.value } : null,
                                )
                              }
                            />
                          </label>
                          <label className="text-xs font-medium text-ocean-800 sm:col-span-2">
                            Booking target
                            {bookingSelect(editing.bookingOption, (v) =>
                              setEditing((x) => (x ? { ...x, bookingOption: v } : null)),
                              catalogLoading,
                            )}
                          </label>
                          <label className="flex cursor-pointer items-start gap-2 text-xs sm:col-span-2">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={editing.published}
                              onChange={(e) =>
                                setEditing((x) =>
                                  x ? { ...x, published: e.target.checked } : null,
                                )
                              }
                            />
                            <span className="font-medium text-ocean-900">Published</span>
                          </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-semibold text-white"
                            onClick={() => editing && void savePage(editing, false)}
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-ocean-300 px-4 py-2 text-xs font-semibold text-ocean-800"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </button>
                          {uploadBusy ? (
                            <span className="self-center text-xs text-ocean-600">
                              Uploading…
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-6 text-xs text-ocean-500">
        Public index: open{" "}
        <Link href="/guides" className="underline" target="_blank" rel="noreferrer">
          /guides
        </Link>{" "}
        in a new tab to verify live pages.
      </p>
    </div>
  );
}
