"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { formatDurationMs } from "@/lib/analytics-display";

export type VisitorHistoryRow = {
  sessionId: string;
  atMs: number;
  atLabel: string;
  durationMs: number;
  durationLabel: string;
  geoLine: string;
  deviceModel: string;
  deviceLabel: string;
  landingPath: string;
  isCurrent: boolean;
};

type VisitPayload = {
  sessionId: string;
  at: string;
  durationMs: number;
  geoLine: string;
  deviceModel: string;
  deviceLabel: string;
  landingPath: string;
  isCurrent: boolean;
};

function formatIst(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function VisitorHistoryDialog({
  open,
  onClose,
  visitorId,
  currentSessionId,
  visitorVisitCount,
  currentDurationMs = 0,
}: {
  open: boolean;
  onClose: () => void;
  visitorId: string;
  currentSessionId: string;
  visitorVisitCount: number;
  /** Live duration for the current session from the analytics dashboard. */
  currentDurationMs?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visits, setVisits] = useState<VisitPayload[]>([]);

  useEffect(() => {
    if (!open || !visitorId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const params = new URLSearchParams({
          visitorId,
          currentSessionId,
          visitCount: String(Math.max(1, visitorVisitCount || 1)),
        });
        const data = (await adminFetch(
          `/api/admin/analytics/visitor-history?${params.toString()}`,
        )) as { visits?: VisitPayload[] };

        if (!cancelled) {
          setVisits(Array.isArray(data.visits) ? data.visits : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load visit history.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, visitorId, currentSessionId, visitorVisitCount]);

  const rows = useMemo((): VisitorHistoryRow[] => {
    return visits.map((v) => {
      const atMs = v.at ? Date.parse(v.at) : 0;
      const durationMs =
        v.isCurrent && currentDurationMs > 0
          ? Math.max(v.durationMs, currentDurationMs)
          : v.durationMs;
      return {
        sessionId: v.sessionId,
        atMs,
        atLabel: atMs ? formatIst(atMs) : "—",
        durationMs,
        durationLabel: formatDurationMs(durationMs),
        geoLine: v.geoLine,
        deviceModel: v.deviceModel,
        deviceLabel: v.deviceLabel,
        landingPath: v.landingPath,
        isCurrent: v.isCurrent,
      };
    });
  }, [visits, currentDurationMs]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-history-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-800">
                Returning visitor
              </p>
              <h2
                id="visitor-history-title"
                className="mt-0.5 font-display text-lg font-bold text-slate-900"
              >
                Visit history
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {visitorVisitCount > 0
                  ? `${visitorVisitCount} lifetime visit${visitorVisitCount === 1 ? "" : "s"}`
                  : "Previous visits"}
                {rows.length > 0
                  ? ` · showing ${rows.length} visit${rows.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading visit history…
            </p>
          ) : error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-sm text-slate-600">
              No previous visits recorded yet. History is saved from new visits
              after this update — older sessions may appear once the same
              visitor returns.
            </p>
          ) : (
            <ol className="space-y-2">
              {rows.map((row, index) => (
                <li
                  key={row.sessionId}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    row.isCurrent
                      ? "border-teal-300 bg-teal-50/80 ring-1 ring-teal-200"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      Visit #{rows.length - index}
                      {row.isCurrent ? (
                        <span className="ml-1.5 rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Current
                        </span>
                      ) : null}
                    </span>
                    <time
                      className="text-xs font-medium text-slate-600"
                      dateTime={row.atMs ? new Date(row.atMs).toISOString() : ""}
                    >
                      {row.atLabel}
                    </time>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-700">
                    <span className="font-semibold text-cyan-800">
                      Time on site:
                    </span>{" "}
                    {row.durationLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    <span className="font-semibold text-teal-800">
                      Location:
                    </span>{" "}
                    {row.geoLine || "Not recorded"}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    <span className="font-semibold text-violet-800">
                      Device:
                    </span>{" "}
                    {row.deviceModel || row.deviceLabel || "Unknown"}
                    {row.deviceModel && row.deviceLabel
                      ? ` · ${row.deviceLabel}`
                      : ""}
                  </p>
                  {row.landingPath ? (
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      Landed on {row.landingPath}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
