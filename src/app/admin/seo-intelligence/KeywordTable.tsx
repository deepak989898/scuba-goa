"use client";

import Link from "next/link";
import type { SeoIntelKeyword } from "@/lib/seo-intelligence/types";
import {
  SEO_INTEL_TONE_CLASS,
  pageMatchLabel,
  pageMatchTone,
} from "@/lib/seo-intelligence/ui-priority";

function posLabel(pos: number | null | undefined) {
  if (pos == null || pos <= 0) return "—";
  return String(Math.round(pos));
}

function shortAction(text: string): string {
  const t = (text || "").trim();
  if (!t) return "—";
  if (/no suitable page|no page|create a high-quality/i.test(t)) {
    return "Create / optimise page";
  }
  if (/cannibal/i.test(t)) return "Fix cannibalisation";
  if (/wrong page/i.test(t)) return "Fix wrong page";
  if (/CTR|top-3/i.test(t)) return "Improve CTR / title";
  if (/page-1|page 1|expand content/i.test(t)) return "Strengthen for page 1";
  if (/Maintain/i.test(t)) return "Monitor";
  return t.length > 42 ? `${t.slice(0, 40)}…` : t;
}

function shortUrl(url: string | null | undefined): string {
  if (!url) return "—";
  const path = url.replace(/^https?:\/\/[^/]+/i, "");
  if (path.length <= 28) return path || url;
  return `${path.slice(0, 12)}…${path.slice(-12)}`;
}

export function KeywordTable({ rows }: { rows: SeoIntelKeyword[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ocean-600">
        No keywords yet. Run <strong>Discover keywords</strong> first.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white shadow-sm">
      <table className="w-full min-w-[960px] border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-ocean-50 text-[10px] uppercase tracking-wide text-ocean-600">
          <tr className="border-b border-ocean-100">
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Keyword</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Intent</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Topic</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Rank</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">URL</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Page</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Top comps</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Gap</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">GSC</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Opp</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-bold">Next step</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const tone = pageMatchTone(k.pageMatchStatus);
            const badge = SEO_INTEL_TONE_CLASS[tone];
            const comps = (k.competitorPreview ?? [])
              .slice(0, 2)
              .map((c) => `${c.domain.replace(/^www\./, "")}#${c.position ?? "?"}`)
              .join(", ");
            const url = k.myUrl || k.existingPageUrl || "";
            const gsc = `${k.impressions ?? "—"}/${k.clicks ?? "—"}/${
              k.ctr != null ? `${(k.ctr * 100).toFixed(1)}%` : "—"
            }`;
            const action = shortAction(k.recommendedAction);
            return (
              <tr
                key={k.id}
                className="border-b border-ocean-50 odd:bg-white even:bg-ocean-50/30 hover:bg-cyan-50/40"
              >
                <td className="max-w-[180px] px-2 py-1 align-middle">
                  <Link
                    href={`/admin/seo-intelligence/keywords/${k.id}`}
                    className="line-clamp-1 font-semibold text-cyan-800 hover:underline"
                    title={k.keyword}
                  >
                    {k.keyword}
                  </Link>
                  <span className="block truncate text-[9px] text-ocean-400">
                    {k.source}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1 align-middle capitalize text-ocean-700">
                  {k.intent.slice(0, 4)}
                </td>
                <td
                  className="max-w-[110px] truncate px-2 py-1 align-middle text-ocean-800"
                  title={`${k.category} · ${k.location}`}
                >
                  {k.category}
                </td>
                <td
                  className="whitespace-nowrap px-2 py-1 align-middle font-bold text-ocean-900"
                  title={
                    k.myPosition == null || k.myPosition <= 0
                      ? "Not ranking"
                      : `Position ${k.myPosition}`
                  }
                >
                  {posLabel(k.myPosition)}
                </td>
                <td
                  className="max-w-[120px] truncate px-2 py-1 align-middle font-mono text-[10px] text-ocean-600"
                  title={url || undefined}
                >
                  {shortUrl(url)}
                </td>
                <td className="whitespace-nowrap px-2 py-1 align-middle">
                  <span
                    className={`inline-flex rounded px-1 py-0.5 text-[9px] font-bold leading-none ${badge.badge}`}
                    title={k.pageMatchNote || pageMatchLabel(k.pageMatchStatus)}
                  >
                    {pageMatchLabel(k.pageMatchStatus)
                      .replace("Correct page exists", "OK")
                      .replace("Related page exists", "Related")
                      .replace("Wrong page ranking", "Wrong")
                      .replace("No page exists", "Missing")
                      .replace("Keyword cannibalisation", "Cannibal")
                      .replace("Weak ranking", "Weak")
                      .replace("Insufficient data", "N/A")
                      .replace("Page not indexed", "No index")}
                  </span>
                </td>
                <td
                  className="max-w-[140px] truncate px-2 py-1 align-middle text-[10px] text-ocean-700"
                  title={comps || "No competitor snapshot"}
                >
                  {comps || "—"}
                </td>
                <td className="whitespace-nowrap px-2 py-1 align-middle">
                  {k.rankingGap != null ? (
                    <span
                      className={
                        k.rankingGap > 0
                          ? "font-bold text-orange-700"
                          : "text-emerald-700"
                      }
                    >
                      {k.rankingGap > 0 ? `+${k.rankingGap}` : k.rankingGap}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  className="whitespace-nowrap px-2 py-1 align-middle font-mono text-[10px] text-ocean-600"
                  title="Impressions / Clicks / CTR"
                >
                  {gsc}
                </td>
                <td className="whitespace-nowrap px-2 py-1 align-middle text-sm font-extrabold text-ocean-900">
                  {k.opportunityScore ?? 0}
                </td>
                <td
                  className="max-w-[150px] truncate px-2 py-1 align-middle text-ocean-700"
                  title={k.recommendedAction}
                >
                  {action}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-ocean-50 px-2 py-1 text-[10px] text-ocean-500">
        Dense view · hover cells for full text · click keyword for details · GSC =
        Imp/Clk/CTR
      </p>
    </div>
  );
}
