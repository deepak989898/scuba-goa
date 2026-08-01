"use client";

import { useCallback, useEffect, useState } from "react";
import { seoIntelFetch } from "./admin-fetch";
import type { SeoIntelSuggestion } from "@/lib/seo-intelligence/types";

type Mode = "all" | "open" | "queue" | "applied";

const STATUS_CLASS: Record<string, string> = {
  pending_approval: "border-sky-300 bg-sky-50 text-sky-900",
  edited_by_admin: "border-violet-300 bg-violet-50 text-violet-900",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-900",
  auto_approved: "border-orange-300 bg-orange-50 text-orange-900",
  rejected: "border-slate-300 bg-slate-100 text-slate-700",
  deferred: "border-amber-300 bg-amber-50 text-amber-950",
  applied: "border-emerald-400 bg-emerald-50 text-emerald-900",
  failed: "border-red-300 bg-red-50 text-red-900",
  rolled_back: "border-slate-300 bg-slate-50 text-slate-700",
  applying: "border-cyan-300 bg-cyan-50 text-cyan-900",
};

/** Colour-coded suggestion type for quick admin scan */
const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  update_seo_title: {
    label: "TITLE",
    className: "border-violet-400 bg-violet-100 text-violet-900",
  },
  improve_h1: {
    label: "H1",
    className: "border-violet-400 bg-violet-100 text-violet-900",
  },
  update_meta_description: {
    label: "META",
    className: "border-sky-400 bg-sky-100 text-sky-900",
  },
  add_faqs: {
    label: "FAQ",
    className: "border-amber-400 bg-amber-100 text-amber-950",
  },
  add_internal_links: {
    label: "LINKS",
    className: "border-teal-400 bg-teal-100 text-teal-900",
  },
  expand_content: {
    label: "CONTENT",
    className: "border-cyan-400 bg-cyan-100 text-cyan-900",
  },
  create_blog: {
    label: "NEW BLOG",
    className: "border-emerald-400 bg-emerald-100 text-emerald-900",
  },
  create_service_page: {
    label: "NEW SERVICE",
    className: "border-orange-400 bg-orange-100 text-orange-950",
  },
  fix_cannibalisation: {
    label: "CANNIBAL",
    className: "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-900",
  },
  add_faq_schema: {
    label: "FAQ SCHEMA",
    className: "border-amber-400 bg-amber-100 text-amber-950",
  },
  improve_ctr: {
    label: "CTR",
    className: "border-rose-400 bg-rose-100 text-rose-900",
  },
};

const MANUAL_ONLY_TYPES = new Set([
  "create_service_page",
  "fix_cannibalisation",
  "consolidate_pages",
  "improve_url",
  "fix_canonical",
]);

function typeBadge(type: string) {
  return (
    TYPE_BADGE[type] ?? {
      label: type.replace(/_/g, " ").toUpperCase(),
      className: "border-slate-300 bg-slate-100 text-slate-800",
    }
  );
}

