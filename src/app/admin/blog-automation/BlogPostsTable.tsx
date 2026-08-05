"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { BlogPostFirestore } from "@/lib/blog-firestore";
import { isBlogScheduled } from "@/lib/blog-firestore";
import { formatUtcInIst } from "@/lib/blog-automation/schedule-ist";
import { getContentTrafficForSlug } from "@/lib/analytics-content-traffic";
import type { BlogGscRow } from "@/lib/admin-content-overview";
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
  blogGscBySlug?: Record<string, BlogGscRow>;
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

function gscForSlug(
  slug: string,
  map: Record<string, BlogGscRow> | undefined,
): BlogGscRow | null {
  if (!map) return null;
  return map[slug.trim().toLowerCase()] ?? null;
}

function GscIndexBadge({ row }: { row: BlogGscRow | null }) {
  if (!row) {
    return (
      <span
        className="text-xs font-semibold text-slate-500"
        title="No GSC data yet — run inventory/inspect"
      >
        —
      </span>
    );
  }
  if (row.indexLabel === "indexed") {
    return (
      <span
        className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800"
        title={row.indexStatus}
      >
        Indexed
      </span>
    );
  }
  if (row.indexLabel === "pending") {
    return (
      <span
        className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900"
        title={row.indexStatus}
      >
        Pending
      </span>
    );
  }
  return (
    <span
      className="inline-flex rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-800"
      title={row.indexStatus}
    >
      Not idx
    </span>
  );
}

function GscPositionCell({ row }: { row: BlogGscRow | null }) {
  if (!row || row.position == null) {
    return <span className="text-sm text-slate-400">—</span>;
  }
  const n = row.position;
  const color =
    n <= 3
      ? "text-emerald-700"
      : n <= 10
        ? "text-teal-700"
        : n <= 20
          ? "text-amber-700"
          : "text-orange-700";
  return (
    <span
      className={`text-sm font-extrabold tabular-nums ${color}`}
      title={`Avg position ${n} · ${row.impressions} impressions · ${row.clicks} clicks`}
    >
      #{n}
    </span>
  );
}

function GscMetricCell({
  value,
  title,
}: {
  value: number | null | undefined;
  title: string;
}) {
  if (value == null) {
    return <span className="text-sm text-slate-400">—</span>;
  }
  return (
    <span
      className="text-sm font-semibold tabular-nums text-ocean-900"
      title={title}
    >
      {value.toLocaleString("en-IN")}
    </span>
  );
}

function statusBadge(p: BlogPostFirestore) {
  if (p.published) {
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
        Live
      </span>
    );
  }
  if (isBlogScheduled(p)) {
    return (
      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-bold text-sky-900">
        Sched
      </span>
    );
  }
  return (
    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-700">
      Draft
    </span>
  );
}

const TH =
  "px-1.5 py-1.5 text-xs font-bold uppercase tracking-wide text-ocean-700 whitespace-nowrap";
const TD = "px-1.5 py-1.5 align-middle text-sm text-ocean-800";

type SortKey = "views" | "imp" | "clk" | "pos" | "idx";
type SortDir = "asc" | "desc";

const INDEX_SORT_RANK: Record<
  BlogGscRow["indexLabel"] | "none",
  number
> = {
  indexed: 0,
  pending: 1,
  not_indexed: 2,
  none: 3,
};

