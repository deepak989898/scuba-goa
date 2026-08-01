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

function canAutoApplySuggestion(s: SeoIntelSuggestion): boolean {
  return Boolean(s.proposedPatch) && !MANUAL_ONLY_TYPES.has(s.type);
}

function isActionable(s: SeoIntelSuggestion): boolean {
  return [
    "pending_approval",
    "edited_by_admin",
    "deferred",
    "approved",
    "auto_approved",
  ].includes(s.status);
}

/** Colour our SERP position for quick admin scan */
function ourRankStyle(pos: number | null | undefined): {
  label: string;
  className: string;
} {
  if (pos == null || pos <= 0) {
    return {
      label: "Not ranking",
      className: "font-extrabold text-slate-500",
    };
  }
  const n = Math.round(pos);
  if (n <= 3) {
    return {
      label: `#${n}`,
      className: "font-extrabold text-emerald-600",
    };
  }
  if (n <= 10) {
    return {
      label: `#${n}`,
      className: "font-extrabold text-teal-600",
    };
  }
  if (n <= 20) {
    return {
      label: `#${n}`,
      className: "font-extrabold text-amber-600",
    };
  }
  if (n <= 50) {
    return {
      label: `#${n}`,
      className: "font-extrabold text-orange-600",
    };
  }
  return {
    label: `#${n}`,
    className: "font-extrabold text-rose-600",
  };
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
      const raw = (data.suggestions ?? []) as SeoIntelSuggestion[];
      // Never keep successfully applied items on Suggestions / Approval Queue
      const list =
        mode === "applied"
          ? raw
          : raw.filter(
              (s) => s.status !== "applied" && s.status !== "rolled_back",
            );
      setRows(list);
      setSelected(new Set());
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

  async function runApproveApply(
    s: SeoIntelSuggestion,
  ): Promise<{ ok: true; applied: boolean } | { ok: false; error: string }> {
    const canAutoApply = canAutoApplySuggestion(s);
    try {
      if (
        ["pending_approval", "edited_by_admin", "deferred"].includes(s.status)
      ) {
        await seoIntelFetch(`/api/admin/seo-intelligence/suggestions/${s.id}`, {
          method: "PATCH",
          body: JSON.stringify({ decision: "approve" }),
        });
      }
      if (!canAutoApply) {
        return { ok: true, applied: false };
      }
      await seoIntelFetch(
        `/api/admin/seo-intelligence/suggestions/${s.id}/apply`,
        { method: "POST" },
      );
      return { ok: true, applied: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Approve/apply failed",
      };
    }
  }

  /** One click: Approve → Apply (no second Apply step). */
  async function approveAndApply(s: SeoIntelSuggestion) {
    const badge = typeBadge(s.type);
    const canAutoApply = canAutoApplySuggestion(s);

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
      const result = await runApproveApply(s);
      if (!result.ok) {
        setErr(result.error);
        await load();
        return;
      }
      if (!result.applied) {
        setMsg(
          `Approved ${badge.label} — apply manually in CMS (not auto-applicable).`,
        );
      } else {
        setMsg(
          `Approved & applied ${badge.label} for “${s.keyword}”. Moved to Applied Changes.`,
        );
        setRows((prev) => prev.filter((row) => row.id !== s.id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(s.id);
          return next;
        });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllActionable() {
    setSelected(
      new Set(rows.filter(isActionable).map((s) => s.id)),
    );
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkApproveAndApply() {
    const picked = rows.filter((s) => selected.has(s.id) && isActionable(s));
    if (picked.length === 0) {
      setErr("Select at least one suggestion.");
      return;
    }
    const autoCount = picked.filter(canAutoApplySuggestion).length;
    const manualCount = picked.length - autoCount;
    if (
      !confirm(
        `Approve & apply ${picked.length} selected suggestion(s)?\n\n` +
          `• ${autoCount} will apply automatically\n` +
          `• ${manualCount} manual-only (approve only, no live apply)\n\n` +
          `Rollback snapshots are saved. Ranking impact is not guaranteed.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);
    let applied = 0;
    let approvedOnly = 0;
    let failed = 0;
    const errors: string[] = [];
    const appliedIds: string[] = [];

    for (const s of picked) {
      const result = await runApproveApply(s);
      if (!result.ok) {
        failed += 1;
        errors.push(`${s.keyword}: ${result.error}`);
        continue;
      }
      if (result.applied) {
        applied += 1;
        appliedIds.push(s.id);
      } else {
        approvedOnly += 1;
      }
    }

    setRows((prev) => prev.filter((r) => !appliedIds.includes(r.id)));
    setSelected(new Set());
    setMsg(
      `Bulk done: ${applied} applied · ${approvedOnly} approved-only · ${failed} failed. Applied items moved to Applied Changes.`,
    );
    if (errors.length) {
      setErr(errors.slice(0, 5).join(" · "));
    }
    await load();
    setBusy(false);
  }

  async function bulkReject() {
    const picked = rows.filter((s) => selected.has(s.id));
    if (picked.length === 0) {
      setErr("Select at least one suggestion.");
      return;
    }
    if (!confirm(`Reject ${picked.length} selected suggestion(s)?`)) return;
    setBusy(true);
    setErr(null);
    try {
      for (const s of picked) {
        await seoIntelFetch(`/api/admin/seo-intelligence/suggestions/${s.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            decision: "reject",
            rejectionReason: "Bulk rejected by admin",
          }),
        });
      }
      setMsg(`Rejected ${picked.length} suggestion(s).`);
      setSelected(new Set());
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk reject failed");
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
          Colour badges show type (TITLE, META, FAQ, LINKS…). Use checkboxes +{" "}
          <strong>Approve &amp; Apply selected</strong> for bulk. Ranking impact
          is not guaranteed. Rollback under Applied Changes.
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
        <div className="space-y-3">
          <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-ocean-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ocean-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-ocean-700"
                checked={
                  rows.filter(isActionable).length > 0 &&
                  rows.filter(isActionable).every((s) => selected.has(s.id))
                }
                onChange={(e) => {
                  if (e.target.checked) selectAllActionable();
                  else clearSelection();
                }}
              />
              Select all
            </label>
            <span className="text-xs text-ocean-500">
              {selected.size} selected
            </span>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => void bulkApproveAndApply()}
              className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white disabled:opacity-50"
            >
              Approve &amp; Apply selected
            </button>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => void bulkReject()}
              className="rounded-full bg-slate-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              Reject selected
            </button>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={clearSelection}
              className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs font-bold text-ocean-800 disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          <ul className="space-y-3">
          {rows.map((s) => (
            <li
              key={s.id}
              className={`rounded-xl border bg-white p-3 shadow-sm ${
                selected.has(s.id)
                  ? "border-emerald-400 ring-1 ring-emerald-200"
                  : "border-ocean-100"
              }`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <label className="mt-0.5 flex shrink-0 cursor-pointer items-start pt-0.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-ocean-700"
                    checked={selected.has(s.id)}
                    disabled={!isActionable(s) || busy}
                    onChange={() => toggleSelect(s.id)}
                    aria-label={`Select ${s.keyword}`}
                  />
                </label>
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
                    {canAutoApplySuggestion(s) ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                        AUTO-APPLY OK
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                        MANUAL ONLY
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 font-semibold text-ocean-900">
                    Keyword:{" "}
                    <span className="text-cyan-800">{s.keyword}</span>
                  </p>
                  {(() => {
                    const rank = ourRankStyle(s.myPosition);
                    const compPos =
                      s.bestCompetitorPosition != null &&
                      s.bestCompetitorPosition > 0
                        ? Math.round(s.bestCompetitorPosition)
                        : null;
                    return (
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                        <span className="text-ocean-600">Our rank:</span>
                        <span
                          className={rank.className}
                          title={
                            s.myPosition != null && s.myPosition > 0
                              ? `Current SERP position ${Math.round(s.myPosition)}`
                              : "No ranking in latest SERP check — run Refresh rankings on Keywords"
                          }
                        >
                          {rank.label}
                        </span>
                        {compPos != null ? (
                          <span className="text-xs text-ocean-500">
                            · Best comp{" "}
                            <span className="font-bold text-fuchsia-700">
                              #{compPos}
                            </span>
                            {s.bestCompetitorDomain
                              ? ` (${s.bestCompetitorDomain.replace(/^www\./, "")})`
                              : ""}
                          </span>
                        ) : null}
                      </p>
                    );
                  })()}
                  <p className="mt-0.5 break-all text-xs text-ocean-500">
                    {s.targetUrl || "—"} · conf {s.confidence}% · {s.risk} risk ·{" "}
                    {s.priority}
                  </p>
                </div>
              </div>

              <p className="mt-2 pl-6 text-sm text-ocean-800 sm:pl-0">{s.reason}</p>
              <p className="mt-1 pl-6 text-xs text-ocean-600 sm:pl-0">
                {s.expectedBenefit}
              </p>
              <p className="mt-1 pl-6 text-xs text-ocean-500 sm:pl-0">
                Competitors: {s.competitorComparison}
              </p>

              <div className="mt-3 grid gap-2 pl-6 sm:pl-0 lg:grid-cols-2">
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

              <div className="mt-3 flex flex-wrap gap-1.5 pl-6 sm:pl-0">
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
        </div>
      )}
    </div>
  );
}
