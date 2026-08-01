"use client";

import { useCallback, useEffect, useState } from "react";
import { seoIntelFetch } from "./admin-fetch";
import { KeywordTable } from "./KeywordTable";
import type { SeoIntelKeyword } from "@/lib/seo-intelligence/types";

type Props = {
  view: "all" | "gap" | "content-gap" | "opportunities";
  title: string;
  description: string;
};

export function KeywordsView({ view, title, description }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<SeoIntelKeyword[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [intent, setIntent] = useState("");
  const [pageMatch, setPageMatch] = useState("");
  const [disclaimer, setDisclaimer] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ view });
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      if (intent) params.set("intent", intent);
      if (pageMatch) params.set("pageMatch", pageMatch);
      const data = await seoIntelFetch(
        `/api/admin/seo-intelligence/keywords?${params}`,
      );
      setRows((data.keywords ?? []) as SeoIntelKeyword[]);
      setCategories((data.categories ?? []) as string[]);
      setDisclaimer(String(data.disclaimer ?? ""));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [view, q, category, intent, pageMatch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function discover() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/keywords/discover",
        {
          method: "POST",
          body: JSON.stringify({ includeSuggest: true, maxUpserts: 200 }),
        },
      );
      setMsg(
        `Discovery: ${data.discovered} new · ${data.updated} updated · ${data.clusters} clusters · GSC queries ${data.gscQueries}`,
      );
      if (data.errors?.length) {
        setErr(data.errors.slice(0, 3).join(" · "));
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshRanks() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/keywords/refresh",
        { method: "POST", body: JSON.stringify({ limit: 12 }) },
      );
      if (!data.configured) {
        setErr(data.errors?.[0] || "SERP provider not configured");
      } else {
        setMsg(
          `Rankings refreshed: ${data.refreshed} · skipped ${data.skipped}. Opportunity scores estimate potential only — no ranking guarantee.`,
        );
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="font-display text-lg font-bold text-ocean-900">{title}</h2>
        <p className="mt-0.5 text-sm text-ocean-700">{description}</p>
        {disclaimer ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
            {disclaimer}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void discover()}
            className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Run keyword discovery now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void refreshRanks()}
            className="rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Refresh rankings now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-bold text-ocean-800"
          >
            Refresh table
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search keyword / URL"
            className="rounded-lg border border-ocean-200 px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-ocean-200 px-2 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="rounded-lg border border-ocean-200 px-2 py-2 text-sm"
          >
            <option value="">All intents</option>
            <option value="informational">Informational</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
            <option value="navigational">Navigational</option>
            <option value="local">Local</option>
          </select>
          <select
            value={pageMatch}
            onChange={(e) => setPageMatch(e.target.value)}
            className="rounded-lg border border-ocean-200 px-2 py-2 text-sm"
          >
            <option value="">All page match</option>
            <option value="correct_page">Correct page</option>
            <option value="related_page">Related page</option>
            <option value="wrong_page">Wrong page</option>
            <option value="no_page">No page</option>
            <option value="cannibalisation">Cannibalisation</option>
            <option value="weak_ranking">Weak ranking</option>
            <option value="insufficient_data">Insufficient data</option>
          </select>
        </div>

        {err ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="mt-2 text-sm text-emerald-800" role="status">
            {msg}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-ocean-600">Loading keywords…</p>
      ) : (
        <>
          <p className="text-xs text-ocean-500">{rows.length} keywords shown</p>
          <KeywordTable rows={rows} />
        </>
      )}
    </div>
  );
}
