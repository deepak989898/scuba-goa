"use client";

import Link from "next/link";
import type { SeoIntelKeyword } from "@/lib/seo-intelligence/types";
import {
  SEO_INTEL_TONE_CLASS,
  pageMatchLabel,
  pageMatchTone,
} from "@/lib/seo-intelligence/ui-priority";

function posLabel(pos: number | null | undefined) {
  if (pos == null || pos <= 0) return "Not ranking";
  return String(Math.round(pos));
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
      <table className="min-w-[1100px] w-full text-left text-sm">
        <thead className="bg-ocean-50 text-[10px] uppercase tracking-wide text-ocean-600">
          <tr>
            <th className="p-2">Keyword</th>
            <th className="p-2">Intent</th>
            <th className="p-2">Topic</th>
            <th className="p-2">My rank</th>
            <th className="p-2">My URL</th>
            <th className="p-2">Page</th>
            <th className="p-2">Comp 1–3</th>
            <th className="p-2">Gap</th>
            <th className="p-2">GSC</th>
            <th className="p-2">Opportunity</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const tone = pageMatchTone(k.pageMatchStatus);
            const badge = SEO_INTEL_TONE_CLASS[tone];
            const comps = k.competitorPreview ?? [];
            return (
              <tr key={k.id} className="border-t border-ocean-50 align-top">
                <td className="p-2">
                  <Link
                    href={`/admin/seo-intelligence/keywords/${k.id}`}
                    className="font-semibold text-cyan-800 hover:underline"
                  >
                    {k.keyword}
                  </Link>
                  <div className="text-[10px] text-ocean-500">{k.source}</div>
                </td>
                <td className="p-2 text-xs capitalize">{k.intent}</td>
                <td className="p-2 text-xs">
                  {k.category}
                  <div className="text-ocean-500">{k.location}</div>
                </td>
                <td className="p-2 font-bold text-ocean-900">
                  {posLabel(k.myPosition)}
                </td>
                <td className="max-w-[160px] break-all p-2 text-xs text-ocean-700">
                  {k.myUrl || k.existingPageUrl || "—"}
                </td>
                <td className="p-2">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.badge}`}
                  >
                    {pageMatchLabel(k.pageMatchStatus)}
                  </span>
                  <div className="mt-0.5 text-[10px] text-ocean-500">
                    {k.existingPageType || k.recommendedContentType}
                  </div>
                </td>
                <td className="p-2 text-[11px] text-ocean-800">
                  {comps.length === 0 ? (
                    <span className="text-ocean-400">—</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {comps.map((c) => (
                        <li key={`${c.domain}-${c.position}`}>
                          <span className="font-semibold">{c.domain}</span> ·{" "}
                          {c.position ?? "—"}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-2 text-xs">
                  {k.rankingGap != null ? (
                    <span
                      className={
                        k.rankingGap > 0 ? "font-bold text-orange-700" : "text-emerald-700"
                      }
                    >
                      {k.rankingGap > 0 ? `+${k.rankingGap}` : k.rankingGap}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2 text-[11px] text-ocean-700">
                  <div>Imp {k.impressions ?? "—"}</div>
                  <div>Clk {k.clicks ?? "—"}</div>
                  <div>
                    CTR{" "}
                    {k.ctr != null ? `${(k.ctr * 100).toFixed(1)}%` : "—"}
                  </div>
                </td>
                <td className="p-2">
                  <span className="font-extrabold text-ocean-900">
                    {k.opportunityScore ?? 0}
                  </span>
                </td>
                <td className="max-w-[200px] p-2 text-[11px] leading-snug text-ocean-700">
                  {k.recommendedAction}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
