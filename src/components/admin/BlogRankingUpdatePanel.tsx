"use client";

import { useCallback, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BlogFaq } from "@/data/blog/post-types";
import type {
  RankingImproveFields,
  RankingImproveMeta,
} from "@/lib/gsc-indexing-agent/ranking-improve";

type SuggestPayload = {
  slug: string;
  urlId: string | null;
  current: RankingImproveFields;
  suggestion: RankingImproveFields;
  previewImprove: RankingImproveMeta;
  lastImprove: RankingImproveMeta | null;
  imageSuggestions: string[];
  blogUpdatedAt: string | null;
  guidance: { headline: string; bullets: string[]; color: string };
  gsc: {
    rankingStatus: string;
    averagePosition: number;
    impressions: number;
    clicks: number;
  };
};

type Props = {
  slug: string;
  /** Last improve from GSC row (may be empty until suggest loads). */
  lastImproveHint?: RankingImproveMeta | null;
  onClose: () => void;
  onApplied: () => void;
};

async function authToken(): Promise<string> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Sign in at /admin/login first.");
  await auth.currentUser.getIdToken(true);
  return auth.currentUser.getIdToken();
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FieldDiff({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  const changed = before.trim() !== after.trim();
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        changed ? "border-amber-200 bg-amber-50/50" : "border-slate-100 bg-white"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
        {changed ? (
          <span className="ml-1 text-amber-700">· changed</span>
        ) : (
          <span className="ml-1 text-slate-400">· same</span>
        )}
      </p>
      {changed ? (
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold text-rose-700">Current</p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">
              {before || "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-emerald-700">Suggested</p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-800">
              {after || "—"}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-slate-600">
          {after || "—"}
        </p>
      )}
    </div>
  );
}

function faqsSummary(faqs: BlogFaq[]): string {
  if (!faqs?.length) return "(no FAQs)";
  return faqs.map((f, i) => `${i + 1}. ${f.question}`).join("\n");
}

export function BlogRankingUpdatePanel({
  slug,
  lastImproveHint,
  onClose,
  onApplied,
}: Props) {
  const [busy, setBusy] = useState<"suggest" | "apply" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SuggestPayload | null>(null);

  const runSuggest = useCallback(async () => {
    setBusy("suggest");
    setErr(null);
    try {
      const token = await authToken();
      const res = await fetch("/api/admin/blog-automation/ranking-update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "suggest", slug }),
      });
      const json = (await res.json()) as SuggestPayload & { error?: string };
      if (!res.ok) throw new Error(json.error || "Suggest failed");
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Suggest failed");
    } finally {
      setBusy(null);
    }
  }, [slug]);

  const runApply = useCallback(async () => {
    if (!data?.suggestion) return;
    const ok = window.confirm(
      `Apply ranking update to /blog/${slug}?\n\n` +
        `This will update title, meta, excerpt, keywords, content, and FAQs.\n` +
        `Images will NOT change.\n\n` +
        `Estimated uplift ~${data.previewImprove.estimatedPct}% (not a Google guarantee).`,
    );
    if (!ok) return;

    setBusy("apply");
    setErr(null);
    try {
      const token = await authToken();
      const res = await fetch("/api/admin/blog-automation/ranking-update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "apply",
          slug,
          fields: data.suggestion,
        }),
      });
      const json = (await res.json()) as { error?: string; improve?: RankingImproveMeta };
      if (!res.ok) throw new Error(json.error || "Apply failed");
      onApplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(null);
    }
  }, [data, onApplied, slug]);

  const last = data?.lastImprove ?? lastImproveHint ?? null;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-700">
            Ranking update · suggest first
          </p>
          <h3 className="font-display text-base font-bold text-ocean-900">
            /blog/{slug}
          </h3>
          <p className="mt-0.5 text-xs text-ocean-700">
            AI suggests title, meta, content, FAQs + image tips. Nothing is saved until
            you click <strong>Apply update</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-white bg-white/90 p-2.5 text-xs">
          <p className="font-bold text-slate-600">Last applied update</p>
          {last ? (
            <>
              <p className="mt-1 text-ocean-900">
                {formatWhen(last.at)} · ~{last.estimatedPct}% est
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
                Target: {last.targetBand}
              </p>
              <p className="mt-1 line-clamp-3 text-[11px] text-slate-700">
                {last.summary}
              </p>
            </>
          ) : (
            <p className="mt-1 text-slate-500">No ranking update applied yet.</p>
          )}
        </div>
        <div className="rounded-lg border border-white bg-white/90 p-2.5 text-xs">
          <p className="font-bold text-slate-600">Blog updatedAt</p>
          <p className="mt-1 text-ocean-900">
            {formatWhen(data?.blogUpdatedAt ?? null)}
          </p>
          {data ? (
            <p className="mt-1 text-[11px] text-slate-600">
              GSC: {data.gsc.rankingStatus} · pos{" "}
              {data.gsc.averagePosition
                ? data.gsc.averagePosition.toFixed(1)
                : "—"}{" "}
              · {data.gsc.impressions} imp · {data.gsc.clicks} clk
            </p>
          ) : (
            <p className="mt-1 text-slate-500">
              Click Generate suggestions to load GSC context.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-white bg-white/90 p-2.5 text-xs sm:col-span-2 lg:col-span-1">
          <p className="font-bold text-slate-600">How this can help GSC</p>
          {data ? (
            <>
              <p className="mt-1 font-bold text-emerald-800">
                ~{data.previewImprove.estimatedPct}% estimated uplift
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Toward: {data.previewImprove.targetBand}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-700">
                {data.previewImprove.summary}
              </p>
            </>
          ) : (
            <p className="mt-1 text-slate-500">
              Heuristic estimate (not a Google guarantee) appears after suggest.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void runSuggest()}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-violet-600 disabled:opacity-60"
        >
          {busy === "suggest" ? "Generating suggestions…" : "Generate suggestions"}
        </button>
        {data ? (
          <>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void runApply()}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
            >
              {busy === "apply" ? "Applying…" : "Apply update"}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => setData(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Discard suggestions
            </button>
          </>
        ) : null}
      </div>

      {err ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
          {err}
        </p>
      ) : null}

      {data ? (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-violet-800">
            Review suggestions (yellow = changed)
          </p>
          <FieldDiff
            label="Title"
            before={data.current.title}
            after={data.suggestion.title}
          />
          <FieldDiff
            label="Meta title"
            before={data.current.metaTitle}
            after={data.suggestion.metaTitle}
          />
          <FieldDiff
            label="Meta description"
            before={data.current.metaDescription}
            after={data.suggestion.metaDescription}
          />
          <FieldDiff
            label="Excerpt"
            before={data.current.excerpt}
            after={data.suggestion.excerpt}
          />
          <FieldDiff
            label="Keywords"
            before={data.current.keywords.join(", ")}
            after={data.suggestion.keywords.join(", ")}
          />
          <FieldDiff
            label="FAQs"
            before={faqsSummary(data.current.faqs)}
            after={faqsSummary(data.suggestion.faqs)}
          />
          <FieldDiff
            label="Content (preview)"
            before={data.current.content.slice(0, 900)}
            after={data.suggestion.content.slice(0, 900)}
          />

          <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
              Image suggestions (manual only — Apply will not change images)
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-sky-950">
              {data.imageSuggestions.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-ocean-100 bg-white p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ocean-700">
              Checklist
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-ocean-800">
              {data.previewImprove.checklist.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
