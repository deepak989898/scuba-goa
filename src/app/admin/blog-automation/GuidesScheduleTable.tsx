"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { SeoPageFirestore } from "@/lib/seo-page-firestore";
import type { BlogGscRow } from "@/lib/admin-content-overview";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";

type GuideTraffic = { views: number; visitors: number };

type Props = {
  pages: SeoPageFirestore[];
  guideTrafficBySlug: Record<string, GuideTraffic>;
  guidesIndexTraffic: GuideTraffic;
  trafficLoading: boolean;
  guideGscBySlug: Record<string, BlogGscRow>;
  onRefreshTraffic?: () => void;
  trafficRefreshing?: boolean;
};

function gscForSlug(
  slug: string,
  map: Record<string, BlogGscRow>,
): BlogGscRow | null {
  return map[slug.trim().toLowerCase()] ?? null;
}

function IndexBadge({ row }: { row: BlogGscRow | null }) {
  if (!row) {
    return <span className="text-xs font-semibold text-slate-500">—</span>;
  }
  if (row.indexLabel === "indexed") {
    return (
      <span className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
        Indexed
      </span>
    );
  }
  if (row.indexLabel === "pending") {
    return (
      <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-800">
      Not idx
    </span>
  );
}

type SortKey = "views" | "imp" | "clk" | "pos" | "idx";
type SortDir = "asc" | "desc";

const INDEX_RANK: Record<BlogGscRow["indexLabel"] | "none", number> = {
  indexed: 0,
  pending: 1,
  not_indexed: 2,
  none: 3,
};

const TH =
  "px-1.5 py-1.5 text-xs font-bold uppercase tracking-wide text-ocean-700 whitespace-nowrap";
const TD = "px-1.5 py-1.5 align-middle text-sm text-ocean-800";

/**
 * Guides (/guides) on Blog posts & schedule — same GSC metrics as blogs.
 */
export function GuidesScheduleTable({
  pages,
  guideTrafficBySlug,
  guidesIndexTraffic,
  trafficLoading,
  guideGscBySlug,
  onRefreshTraffic,
  trafficRefreshing,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const liveCount = pages.filter((p) => p.published).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pages;
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = pages.filter((p) => {
        const hay = `${p.headline} ${p.slug} ${p.metaTitle}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      });
    }
    if (!sortKey) return list;
    const metric = (p: SeoPageFirestore): number => {
      const gsc = gscForSlug(p.slug, guideGscBySlug);
      const traffic = guideTrafficBySlug[p.slug];
      switch (sortKey) {
        case "views":
          return traffic?.views ?? 0;
        case "imp":
          return gsc?.impressions ?? 0;
        case "clk":
          return gsc?.clicks ?? 0;
        case "pos":
          return gsc?.position != null ? gsc.position : Number.POSITIVE_INFINITY;
        case "idx":
          return INDEX_RANK[gsc?.indexLabel ?? "none"];
        default:
          return 0;
      }
    };
    const mul = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = metric(a);
      const bv = metric(b);
      if (sortKey === "pos") {
        const aMiss = !Number.isFinite(av);
        const bMiss = !Number.isFinite(bv);
        if (aMiss !== bMiss) return aMiss ? 1 : -1;
      }
      if (av !== bv) return av < bv ? -1 * mul : 1 * mul;
      return a.slug.localeCompare(b.slug);
    });
  }, [pages, query, sortKey, sortDir, guideGscBySlug, guideTrafficBySlug]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "pos" || key === "idx" ? "asc" : "desc");
  }

  function SortBtn({
    label,
    keyName,
    align = "left",
  }: {
    label: string;
    keyName: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === keyName;
    return (
      <th className={`${TH} ${align === "right" ? "text-right" : ""}`}>
        <button
          type="button"
          onClick={() => handleSort(keyName)}
          className={`inline-flex items-center gap-0.5 font-bold uppercase ${
            active ? "text-cyan-800 underline" : "text-ocean-700"
          }`}
        >
          {label}
          <span className="text-[10px]" aria-hidden>
            {active ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <AdminCollapseSection
      title="SEO guides (/guides)"
      hint={`${liveCount} live · ${pages.length} total · same Views / Imp / Clk / Pos / Idx as blogs · in sitemap`}
      defaultOpen={pages.length > 0}
      className="border-teal-200 open:border-teal-300 open:ring-teal-100"
      badge={
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-teal-900">
          {pages.length}
        </span>
      }
    >
      <p className="text-xs text-ocean-700">
        Guide landing pages live at <code className="rounded bg-ocean-50 px-1">/guides/…</code>.
        They are in <strong>/sitemap.xml</strong> and <strong>/sitemaps/guides.xml</strong>.
        Edit opens the guide editor (menu item removed — manage from here).
      </p>
      <p className="mt-1 text-xs text-ocean-600">
        Guides index:{" "}
        {trafficLoading
          ? "…"
          : `${guidesIndexTraffic.views.toLocaleString("en-IN")} views · ${guidesIndexTraffic.visitors.toLocaleString("en-IN")} visitors`}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides by title or slug…"
          className="min-w-[12rem] flex-1 rounded-lg border border-ocean-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ocean-900 sm:max-w-sm"
        />
        {onRefreshTraffic ? (
          <button
            type="button"
            disabled={trafficLoading || trafficRefreshing}
            onClick={onRefreshTraffic}
            className="rounded-full border border-ocean-300 px-3 py-1 text-xs font-semibold text-ocean-800 disabled:opacity-50"
          >
            {trafficLoading || trafficRefreshing ? "Refreshing…" : "Refresh views"}
          </button>
        ) : null}
        <Link
          href="/admin/seo-pages?new=1"
          className="rounded-full bg-teal-700 px-3 py-1 text-xs font-bold text-white hover:bg-teal-800"
        >
          Add guide
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="mt-3 text-sm text-ocean-500">No guide pages yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-ocean-100 bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-ocean-100 bg-ocean-50/80">
              <tr>
                <th className={TH}>Img</th>
                <th className={TH}>Slug</th>
                <th className={TH}>Title</th>
                <th className={TH}>St</th>
                <SortBtn label="Views" keyName="views" align="right" />
                <SortBtn label="Imp" keyName="imp" align="right" />
                <SortBtn label="Clk" keyName="clk" align="right" />
                <SortBtn label="Pos" keyName="pos" align="right" />
                <SortBtn label="Idx" keyName="idx" />
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const gsc = gscForSlug(p.slug, guideGscBySlug);
                const views = guideTrafficBySlug[p.slug]?.views ?? 0;
                const img = p.heroImageUrl || p.ogImageUrl;
                return (
                  <tr key={p.slug} className="border-t border-ocean-50">
                    <td className={TD}>
                      {img ? (
                        <span className="relative block h-9 w-12 overflow-hidden rounded border border-ocean-200 bg-ocean-50">
                          <CmsRemoteImage
                            src={img}
                            alt={p.headline}
                            fill
                            className="object-cover"
                            sizes="48px"
                            loading="lazy"
                          />
                        </span>
                      ) : (
                        <span className="flex h-9 w-12 items-center justify-center rounded border border-dashed border-ocean-200 text-ocean-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className={`${TD} max-w-[10rem] truncate font-mono text-[11px]`} title={p.slug}>
                      {p.slug}
                    </td>
                    <td className={`${TD} max-w-[14rem] truncate font-medium`} title={p.headline}>
                      {p.headline}
                    </td>
                    <td className={TD}>
                      {p.published ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
                          Live
                        </span>
                      ) : (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-700">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className={`${TD} text-right tabular-nums font-semibold`}>
                      {views.toLocaleString("en-IN")}
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>
                      {gsc ? gsc.impressions.toLocaleString("en-IN") : "—"}
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>
                      {gsc ? gsc.clicks.toLocaleString("en-IN") : "—"}
                    </td>
                    <td className={`${TD} text-right tabular-nums font-bold`}>
                      {gsc?.position != null ? `#${gsc.position}` : "—"}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap items-center gap-1">
                        <IndexBadge row={gsc} />
                        <Link
                          href={`/guides/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-semibold text-cyan-700 underline"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/admin/seo-pages?edit=${encodeURIComponent(p.slug)}`}
                          className="text-xs font-bold text-ocean-800 underline"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminCollapseSection>
  );
}
