"use client";

import { useCallback, useEffect, useState } from "react";
import { seoIntelFetch } from "../admin-fetch";
import type {
  SeoIntelChangeVersion,
  SeoIntelSuggestion,
} from "@/lib/seo-intelligence/types";

export default function AppliedChangesPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [versions, setVersions] = useState<SeoIntelChangeVersion[]>([]);
  const [suggestions, setSuggestions] = useState<SeoIntelSuggestion[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await seoIntelFetch("/api/admin/seo-intelligence/changes");
      setVersions((data.versions ?? []) as SeoIntelChangeVersion[]);
      setSuggestions((data.suggestions ?? []) as SeoIntelSuggestion[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function rollback(id: string) {
    if (!confirm("Rollback this change to the previous snapshot?")) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await seoIntelFetch(
        `/api/admin/seo-intelligence/changes/${id}/rollback`,
        { method: "POST" },
      );
      setMsg("Rolled back successfully.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rollback failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          Applied Changes
        </h2>
        <p className="mt-0.5 text-sm text-ocean-700">
          Version snapshots with one-click rollback. Before/after ranking
          changes can be affected by seasonality — causation is not claimed.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="mt-3 rounded-full border border-ocean-200 px-4 py-2 text-xs font-bold text-ocean-800"
        >
          Refresh
        </button>
        {err ? (
          <p className="mt-2 text-sm text-red-700">{err}</p>
        ) : null}
        {msg ? (
          <p className="mt-2 text-sm text-emerald-800">{msg}</p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-ocean-600">Loading…</p>
      ) : (
        <>
          <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
            <h3 className="font-bold text-ocean-900">Change versions</h3>
            {versions.length === 0 ? (
              <p className="mt-2 text-sm text-ocean-600">No applied versions yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-ocean-50 text-sm">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="font-semibold text-ocean-900">
                        {v.collection}/{v.docId}
                      </p>
                      <p className="text-xs text-ocean-500">
                        {v.createdAt?.slice(0, 19)?.replace("T", " ")} ·{" "}
                        {v.status}
                        {v.rolledBackAt
                          ? ` · rolled back ${v.rolledBackAt.slice(0, 19)}`
                          : ""}
                      </p>
                    </div>
                    {v.status === "applied" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void rollback(v.id)}
                        className="rounded bg-red-600 px-3 py-1 text-[10px] font-bold text-white"
                      >
                        Rollback
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
            <h3 className="font-bold text-ocean-900">Suggestion history</h3>
            {suggestions.length === 0 ? (
              <p className="mt-2 text-sm text-ocean-600">No history yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-ocean-50 text-sm">
                {suggestions.map((s) => (
                  <li key={s.id} className="py-2">
                    <span className="font-semibold">{s.keyword}</span>
                    <span className="ml-2 text-xs text-ocean-500">
                      {s.type} · {s.status}
                    </span>
                    {s.applyError ? (
                      <p className="text-xs text-red-700">{s.applyError}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
