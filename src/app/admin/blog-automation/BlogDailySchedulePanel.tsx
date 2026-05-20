"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BlogAutomationSettings } from "@/lib/blog-automation/settings";
import type { BlogDayOverride } from "@/lib/blog-automation/daily-schedule";
import { normalizePublishSlotsIst } from "@/lib/blog-automation/schedule-utils";

type Row = { date: string; postsPerDay: number; slotsText: string };

function parseSlotsText(postsPerDay: number, text: string): string[] {
  const parts = text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return normalizePublishSlotsIst(postsPerDay, parts.length ? parts : undefined);
}

type Props = {
  adminFetch: (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;
  settings: BlogAutomationSettings | null;
  onMessage: (msg: { ok?: string; err?: string }) => void;
  onSaved?: () => void;
};

export function BlogDailySchedulePanel({
  adminFetch,
  settings,
  onMessage,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkDays, setBulkDays] = useState(7);
  const [bulkStart, setBulkStart] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/api/admin/blog-daily-schedule");
      const days = data.days as Record<string, BlogDayOverride>;
      const list = Object.entries(days)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          postsPerDay: v.postsPerDay,
          slotsText: v.publishSlotsIst.join(", "),
        }));
      setRows(list);
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Failed to load calendar" });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, onMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  const firstRow = rows[0];

  function applyFirstToAll() {
    if (!firstRow) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        postsPerDay: firstRow.postsPerDay,
        slotsText: firstRow.slotsText,
      })),
    );
    onMessage({ ok: "Copied row 1 to all 30 days (not saved until you click Save calendar)." });
  }

  function syncFromGlobalDefaults() {
    if (!settings) return;
    const n = settings.postsPerDay;
    const slots = settings.publishSlotsIst.join(", ");
    setRows((prev) => prev.map((r) => ({ ...r, postsPerDay: n, slotsText: slots })));
    onMessage({ ok: "Filled all rows from global settings (save to persist overrides)." });
  }

  async function saveCalendar() {
    setBusy("save-cal");
    try {
      const days: Record<string, BlogDayOverride> = {};
      for (const r of rows) {
        const slots = parseSlotsText(r.postsPerDay, r.slotsText);
        days[r.date] = { postsPerDay: r.postsPerDay, publishSlotsIst: slots };
      }
      await adminFetch("/api/admin/blog-daily-schedule", {
        method: "PUT",
        body: JSON.stringify({ days }),
      });
      onMessage({ ok: "30-day calendar saved." });
      onSaved?.();
      await load();
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(null);
    }
  }

  async function bulkPrepare() {
    setBusy("bulk-prep");
    try {
      const data = await adminFetch("/api/admin/blog-generate", {
        method: "POST",
        body: JSON.stringify({
          prepareBulk: true,
          prepareBulkDays: bulkDays,
          prepareBulkStart: bulkStart,
        }),
      });
      const n = (data.prepared as string[])?.length ?? 0;
      onMessage({
        ok: `Prepared ${n} draft(s). Run again with a higher “start day” if you hit the 25-post limit.`,
      });
      onSaved?.();
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Bulk prepare failed" });
    } finally {
      setBusy(null);
    }
  }

  const slotPresets = useMemo(() => {
    const s = new Set<string>(["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]);
    if (settings) {
      for (const x of settings.publishSlotsIst) s.add(x);
    }
    return [...s].sort();
  }, [settings]);

  if (loading) {
    return <p className="mt-4 text-sm text-ocean-600">Loading 30-day calendar…</p>;
  }

  return (
    <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-ocean-900">
        30-day schedule (IST)
      </h2>
      <p className="mt-2 text-sm text-ocean-700">
        Set <strong>posts per day</strong> (1–5) and <strong>publish times</strong> for each
        calendar date. Days you do not customize use the global defaults above. Cron uses
        this calendar when preparing scheduled drafts.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy != null || !firstRow}
          onClick={applyFirstToAll}
          className="rounded-full border border-ocean-300 px-4 py-2 text-xs font-semibold text-ocean-900 sm:text-sm"
        >
          Copy row 1 → all days
        </button>
        <button
          type="button"
          disabled={busy != null || !settings}
          onClick={syncFromGlobalDefaults}
          className="rounded-full border border-ocean-300 px-4 py-2 text-xs font-semibold text-ocean-900 sm:text-sm"
        >
          Fill all from global defaults
        </button>
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void saveCalendar()}
          className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-semibold text-white sm:text-sm disabled:opacity-50"
        >
          {busy === "save-cal" ? "Saving…" : "Save calendar"}
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-ocean-100 bg-ocean-50/40 p-4">
        <h3 className="text-sm font-bold text-ocean-900">Bulk generate scheduled drafts</h3>
        <p className="mt-1 text-xs text-ocean-600">
          Creates AI drafts (not live) for empty slots. Max ~25 posts per click to avoid
          timeouts — use start day offset to continue.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-ocean-800">
            Days to cover
            <input
              type="number"
              min={1}
              max={30}
              className="mt-1 block w-20 rounded border border-ocean-200 px-2 py-1"
              value={bulkDays}
              onChange={(e) => setBulkDays(Number(e.target.value) || 1)}
            />
          </label>
          <label className="text-xs text-ocean-800">
            Start offset (0 = today IST)
            <input
              type="number"
              min={0}
              max={29}
              className="mt-1 block w-20 rounded border border-ocean-200 px-2 py-1"
              value={bulkStart}
              onChange={(e) => setBulkStart(Number(e.target.value) || 0)}
            />
          </label>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void bulkPrepare()}
            className="rounded-full bg-ocean-gradient px-4 py-2 text-xs font-semibold text-white sm:text-sm disabled:opacity-50"
          >
            {busy === "bulk-prep" ? "Generating…" : "Prepare drafts for range"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-ocean-500">
        Times: comma-separated 24h IST, e.g. <code>06:00, 18:00, 21:00</code>. Quick picks:{" "}
        {slotPresets.join(", ")}
      </p>

      <div className="mt-4 max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-ocean-100">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 border-b border-ocean-100 bg-ocean-50 text-ocean-800">
            <tr>
              <th className="p-2">Date (IST)</th>
              <th className="p-2">Posts/day</th>
              <th className="p-2">Times (IST)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.date} className="border-b border-ocean-50">
                <td className="whitespace-nowrap p-2 font-mono text-ocean-800">{r.date}</td>
                <td className="p-2">
                  <select
                    className="w-16 rounded border border-ocean-200 px-1 py-1"
                    value={r.postsPerDay}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                postsPerDay: n,
                                slotsText: parseSlotsText(n, x.slotsText).join(", "),
                              }
                            : x,
                        ),
                      );
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    className="w-full min-w-[10rem] max-w-md rounded border border-ocean-200 px-2 py-1 font-mono text-xs"
                    value={r.slotsText}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, slotsText: e.target.value } : x)),
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