export function SuggestionsPanel({
  mode,
  title,
  description,
}: {
  mode: Mode;
  title: string;
  description: string;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<SeoIntelSuggestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const status =
        mode === "queue" || mode === "open" || mode === "all"
          ? "open"
          : mode === "applied"
            ? "applied"
            : "open";
      const data = await seoIntelFetch(
        `/api/admin/seo-intelligence/suggestions?status=${status}`,
      );
      // Never keep successfully applied items on Suggestions / Approval Queue
      const list = ((data.suggestions ?? []) as SeoIntelSuggestion[]).filter(
        (s) => s.status !== "applied" && s.status !== "rolled_back",
      );
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/suggestions/generate",
        {
          method: "POST",
          body: JSON.stringify({ limitKeywords: 40 }),
        },
      );
      setMsg(
        `Generated ${data.created} · skipped ${data.skipped} · auto-approved ${data.autoApproved}` +
          (data.processed
            ? ` · auto-applied ${data.processed.applied}`
            : ""),
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function decide(
    id: string,
    decision: "reject" | "defer",
  ) {
    setBusy(true);
    setErr(null);
    try {
      const rejectionReason =
        decision === "reject"
          ? window.prompt("Rejection reason (optional)") || undefined
          : undefined;
      await seoIntelFetch(`/api/admin/seo-intelligence/suggestions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, rejectionReason }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  /** One click: Approve → Apply (no second Apply step). */
  async function approveAndApply(s: SeoIntelSuggestion) {
    const badge = typeBadge(s.type);
    const canAutoApply = Boolean(s.proposedPatch) && !MANUAL_ONLY_TYPES.has(s.type);

    if (canAutoApply) {
      if (
        !confirm(
          `Approve & apply this ${badge.label} change for “${s.keyword}”?\n\nTarget: ${s.targetUrl || "—"}\nA rollback snapshot will be saved. Ranking impact is not guaranteed.`,
        )
      ) {
        return;
      }
    } else if (
      !confirm(
        `Approve this ${badge.label} suggestion for “${s.keyword}”?\n\nThis type needs manual CMS work — it will not auto-apply to the live page.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await seoIntelFetch(`/api/admin/seo-intelligence/suggestions/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "approve" }),
      });

      if (!canAutoApply) {
        setMsg(
          `Approved ${badge.label} — apply manually in CMS (not auto-applicable).`,
        );
        await load();
        return;
      }

      await seoIntelFetch(
        `/api/admin/seo-intelligence/suggestions/${s.id}/apply`,
        { method: "POST" },
      );
      setMsg(
        `Approved & applied ${badge.label} for “${s.keyword}”. Moved to Applied Changes.`,
      );
      setRows((prev) => prev.filter((row) => row.id !== s.id));
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approve/apply failed");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setErr(null);
    try {
      let proposedPatch: Record<string, unknown> | null | undefined;
      try {
        const parsed = JSON.parse(editValue) as unknown;
        if (parsed && typeof parsed === "object") {
          proposedPatch = parsed as Record<string, unknown>;
        }
      } catch {
        proposedPatch = undefined;
      }
      await seoIntelFetch(`/api/admin/seo-intelligence/suggestions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          proposedValue: editValue,
          adminNotes: editNotes,
          ...(proposedPatch ? { proposedPatch } : {}),
        }),
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="font-display text-lg font-bold text-ocean-900">{title}</h2>
        <p className="mt-0.5 text-sm text-ocean-700">{description}</p>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          Colour badges show suggestion type (TITLE, META, FAQ, LINKS…).{" "}
          <strong>Approve &amp; Apply</strong> does both in one click. Ranking
          impact is not guaranteed. Rollback is available under Applied Changes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Generate suggestions now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-bold text-ocean-800"
          >
            Refresh
          </button>
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
        <p className="text-sm text-ocean-600">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ocean-600">
          No suggestions yet. Run keyword discovery first, then generate
          suggestions.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(() => {
                      const tb = typeBadge(s.type);
                      return (
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-extrabold tracking-wide ${tb.className}`}
                        >
                          {tb.label}
                        </span>
                      );
                    })()}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_CLASS[s.status] || STATUS_CLASS.pending_approval}`}
                    >
                      {s.status}
                      {s.autoApproved ? " · auto" : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 font-semibold text-ocean-900">
                    Keyword:{" "}
                    <span className="text-cyan-800">{s.keyword}</span>
                  </p>
                  <p className="mt-0.5 break-all text-xs text-ocean-500">
                    {s.targetUrl || "—"} · conf {s.confidence}% · {s.risk} risk ·{" "}
                    {s.priority}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-sm text-ocean-800">{s.reason}</p>
              <p className="mt-1 text-xs text-ocean-600">{s.expectedBenefit}</p>
              <p className="mt-1 text-xs text-ocean-500">
                Competitors: {s.competitorComparison}
              </p>

              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                <div className="rounded-lg border border-ocean-100 bg-ocean-50/50 p-2">
                  <p className="text-[10px] font-bold uppercase text-ocean-500">
                    Current
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-ocean-800">
                    {s.currentValue || "—"}
                  </pre>
                </div>
                <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-2">
                  <p className="text-[10px] font-bold uppercase text-cyan-700">
                    Proposed
                  </p>
                  {editingId === s.id ? (
                    <>
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={8}
                        className="mt-1 w-full rounded border border-ocean-200 p-2 text-xs"
                      />
                      <input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Admin notes"
                        className="mt-1 w-full rounded border border-ocean-200 px-2 py-1 text-xs"
                      />
                    </>
                  ) : (
                    <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-ocean-900">
                      {s.proposedValue || "—"}
                    </pre>
                  )}
                </div>
              </div>

              {s.applyError ? (
                <p className="mt-2 text-xs text-red-700">{s.applyError}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {editingId === s.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveEdit(s.id)}
                      className="rounded bg-ocean-800 px-2.5 py-1 text-[10px] font-bold text-white"
                    >
                      Save edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      className="rounded border border-ocean-200 px-2.5 py-1 text-[10px] font-bold"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {["pending_approval", "edited_by_admin", "deferred"].includes(
                      s.status,
                    ) ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void approveAndApply(s)}
                          className="rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white"
                        >
                          {s.proposedPatch && !MANUAL_ONLY_TYPES.has(s.type)
                            ? "Approve & Apply"
                            : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(s.id, "reject")}
                          className="rounded bg-slate-500 px-2.5 py-1 text-[10px] font-bold text-white"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(s.id, "defer")}
                          className="rounded bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-white"
                        >
                          Defer
                        </button>
                      </>
                    ) : null}
                    {["approved", "auto_approved"].includes(s.status) &&
                    s.proposedPatch &&
                    !MANUAL_ONLY_TYPES.has(s.type) ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void approveAndApply(s)}
                        className="rounded bg-cyan-700 px-2.5 py-1.5 text-[11px] font-extrabold text-white"
                      >
                        Apply now
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(s.id);
                        setEditValue(
                          s.proposedPatch
                            ? JSON.stringify(s.proposedPatch, null, 2)
                            : s.proposedValue,
                        );
                        setEditNotes(s.adminNotes || "");
                      }}
                      className="rounded border border-ocean-200 px-2.5 py-1 text-[10px] font-bold text-ocean-800"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