function SortableTh({
  label,
  title,
  sortKey,
  activeKey,
  dir,
  align = "left",
  onSort,
}: {
  label: string;
  title?: string;
  sortKey: SortKey;
  activeKey: SortKey | null;
  dir: SortDir;
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const arrow = active ? (dir === "asc" ? " ↑" : " ↓") : "";
  return (
    <th
      className={`${TH} ${align === "right" ? "text-right" : ""}`}
      title={title}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-0.5 rounded px-0.5 py-0.5 font-bold uppercase tracking-wide transition hover:bg-ocean-100 hover:text-ocean-900 ${
          active ? "text-cyan-800 underline decoration-cyan-400" : "text-ocean-700"
        } ${align === "right" ? "ml-auto" : ""}`}
      >
        {label}
        <span className="tabular-nums text-[10px]" aria-hidden>
          {arrow || " ↕"}
        </span>
      </button>
    </th>
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
  blogGscBySlug = {},
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
  const [titleQuery, setTitleQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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

  const filteredPosts = useMemo(() => {
    const q = titleQuery.trim().toLowerCase();
    let list = sortedPosts;
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = sortedPosts.filter((p) => {
        const hay = `${p.title} ${p.slug} ${p.metaTitle ?? ""}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      });
    }
    if (!sortKey) return list;

    const metric = (p: BlogPostFirestore): number => {
      const gsc = gscForSlug(p.slug, blogGscBySlug);
      switch (sortKey) {
        case "views":
          return viewCountForPost(p, blogTrafficBySlug);
        case "imp":
          return gsc?.impressions ?? 0;
        case "clk":
          return gsc?.clicks ?? 0;
        case "pos":
          // Missing position sorts last in both directions via sentinel.
          return gsc?.position != null ? gsc.position : Number.POSITIVE_INFINITY;
        case "idx":
          return INDEX_SORT_RANK[gsc?.indexLabel ?? "none"];
        default:
          return 0;
      }
    };

    const mul = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = metric(a);
      const bv = metric(b);
      // Keep missing positions at the bottom for Pos column.
      if (sortKey === "pos") {
        const aMiss = !Number.isFinite(av);
        const bMiss = !Number.isFinite(bv);
        if (aMiss !== bMiss) return aMiss ? 1 : -1;
      }
      if (av !== bv) return av < bv ? -1 * mul : 1 * mul;
      return a.slug.localeCompare(b.slug);
    });
  }, [
    sortedPosts,
    titleQuery,
    sortKey,
    sortDir,
    blogGscBySlug,
    blogTrafficBySlug,
  ]);

  function handleSort(key: SortKey) {
    // Only one sort active: switching column replaces the previous sort.
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    // Sensible first click: metrics high→low; position best→worst; indexed first.
    setSortDir(key === "pos" || key === "idx" ? "asc" : "desc");
  }

  const visibleSlugs = useMemo(
    () => filteredPosts.map((p) => p.slug),
    [filteredPosts],
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
          All blogs ({filteredPosts.length}
          {titleQuery.trim() || serviceFilter
            ? ` of ${sortedPosts.length}`
            : ` · ${posts.length} total`}
          )
        </h2>
        <p className="mt-1 text-sm text-ocean-600">
          {liveCount} live · {scheduledCount} scheduled · review and edit before
          auto-publish. Blog index:{" "}
          {trafficLoading
            ? "…"
            : `${blogIndexTraffic.views.toLocaleString("en-IN")} views · ${blogIndexTraffic.visitors.toLocaleString("en-IN")} visitors`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex min-w-[12rem] flex-1 items-center gap-1.5 text-xs font-semibold text-ocean-800 sm:max-w-sm">
            <span className="sr-only">Search blogs by title</span>
            <input
              type="search"
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              placeholder="Search by title or slug…"
              className="w-full rounded-lg border border-ocean-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ocean-900 placeholder:text-ocean-400"
              aria-label="Search blogs by title or slug"
            />
          </label>
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
          {titleQuery.trim() ? (
            <button
              type="button"
              onClick={() => setTitleQuery("")}
              className="rounded-full border border-ocean-200 px-3 py-1 text-xs font-semibold text-ocean-700 hover:bg-ocean-50"
            >
              Clear search
            </button>
          ) : null}
        </div>
        {titleQuery.trim() ? (
          <p className="mt-1.5 text-xs font-medium text-ocean-700">
            {filteredPosts.length === 0
              ? "No blogs match this title/slug."
              : `${filteredPosts.length} related blog${filteredPosts.length === 1 ? "" : "s"} found — review duplicates here.`}
          </p>
        ) : null}
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
            Click <strong>Views / Imp / Clk / Pos / Idx</strong> to sort (one at a
            time; click again to reverse)
            {sortKey ? (
              <>
                {" · "}
                <strong className="text-cyan-800">
                  {sortKey.toUpperCase()} {sortDir === "asc" ? "↑" : "↓"}
                </strong>
                {" · "}
                <button
                  type="button"
                  onClick={() => setSortKey(null)}
                  className="font-semibold text-ocean-800 underline"
                >
                  Clear sort
                </button>
              </>
            ) : null}
            .
          </p>
        )}
      </div>
      {posts.length === 0 ? (
        <p className="p-3 text-sm text-ocean-500">No Firestore blogs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[2%]" />
              <col className="w-[4%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[9%]" />
              <col className="w-[4%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[4%]" />
              <col className="w-[4%]" />
              <col className="w-[5%]" />
              <col className="w-[4%]" />
              <col className="w-[5%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="border-b border-ocean-100 bg-ocean-50/80">
              <tr>
                <th className={TH}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all blogs"
                    className="h-3.5 w-3.5 accent-cyan-700"
                  />
                </th>
                <th className={TH}>Img</th>
                <th className={TH}>Slug</th>
                <th className={TH}>Title</th>
                <th className={TH}>Service</th>
                <th className={TH}>St</th>
                <th className={TH}>Sched</th>
                <th className={TH}>Pub</th>
                <SortableTh
                  label="Views"
                  title="Sort by views (click again to reverse)"
                  sortKey="views"
                  activeKey={sortKey}
                  dir={sortDir}
                  align="right"
                  onSort={handleSort}
                />
                <SortableTh
                  label="Imp"
                  title="Sort by GSC impressions"
                  sortKey="imp"
                  activeKey={sortKey}
                  dir={sortDir}
                  align="right"
                  onSort={handleSort}
                />
                <SortableTh
                  label="Clk"
                  title="Sort by GSC clicks"
                  sortKey="clk"
                  activeKey={sortKey}
                  dir={sortDir}
                  align="right"
                  onSort={handleSort}
                />
                <SortableTh
                  label="Pos"
                  title="Sort by GSC average position (best first on first click)"
                  sortKey="pos"
                  activeKey={sortKey}
                  dir={sortDir}
                  align="right"
                  onSort={handleSort}
                />
                <SortableTh
                  label="Idx"
                  title="Sort by index status (Indexed → Pending → Not indexed)"
                  sortKey="idx"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((p) => {
                const gsc = gscForSlug(p.slug, blogGscBySlug);
                return (
                <Fragment key={p.slug}>
                  <tr
                    className={`border-b border-ocean-50 ${
                      selected.has(p.slug) ? "bg-cyan-50/60" : ""
                    }`}
                  >
                    <td className={TD}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.slug)}
                        onChange={() => toggleSlug(p.slug)}
                        aria-label={`Select ${p.title}`}
                        className="h-3.5 w-3.5 accent-cyan-700"
                      />
                    </td>
                    <td className={TD}>
                      {p.featuredImageUrl || p.ogImageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              src: p.featuredImageUrl || p.ogImageUrl,
                              alt: p.featuredImageAlt || p.title,
                            })
                          }
                          className="relative block h-9 w-12 overflow-hidden rounded border border-ocean-200 bg-ocean-50"
                          aria-label={`Zoom image for ${p.title}`}
                          title="Click to zoom"
                        >
                          <CmsRemoteImage
                            src={p.featuredImageUrl || p.ogImageUrl}
                            alt={p.featuredImageAlt || p.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                            loading="lazy"
                          />
                        </button>
                      ) : (
                        <span className="flex h-9 w-12 items-center justify-center rounded border border-dashed border-ocean-200 bg-ocean-50 text-xs text-ocean-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className={`${TD} truncate font-mono text-xs`} title={p.slug}>
                      {p.slug}
                    </td>
                    <td
                      className={`${TD} max-w-0 truncate font-medium text-ocean-900`}
                      title={p.title}
                    >
                      {p.title}
                    </td>
                    <td className={`${TD} max-w-0 truncate`} title={p.serviceSlug || "Unassigned"}>
                      {p.serviceSlug ? (
                        serviceTitleBySlug.get(p.serviceSlug) || p.serviceSlug
                      ) : (
                        <span className="text-orange-700">—</span>
                      )}
                    </td>
                    <td className={TD}>{statusBadge(p)}</td>
                    <td className={`${TD} truncate`} title={isBlogScheduled(p) ? formatUtcInIst(p.scheduledPublishAt) : ""}>
                      {isBlogScheduled(p)
                        ? formatUtcInIst(p.scheduledPublishAt)
                        : "—"}
                    </td>
                    <td className={`${TD} truncate`} title={p.publishedAt ? formatUtcInIst(p.publishedAt, "long") : ""}>
                      {p.publishedAt ? formatUtcInIst(p.publishedAt) : "—"}
                    </td>
                    <td className={`${TD} text-right tabular-nums font-semibold`}>
                      {p.published
                        ? trafficLoading
                          ? "…"
                          : viewCountForPost(p, blogTrafficBySlug).toLocaleString(
                              "en-IN",
                            )
                        : "—"}
                    </td>
                    <td className={`${TD} text-right`}>
                      <GscMetricCell
                        value={gsc?.impressions}
                        title={
                          gsc
                            ? `${gsc.impressions} GSC impressions (last sync)`
                            : "No GSC data"
                        }
                      />
                    </td>
                    <td className={`${TD} text-right`}>
                      <GscMetricCell
                        value={gsc?.clicks}
                        title={
                          gsc
                            ? `${gsc.clicks} GSC clicks (last sync)`
                            : "No GSC data"
                        }
                      />
                    </td>
                    <td className={`${TD} text-right`}>
                      <GscPositionCell row={gsc} />
                    </td>
                    <td className={TD}>
                      <GscIndexBadge row={gsc} />
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-semibold leading-snug">
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
                            Unpub
                          </button>
                        ) : isBlogScheduled(p) ? (
                          <button
                            type="button"
                            className="text-emerald-800 hover:underline"
                            disabled={busy === `save-${p.slug}` || busy === "bulk"}
                            onClick={() => onPublishNow(p.slug)}
                          >
                            Pub
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          disabled={busy === `del-${p.slug}` || busy === "bulk"}
                          onClick={() => onDelete(p.slug)}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing?.slug === p.slug ? (
                    <tr
                      id={`blog-editor-${p.slug}`}
                      className="bg-ocean-50/50"
                    >
                      <td colSpan={14} className="p-2">
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
                );
              })}
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
