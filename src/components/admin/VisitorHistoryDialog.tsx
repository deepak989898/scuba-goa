"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { deviceModelFromUserAgent } from "@/lib/device-model";
import { formatGeoLine } from "@/lib/analytics-display";

export type VisitorHistoryRow = {
  sessionId: string;
  atMs: number;
  atLabel: string;
  geoLine: string;
  deviceModel: string;
  deviceLabel: string;
  landingPath: string;
  isCurrent: boolean;
};

type StoredVisit = {
  sessionId?: string;
  at?: string;
  geoLine?: string;
  geoCity?: string;
  geoRegionName?: string;
  geoCountryName?: string;
  deviceModel?: string;
  deviceLabel?: string;
  landingPath?: string;
};

type SessionLite = {
  sessionId: string;
  visitorId?: string;
  firstSeenAt?: unknown;
  lastSeenAt?: unknown;
  deviceLabel?: string;
  deviceModel?: string;
  uaSnippet?: string;
  geoCity?: string;
  geoRegion?: string;
  geoRegionName?: string;
  geoCountry?: string;
  geoCountryName?: string;
  landingPath?: string;
  lastPath?: string;
};

function toMs(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "object" && v !== null) {
    if (
      "toMillis" in v &&
      typeof (v as { toMillis?: () => number }).toMillis === "function"
    ) {
      return (v as { toMillis: () => number }).toMillis();
    }
    if (
      "seconds" in v &&
      typeof (v as { seconds?: unknown }).seconds === "number"
    ) {
      const sec = (v as { seconds: number }).seconds;
      const nano =
        typeof (v as { nanoseconds?: unknown }).nanoseconds === "number"
          ? (v as { nanoseconds: number }).nanoseconds
          : 0;
      return sec * 1000 + Math.floor(nano / 1e6);
    }
  }
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

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

function geoFromSession(s: SessionLite): string {
  return formatGeoLine({
    geoCity: s.geoCity,
    geoRegion: s.geoRegion,
    geoRegionName: s.geoRegionName,
    geoCountry: s.geoCountry,
    geoCountryName: s.geoCountryName,
  });
}

function geoFromStored(v: StoredVisit): string {
  if (v.geoLine?.trim()) return v.geoLine.trim();
  return formatGeoLine({
    geoCity: v.geoCity,
    geoRegionName: v.geoRegionName,
    geoCountryName: v.geoCountryName,
  });
}

function modelFromSession(s: SessionLite): string {
  if (s.deviceModel?.trim()) return s.deviceModel.trim();
  if (s.uaSnippet) return deviceModelFromUserAgent(s.uaSnippet);
  return "";
}

export function VisitorHistoryDialog({
  open,
  onClose,
  visitorId,
  currentSessionId,
  visitorVisitCount,
  knownSessions,
}: {
  open: boolean;
  onClose: () => void;
  visitorId: string;
  currentSessionId: string;
  visitorVisitCount: number;
  knownSessions: SessionLite[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedVisits, setStoredVisits] = useState<StoredVisit[]>([]);
  const [extraSessions, setExtraSessions] = useState<SessionLite[]>([]);

  useEffect(() => {
    if (!open || !visitorId) return;
    const db = getDb();
    if (!db) {
      setError("Firestore not configured.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [visitorSnap, sessionsSnap] = await Promise.all([
          getDoc(doc(db, "analyticsVisitors", visitorId)),
          getDocs(
            query(
              collection(db, "analyticsSessions"),
              where("visitorId", "==", visitorId),
              limit(40),
            ),
          ),
        ]);

        if (cancelled) return;

        const visitorData = visitorSnap.exists()
          ? (visitorSnap.data() as Record<string, unknown>)
          : null;
        const history = Array.isArray(visitorData?.visitHistory)
          ? (visitorData.visitHistory as StoredVisit[])
          : [];
        setStoredVisits(history);

        const fromQuery: SessionLite[] = sessionsSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            sessionId: String(data.sessionId ?? d.id),
            visitorId: String(data.visitorId ?? ""),
            firstSeenAt: data.firstSeenAt,
            lastSeenAt: data.lastSeenAt,
            deviceLabel: String(data.deviceLabel ?? ""),
            deviceModel: String(data.deviceModel ?? ""),
            uaSnippet: String(data.uaSnippet ?? ""),
            geoCity: String(data.geoCity ?? ""),
            geoRegion: String(data.geoRegion ?? ""),
            geoRegionName: String(data.geoRegionName ?? ""),
            geoCountry: String(data.geoCountry ?? ""),
            geoCountryName: String(data.geoCountryName ?? ""),
            landingPath: String(data.landingPath ?? ""),
            lastPath: String(data.lastPath ?? ""),
          };
        });
        setExtraSessions(fromQuery);
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
  }, [open, visitorId]);

  const rows = useMemo(() => {
    const bySession = new Map<string, VisitorHistoryRow>();

    const upsert = (row: VisitorHistoryRow) => {
      const prev = bySession.get(row.sessionId);
      if (!prev || row.atMs >= prev.atMs) {
        bySession.set(row.sessionId, row);
      }
    };

    for (const v of storedVisits) {
      const sid = String(v.sessionId ?? "").trim();
      if (!sid) continue;
      const atMs = v.at ? Date.parse(v.at) : 0;
      upsert({
        sessionId: sid,
        atMs,
        atLabel: atMs ? formatIst(atMs) : "—",
        geoLine: geoFromStored(v),
        deviceModel: String(v.deviceModel ?? "").trim(),
        deviceLabel: String(v.deviceLabel ?? "").trim(),
        landingPath: String(v.landingPath ?? "").trim(),
        isCurrent: sid === currentSessionId,
      });
    }

    const allSessions = [...knownSessions, ...extraSessions];
    for (const s of allSessions) {
      if (s.visitorId && s.visitorId !== visitorId) continue;
      const sid = s.sessionId;
      if (!sid) continue;
      const atMs = toMs(s.firstSeenAt) || toMs(s.lastSeenAt);
      upsert({
        sessionId: sid,
        atMs,
        atLabel: formatIst(atMs),
        geoLine: geoFromSession(s),
        deviceModel: modelFromSession(s),
        deviceLabel: s.deviceLabel?.trim() ?? "",
        landingPath: (s.landingPath || s.lastPath || "").trim(),
        isCurrent: sid === currentSessionId,
      });
    }

    return [...bySession.values()].sort((a, b) => b.atMs - a.atMs);
  }, [
    storedVisits,
    knownSessions,
    extraSessions,
    visitorId,
    currentSessionId,
  ]);

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
                {rows.length > 0 ? ` · ${rows.length} session(s) found` : ""}
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
