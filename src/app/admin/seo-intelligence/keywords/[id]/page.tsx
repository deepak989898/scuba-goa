"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { seoIntelFetch } from "../../admin-fetch";
import type {
  SeoIntelKeyword,
  SeoIntelRankSnapshot,
} from "@/lib/seo-intelligence/types";
import {
  SEO_INTEL_TONE_CLASS,
  pageMatchLabel,
  pageMatchTone,
} from "@/lib/seo-intelligence/ui-priority";

export default function KeywordDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [keyword, setKeyword] = useState<SeoIntelKeyword | null>(null);
  const [snapshots, setSnapshots] = useState<SeoIntelRankSnapshot[]>([]);
  const [disclaimer, setDisclaimer] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await seoIntelFetch(
        `/api/admin/seo-intelligence/keywords/${id}`,
      );
      setKeyword(data.keyword as SeoIntelKeyword);
      setSnapshots((data.snapshots ?? []) as SeoIntelRankSnapshot[]);
      setDisclaimer(String(data.disclaimer ?? ""));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-ocean-600">Loading keyword…</p>;
  }
  if (err || !keyword) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-700">{err || "Not found"}</p>
        <Link
          href="/admin/seo-intelligence/keywords"
          className="text-sm font-semibold text-cyan-800 hover:underline"
        >
          ← Back to keywords
        </Link>
      </div>
    );
  }

  const tone = pageMatchTone(keyword.pageMatchStatus);
  const badge = SEO_INTEL_TONE_CLASS[tone];

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin/seo-intelligence/keywords"
          className="text-xs font-semibold text-cyan-800 hover:underline"
        >
          ← Keyword Rankings
        </Link>
        <h2 className="mt-1 font-display text-xl font-extrabold text-ocean-900">
          {keyword.keyword}
        </h2>
        {disclaimer ? (
          <p className="mt-1 text-xs text-amber-900">{disclaimer}</p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <h3 className="font-bold text-ocean-900">Keyword overview</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-ocean-500">Intent</dt>
              <dd className="capitalize">{keyword.intent}</dd>
            </div>
            <div>
              <dt className="text-xs text-ocean-500">Category</dt>
              <dd>{keyword.category}</dd>
            </div>
            <div>
              <dt className="text-xs text-ocean-500">Location</dt>
              <dd>{keyword.location}</dd>
            </div>
            <div>
              <dt className="text-xs text-ocean-500">Cluster primary</dt>
              <dd className="break-all text-xs">{keyword.primaryKeyword || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ocean-500">Source</dt>
              <dd>{keyword.source}</dd>
            </div>
            <div>
              <dt className="text-xs text-ocean-500">Opportunity</dt>
              <dd className="font-extrabold">{keyword.opportunityScore}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <h3 className="font-bold text-ocean-900">My website</h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div>
              Position:{" "}
              <strong>
                {keyword.myPosition != null ? keyword.myPosition : "Not ranking"}
              </strong>
            </div>
            <div className="break-all">
              URL: {keyword.myUrl || keyword.existingPageUrl || "—"}
            </div>
            <div>
              Impressions {keyword.impressions ?? "—"} · Clicks{" "}
              {keyword.clicks ?? "—"} · CTR{" "}
              {keyword.ctr != null ? `${(keyword.ctr * 100).toFixed(1)}%` : "—"}
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <h3 className="font-bold text-ocean-900">Page match</h3>
          <span
            className={`mt-2 inline-flex rounded px-2 py-0.5 text-xs font-bold ${badge.badge}`}
          >
            {pageMatchLabel(keyword.pageMatchStatus)}
          </span>
          <p className="mt-2 text-sm text-ocean-700">{keyword.pageMatchNote}</p>
          <p className="mt-1 text-xs text-ocean-500">
            Recommended content type: {keyword.recommendedContentType}
          </p>
        </section>

        <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
          <h3 className="font-bold text-ocean-900">Competitor rankings</h3>
          {(keyword.competitorPreview ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-ocean-600">
              No SERP snapshot yet. Use Refresh rankings on the keywords list.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {(keyword.competitorPreview ?? []).map((c) => (
                <li key={`${c.domain}-${c.position}`} className="break-all">
                  <strong>{c.domain}</strong> — position {c.position ?? "—"}
                  {c.url ? (
                    <div className="text-xs text-ocean-500">{c.url}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ocean-500">
            Best competitor: {keyword.bestCompetitorDomain || "—"} (
            {keyword.bestCompetitorPosition ?? "—"}) · Gap{" "}
            {keyword.rankingGap ?? "—"}
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
        <h3 className="font-bold text-ocean-900">Suggested action</h3>
        <p className="mt-1 text-sm text-ocean-800">{keyword.recommendedAction}</p>
        <p className="mt-2 text-xs text-ocean-500">
          Suggestion approve/apply workflow arrives in the next phase. Do not
          treat opportunity score as a guaranteed uplift.
        </p>
      </section>

      <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
        <h3 className="font-bold text-ocean-900">Change history (rank snapshots)</h3>
        {snapshots.length === 0 ? (
          <p className="mt-2 text-sm text-ocean-600">No snapshots yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ocean-50 text-sm">
            {snapshots.map((s) => (
              <li key={s.id} className="py-1.5">
                <span className="font-mono text-[11px] text-ocean-500">
                  {s.checkedAt?.slice(0, 19)?.replace("T", " ")}
                </span>
                <span className="ml-2">
                  Me: {s.myPosition ?? "—"} · Best comp:{" "}
                  {s.competitorPositions?.[0]?.position ?? "—"} (
                  {s.competitorPositions?.[0]?.domain || "—"})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
