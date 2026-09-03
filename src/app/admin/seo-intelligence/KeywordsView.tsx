"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { seoIntelFetch } from "./admin-fetch";
import { KeywordTable, PAGE_MATCH_SORT_ORDER } from "./KeywordTable";
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
  /** Focus on existing site pages + ranks (Keyword Rankings page only) */
  const [mineMode, setMineMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSort, setPageSort] = useState<"none" | "asc" | "desc">("none");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const activeView = view === "all" && mineMode ? "mine" : view;
  const showGenerateTools =
    (view === "all" || view === "opportunities" || view === "content-gap") &&
    !mineMode;

  const displayRows = useMemo(() => {
    if (pageSort === "none") return rows;
    const order = PAGE_MATCH_SORT_ORDER;
    return [...rows].sort((a, b) => {
      const da = order[a.pageMatchStatus] ?? 99;
      const db = order[b.pageMatchStatus] ?? 99;
      return pageSort === "asc" ? da - db : db - da;
    });
  }, [rows, pageSort]);

  const missingInView = useMemo(
    () => displayRows.filter((k) => k.pageMatchStatus === "no_page"),
    [displayRows],
  );

  const selectedMissingCount = useMemo(
    () =>
      [...selectedIds].filter((id) =>
        missingInView.some((k) => k.id === id),
      ).length,
    [selectedIds, missingInView],
  );

  const load = useCallback(
    async (viewOverride?: string) => {
      setLoading(true);
      setErr(null);
      try {
        const params = new URLSearchParams({
          view: viewOverride || activeView,
        });
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
    },
    [activeView, q, category, intent, pageMatch],
  );

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

  async function refreshRanks(focus: "opportunity" | "owned" = "opportunity") {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/keywords/refresh",
        {
          method: "POST",
          body: JSON.stringify({
            limit: focus === "owned" ? 20 : 12,
            focus,
          }),
        },
      );
      if (!data.configured) {
        setErr(data.errors?.[0] || "SERP provider not configured");
      } else {
        setMsg(
          focus === "owned"
            ? `My website rankings updated: ${data.refreshed} existing keywords checked · skipped ${data.skipped}. Improve these before chasing new keywords. Impact not guaranteed.`
            : `Rankings refreshed: ${data.refreshed} · skipped ${data.skipped}. Opportunity scores estimate potential only — no ranking guarantee.`,
        );
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  /** Switch to owned-keywords view and refresh their SERP positions first. */
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllMissing() {
    const missingIds = missingInView.map((k) => k.id);
    const allSelected =
      missingIds.length > 0 && missingIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of missingIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of missingIds) next.add(id);
        return next;
      });
    }
  }

  function cyclePageSort() {
    setPageSort((s) => (s === "none" ? "asc" : s === "asc" ? "desc" : "none"));
  }

  async function generateBlogs(keywordIds: string[]) {
    const ids = [...new Set(keywordIds)].filter(Boolean);
    if (ids.length === 0) return;

    setBusy(true);
    setErr(null);
    setMsg(`Generating ${ids.length} blog(s) with free stock images…`);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      try {
        const data = await seoIntelFetch(
          "/api/admin/seo-intelligence/keywords/generate-blogs",
          {
            method: "POST",
            body: JSON.stringify({ keywordIds: batch }),
          },
        );
        succeeded += Number(data.succeeded ?? 0);
        failed += Number(data.failed ?? 0);
        for (const r of data.results ?? []) {
          if (!r.ok && r.error) {
            errors.push(`${r.keywordId}: ${r.error}`);
          }
        }
      } catch (e) {
        failed += batch.length;
        errors.push(e instanceof Error ? e.message : "Batch failed");
      }
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setGeneratingId(null);

    if (failed > 0 && errors.length) {
      setErr(errors.slice(0, 3).join(" · "));
    }
    setMsg(
      `Blog generation: ${succeeded} published · ${failed} failed. Keywords removed from this list after success.`,
    );
    setBusy(false);
    await load();
  }

  async function generateOne(id: string) {
    setGeneratingId(id);
    await generateBlogs([id]);
  }

  async function generateSelected() {
    const ids = [...selectedIds].filter((id) =>
      missingInView.some((k) => k.id === id),
    );
    await generateBlogs(ids);
  }

  async function generateAllMissing() {
    await generateBlogs(missingInView.map((k) => k.id));
  }

  async function openMyWebsiteRankings() {
    setMineMode(true);
    setPageMatch("");
    setBusy(true);
    setErr(null);
    setMsg(
      "Loading your existing-page keywords… refreshing SERP positions where possible.",
    );
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/keywords/refresh",
        {
          method: "POST",
          body: JSON.stringify({ limit: 20, focus: "owned" }),
        },
      );
      if (!data.configured) {
        setMsg(
          "Showing existing-page keywords. Set SERPER_API_KEY to refresh live ranks vs competitors.",
        );
        if (data.errors?.[0]) setErr(data.errors[0]);
      } else {
        setMsg(
          `My website rankings: ${data.refreshed} checked · ${data.skipped} skipped. Rows sorted: behind competitors first. Improve these before new keywords.`,
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rank refresh failed");
      setMsg("Showing existing-page keywords with last known ranks.");
    } finally {
      setBusy(false);
      await load("mine");
    }
  }

  const showMineButton = view === "all";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          {mineMode && showMineButton ? "My website rankings" : title}
        </h2>
        <p className="mt-0.5 text-sm text-ocean-700">
          {mineMode && showMineButton
            ? "Existing pages only — your position (colour), competitor positions, and what to improve when they rank higher. Fix these before chasing new keywords."
            : description}
        </p>
        {disclaimer ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
            {disclaimer}
          </p>
        ) : null}

        {mineMode && showMineButton ? (
          <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1.5 text-xs text-teal-950">
            Rank colours:{" "}
            <span className="font-extrabold text-emerald-600">#1–3</span> ·{" "}
            <span className="font-extrabold text-teal-600">#4–10</span> ·{" "}
            <span className="font-extrabold text-amber-600">#11–20</span> ·{" "}
            <span className="font-extrabold text-orange-600">#21–50</span> ·{" "}
            <span className="font-extrabold text-rose-600">#50+</span> ·{" "}
            <span className="font-extrabold text-slate-500">Not ranking</span>.
            Fuchsia competitor = ahead of you. Orange rows = improve first.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {showMineButton ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void openMyWebsiteRankings()}
              className={`rounded-full px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50 ${
                mineMode
                  ? "bg-gradient-to-r from-teal-700 to-cyan-600 ring-2 ring-teal-300"
                  : "bg-gradient-to-r from-teal-600 to-cyan-500"
              }`}
            >
              My website rankings
            </button>
          ) : null}
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
            onClick={() =>
              void refreshRanks(mineMode ? "owned" : "opportunity")
            }
            className="rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {mineMode ? "Refresh my ranks now" : "Refresh rankings now"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-bold text-ocean-800"
          >
            Refresh table
          </button>
          {mineMode && showMineButton ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMineMode(false);
                setMsg(null);
              }}
              className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-bold text-ocean-800"
            >
              Show all keywords
            </button>
          ) : null}
          {showGenerateTools ? (
            <>
              <button
                type="button"
                disabled={busy || selectedMissingCount === 0}
                onClick={() => void generateSelected()}
                className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50"
              >
                Generate selected ({selectedMissingCount})
              </button>
              <button
                type="button"
                disabled={busy || missingInView.length === 0}
                onClick={() => void generateAllMissing()}
                className="rounded-full bg-gradient-to-r from-purple-700 to-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Generate all missing ({missingInView.length})
              </button>
            </>
          ) : null}
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
            {!mineMode ? (
              <option value="no_page">No page</option>
            ) : null}
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
          <p className="text-xs text-ocean-500">
            {displayRows.length} keywords shown
            {mineMode ? " · existing pages only" : ""}
            {showGenerateTools && missingInView.length > 0
              ? ` · ${missingInView.length} missing page`
              : ""}
            {pageSort !== "none" ? " · sorted by Page" : ""}
          </p>
          <KeywordTable
            rows={displayRows}
            mode={mineMode && showMineButton ? "mine" : "default"}
            selectable={showGenerateTools}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllMissing}
            onGenerateOne={showGenerateTools ? (id) => void generateOne(id) : undefined}
            generatingId={generatingId}
            pageSort={pageSort}
            onPageSortClick={showGenerateTools ? cyclePageSort : undefined}
          />
        </>
      )}
    </div>
  );
}
