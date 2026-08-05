"use client";

import { useCallback, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { AdminCollapseSection } from "@/components/admin/AdminCollapseSection";
import type { RankingImproveFields } from "@/lib/gsc-indexing-agent/ranking-improve";
import type {
  PendingBlogItem,
  PendingDiagnoseResult,
} from "@/lib/gsc-indexing-agent/pending-index-optimize";

type SuggestPayload = {
  diagnose: PendingDiagnoseResult;
  fields: RankingImproveFields;
  current: RankingImproveFields;
  improve: { estimatedPct: number; targetBand: string; summary: string };
};

async function adminFetch(path: string, init?: RequestInit) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Sign in at /admin/login first.");
  const token = await auth.currentUser.getIdToken(true);
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

type Props = {
  onDone?: () => void;
};

export function PendingIndexOptimizerPanel({ onDone }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [items, setItems] = useState<PendingBlogItem[]>([]);
  const [quota, setQuota] = useState<{
    used: number;
    daily: number;
    remaining: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [diagnose, setDiagnose] = useState<PendingDiagnoseResult | null>(null);
  const [suggest, setSuggest] = useState<SuggestPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        { method: "POST", body: JSON.stringify({ action: "list" }) },
      );
      setItems(data.items ?? []);
      setQuota(data.inspectionQuota ?? null);
      setHasLoaded(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load pending blogs");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleOpenChange(open: boolean) {
    setExpanded(open);
    if (open && !hasLoaded && !loading) {
      void load();
    }
  }

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(items.map((i) => i.slug)));
  }

  async function runDiagnose(slug: string) {
    setBusy(`diagnose:${slug}`);
    setErr(null);
    setMsg(null);
    setActiveSlug(slug);
    setSuggest(null);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        {
          method: "POST",
          body: JSON.stringify({ action: "diagnose", slug }),
        },
      );
      setDiagnose(data.diagnose);
      setMsg(`SEO score ${data.diagnose.seo.score}/100 for ${slug}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Diagnose failed");
    } finally {
      setBusy(null);
    }
  }

  async function runSuggest(slug: string) {
    setBusy(`suggest:${slug}`);
    setErr(null);
    setMsg(null);
    setActiveSlug(slug);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        {
          method: "POST",
          body: JSON.stringify({ action: "suggest", slug }),
        },
      );
      setDiagnose(data.diagnose);
      setSuggest({
        diagnose: data.diagnose,
        fields: data.fields,
        current: data.current,
        improve: data.improve,
      });
      setMsg(
        `AI suggestions ready (~${data.improve.estimatedPct}% est. uplift). Review then Apply.`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Suggest failed");
    } finally {
      setBusy(null);
    }
  }

  async function runApply() {
    if (!suggest || !activeSlug) return;
    setBusy("apply");
    setErr(null);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        {
          method: "POST",
          body: JSON.stringify({
            action: "apply",
            slug: activeSlug,
            fields: suggest.fields,
          }),
        },
      );
      setDiagnose(data.diagnose);
      setSuggest(null);
      setMsg(
        `Applied AI improvements. New SEO score ${data.diagnose.seo.score}/100. Now queue re-inspect.`,
      );
      onDone?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(null);
    }
  }

  async function runReinspect(slugs: string[]) {
    if (!slugs.length) return;
    setBusy("reinspect");
    setErr(null);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        {
          method: "POST",
          body: JSON.stringify({
            action: "reinspect",
            slugs,
            immediate: true,
          }),
        },
      );
      setMsg(
        `Queued ${data.queued?.length ?? 0} · inspected ${data.inspected?.length ?? 0}. ${data.note ?? ""}`,
      );
      onDone?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Re-inspect failed");
    } finally {
      setBusy(null);
    }
  }

  async function runAuto(slug: string) {
    setBusy(`auto:${slug}`);
    setErr(null);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        {
          method: "POST",
          body: JSON.stringify({ action: "auto", slug }),
        },
      );
      setDiagnose(data.diagnoseAfter);
      setMsg(
        `Auto done for ${slug}: SEO ${data.diagnoseBefore.seo.score} → ${data.diagnoseAfter.seo.score}. Index status refreshed via URL Inspection.`,
      );
      onDone?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Auto optimize failed");
    } finally {
      setBusy(null);
    }
  }

  async function runAutoBatch() {
    setBusy("autoBatch");
    setErr(null);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        {
          method: "POST",
          body: JSON.stringify({ action: "autoBatch", max: 3 }),
        },
      );
      const okN = (data.results ?? []).filter((r: { ok: boolean }) => r.ok)
        .length;
      setMsg(
        `Auto-batch finished: ${okN}/${(data.results ?? []).length} blogs. ${data.note ?? ""}`,
      );
      onDone?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Auto-batch failed");
    } finally {
      setBusy(null);
    }
  }

  async function runAiFixSelected(slugs: string[]) {
    if (!slugs.length) return;
    const capped = slugs.slice(0, 10);
    setBusy("aiFixSelected");
    setErr(null);
    setMsg(null);
    try {
      const data = await adminFetch(
        "/api/admin/blog-automation/pending-index",
        {
          method: "POST",
          body: JSON.stringify({
            action: "autoBatch",
            slugs: capped,
            max: capped.length,
          }),
        },
      );
      const results = (data.results ?? []) as Array<{
        ok: boolean;
        slug: string;
        error?: string;
      }>;
      const okN = results.filter((r) => r.ok).length;
      const failN = results.length - okN;
      setMsg(
        `AI fix selected: ${okN} ok${failN ? ` · ${failN} failed` : ""}${
          slugs.length > 10 ? " (first 10 only)" : ""
        }. ${data.note ?? ""}`,
      );
      if (failN) {
        const failed = results
          .filter((r) => !r.ok)
          .map((r) => `${r.slug}: ${r.error ?? "failed"}`)
          .slice(0, 3)
          .join(" · ");
        setErr(failed || "Some selected blogs failed AI fix");
      }
      setSelected(new Set());
      onDone?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "AI fix selected failed");
    } finally {
      setBusy(null);
    }
  }

  const selectedList = [...selected];
  const collapseHint = hasLoaded
    ? items.length === 0
      ? "No pending / not-indexed blogs right now"
      : `${items.length} need attention · select many → AI fix together`
    : "SEO score, AI title/meta/FAQ, then URL Inspection — expand when needed";

  return (
    <AdminCollapseSection
      title="Pending Index Optimizer AI"
      hint={collapseHint}
      defaultOpen={false}
      onOpenChange={handleOpenChange}
      className="border-amber-200 open:border-amber-300 open:ring-amber-100"
      badge={
        hasLoaded && items.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-900">
            {items.length}
          </span>
        ) : null
      }
    >
      {!expanded ? null : (
        <>
      <p className="max-w-2xl text-xs text-ocean-700">
        Pending / not-indexed blogs: SEO score, internal links, title/meta/FAQ
        AI, schema check, then <strong>URL Inspection</strong> refresh.
        Google does <strong>not</strong> allow Indexing API for blogs — we
        optimize crawl signals + re-check status (quota limited). Select all or
        multiple rows, then use <strong>AI fix selected</strong>.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void load()}
            disabled={!!busy || loading}
            className="rounded-full border border-ocean-200 bg-white px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-50 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void runAiFixSelected(selectedList)}
            disabled={!!busy || loading || selectedList.length === 0}
            className="rounded-full bg-violet-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-violet-800 disabled:opacity-50"
            title="Apply AI improvements to all selected blogs (up to 10)"
          >
            {busy === "aiFixSelected"
              ? "AI fixing…"
              : `AI fix selected (${selectedList.length})`}
          </button>
          <button
            type="button"
            onClick={() => void runAutoBatch()}
            disabled={!!busy || loading || items.length === 0}
            className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
          >
            Auto-optimize top 3
          </button>
          <button
            type="button"
            onClick={() => void runReinspect(selectedList)}
            disabled={!!busy || selectedList.length === 0}
            className="rounded-full bg-ocean-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-ocean-900 disabled:opacity-50"
          >
            Re-inspect selected ({selectedList.length})
          </button>
      </div>

      {quota ? (
        <p className="mt-2 text-[11px] text-ocean-600">
          Inspection quota today:{" "}
          <strong className="tabular-nums">
            {quota.used}/{quota.daily}
          </strong>{" "}
          used · {quota.remaining} left
        </p>
      ) : null}

      {err ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {msg}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm text-ocean-600">Loading pending blogs…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-emerald-800">
          No pending / not-indexed published blogs in GSC inventory. Nice.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-ocean-100 bg-white">
          <div className="flex items-center gap-2 border-b border-ocean-50 px-2 py-1.5 text-[11px]">
            <button
              type="button"
              className="font-semibold text-ocean-700 underline"
              onClick={selectAll}
            >
              Select all
            </button>
            <button
              type="button"
              className="font-semibold text-ocean-500 underline"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
            <span className="text-ocean-500">
              {items.length} need attention
              {selectedList.length > 0
                ? ` · ${selectedList.length} selected`
                : ""}
            </span>
          </div>
          <table className="min-w-full text-left text-xs">
            <thead className="bg-ocean-50/80 text-[10px] uppercase tracking-wide text-ocean-600">
              <tr>
                <th className="px-2 py-1.5"> </th>
                <th className="px-2 py-1.5">Slug</th>
                <th className="px-2 py-1.5">Status</th>
                <th className="px-2 py-1.5">Why</th>
                <th className="px-2 py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.slug} className="border-t border-ocean-50">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(row.slug)}
                      onChange={() => toggle(row.slug)}
                      aria-label={`Select ${row.slug}`}
                    />
                  </td>
                  <td className="max-w-[12rem] px-2 py-1.5">
                    <p className="truncate font-mono text-[11px] text-ocean-800">
                      {row.slug}
                    </p>
                    <p className="truncate text-[10px] text-ocean-500">
                      {row.title}
                    </p>
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={
                        row.indexLabel === "pending"
                          ? "rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                          : "rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800"
                      }
                    >
                      {row.indexLabel === "pending" ? "Pending" : "Not idx"}
                    </span>
                  </td>
                  <td className="max-w-[14rem] px-2 py-1.5 text-[10px] text-ocean-600">
                    <span className="line-clamp-2" title={row.why}>
                      {row.why}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void runDiagnose(row.slug)}
                        className="text-[10px] font-bold text-sky-700 underline disabled:opacity-40"
                      >
                        Score
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void runSuggest(row.slug)}
                        className="text-[10px] font-bold text-violet-700 underline disabled:opacity-40"
                      >
                        AI fix
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void runAuto(row.slug)}
                        className="text-[10px] font-bold text-orange-700 underline disabled:opacity-40"
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void runReinspect([row.slug])}
                        className="text-[10px] font-bold text-ocean-800 underline disabled:opacity-40"
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {diagnose && activeSlug ? (
        <div className="mt-3 rounded-lg border border-ocean-100 bg-white p-3">
          <p className="text-xs font-bold text-ocean-900">
            Diagnose · {activeSlug} · SEO score{" "}
            <span className="tabular-nums text-orange-600">
              {diagnose.seo.score}/100
            </span>
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {diagnose.seo.checks.map((c) => (
              <li
                key={c.id}
                className={`rounded px-2 py-1 text-[11px] ${
                  c.ok
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-800"
                }`}
              >
                {c.ok ? "✓" : "✗"} {c.label}
                {c.detail ? (
                  <span className="opacity-80"> — {c.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-2 grid gap-2 text-[11px] text-ocean-700 sm:grid-cols-2">
            <p>
              <strong>Schema:</strong> {diagnose.schema.detail}
            </p>
            <p>
              <strong>Internal links missing:</strong>{" "}
              {diagnose.internalLinks.missingSuggested.join(", ") || "none"}
            </p>
            <p>
              <strong>FAQs:</strong> {diagnose.faqCount}
            </p>
            <p>
              <strong>Index:</strong> {diagnose.indexStatus} — {diagnose.why}
            </p>
          </div>
          {diagnose.internalLinks.markdownSuggestions.length > 0 ? (
            <p className="mt-2 rounded bg-ocean-50 px-2 py-1.5 font-mono text-[10px] text-ocean-800">
              Suggested links:{" "}
              {diagnose.internalLinks.markdownSuggestions.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {suggest ? (
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
          <p className="text-xs font-bold text-violet-900">
            AI suggestions (~{suggest.improve.estimatedPct}% ·{" "}
            {suggest.improve.targetBand})
          </p>
          <p className="mt-1 text-[11px] text-violet-800">
            {suggest.improve.summary}
          </p>
          <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
            <div>
              <p className="font-semibold text-ocean-700">New title</p>
              <p className="text-ocean-900">{suggest.fields.title}</p>
            </div>
            <div>
              <p className="font-semibold text-ocean-700">New meta</p>
              <p className="text-ocean-900">{suggest.fields.metaDescription}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-ocean-700">
                FAQs ({suggest.fields.faqs?.length ?? 0})
              </p>
              <ul className="mt-1 list-disc pl-4 text-ocean-800">
                {(suggest.fields.faqs ?? []).slice(0, 4).map((f) => (
                  <li key={f.question}>{f.question}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void runApply()}
              className="rounded-full bg-violet-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              Apply AI fix
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setSuggest(null)}
              className="rounded-full border border-ocean-200 bg-white px-3 py-1.5 text-xs font-bold text-ocean-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {busy ? (
        <p className="mt-2 text-xs font-medium text-amber-800">Working: {busy}…</p>
      ) : null}
        </>
      )}
    </AdminCollapseSection>
  );
}
