"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { DeviceCategory } from "@/lib/clientDevice";
import {
  formatGeoLine,
  shortenPageLabel,
} from "@/lib/analytics-display";

type Row = {
  id: string;
  path: string;
  sessionId: string;
  eventType: "view" | "leave" | "heartbeat" | "click" | "";
  pageLabel: string;
  clickLabel?: string;
  clickTarget?: string;
  clickHref?: string;
  enteredAtMs: number | null;
  leftAtMs: number | null;
  durationMs: number | null;
  deviceCategory: DeviceCategory | "";
  deviceLabel: string;
  uaSnippet: string;
  createdAt: unknown;
  geoCountry?: string;
  geoCity?: string;
  geoRegion?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  language?: string;
  timeZone?: string;
};

type SessionDoc = {
  id: string;
  sessionId: string;
  lastPath: string;
  pageLabel: string;
  isActive: boolean;
  lastEventType: string;
  deviceCategory: DeviceCategory | "";
  deviceLabel: string;
  uaSnippet: string;
  lastSeenAt: unknown;
  geoCountry?: string;
  geoCity?: string;
  geoRegion?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  language?: string;
  timeZone?: string;
};

function normalizeDeviceCategory(raw: string): DeviceCategory | "" {
  if (
    raw === "mobile" ||
    raw === "tablet" ||
    raw === "desktop" ||
    raw === "unknown"
  ) {
    return raw;
  }
  return "";
}

function toTimestamp(v: unknown): Timestamp | null {
  if (
    v &&
    typeof v === "object" &&
    "toDate" in v &&
    typeof (v as Timestamp).toDate === "function"
  ) {
    return v as Timestamp;
  }
  return null;
}

function toNumberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function istCalendarDate(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function formatTs(v: unknown): string {
  const t = toTimestamp(v);
  if (!t) return String(v ?? "—");
  return t.toDate().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
}

function formatMs(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hr = Math.floor(totalMin / 60);
  if (hr > 0) return `${hr}h ${min}m ${sec}s`;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function formatScreenViewportLine(r: {
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}): string {
  const parts: string[] = [];
  if (r.screenWidth && r.screenHeight) {
    parts.push(`screen ${r.screenWidth}×${r.screenHeight}`);
  }
  if (r.viewportWidth && r.viewportHeight) {
    parts.push(`viewport ${r.viewportWidth}×${r.viewportHeight}`);
  }
  return parts.join(" · ");
}

function pickSessionFields(data: Record<string, unknown>) {
  return {
    geoCountry: String(data.geoCountry ?? "").trim() || undefined,
    geoCity: String(data.geoCity ?? "").trim() || undefined,
    geoRegion: String(data.geoRegion ?? "").trim() || undefined,
    screenWidth: toNumberOrNull(data.screenWidth) ?? undefined,
    screenHeight: toNumberOrNull(data.screenHeight) ?? undefined,
    viewportWidth: toNumberOrNull(data.viewportWidth) ?? undefined,
    viewportHeight: toNumberOrNull(data.viewportHeight) ?? undefined,
    language: String(data.language ?? "").trim() || undefined,
    timeZone: String(data.timeZone ?? "").trim() || undefined,
  };
}

const SAMPLE_LIMIT = 5000;
const SESSION_LIMIT = 2000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export default function AdminAnalyticsPage() {
  const db = getDb();
  const [rows, setRows] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const viewsQuery = query(
          collection(db, "pageViews"),
          orderBy("createdAt", "desc"),
          limit(SAMPLE_LIMIT)
        );
        const sessionsQuery = query(
          collection(db, "analyticsSessions"),
          orderBy("lastSeenAt", "desc"),
          limit(SESSION_LIMIT)
        );
        const [viewsSnap, sessionsSnap] = await Promise.all([
          getDocs(viewsQuery),
          getDocs(sessionsQuery),
        ]);
        if (cancelled) return;
        const list: Row[] = viewsSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const extra = pickSessionFields(data);
          return {
            id: d.id,
            path: String(data.path ?? ""),
            sessionId: String(data.sessionId ?? ""),
            eventType:
              data.eventType === "view" ||
              data.eventType === "leave" ||
              data.eventType === "heartbeat" ||
              data.eventType === "click"
                ? data.eventType
                : "",
            pageLabel: String(data.pageLabel ?? ""),
            clickLabel: String(data.clickLabel ?? ""),
            clickTarget: String(data.clickTarget ?? ""),
            clickHref: String(data.clickHref ?? ""),
            enteredAtMs: toNumberOrNull(data.enteredAtMs),
            leftAtMs: toNumberOrNull(data.leftAtMs),
            durationMs: toNumberOrNull(data.durationMs),
            deviceCategory: normalizeDeviceCategory(
              String(data.deviceCategory ?? "")
            ),
            deviceLabel: String(data.deviceLabel ?? ""),
            uaSnippet: String(data.uaSnippet ?? ""),
            createdAt: data.createdAt,
            ...extra,
          };
        });
        const sessionList: SessionDoc[] = sessionsSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const extra = pickSessionFields(data);
          return {
            id: d.id,
            sessionId: String(data.sessionId ?? d.id ?? ""),
            lastPath: String(data.lastPath ?? ""),
            pageLabel: String(data.pageLabel ?? ""),
            isActive: Boolean(data.isActive),
            lastEventType: String(data.lastEventType ?? ""),
            deviceCategory: normalizeDeviceCategory(
              String(data.deviceCategory ?? "")
            ),
            deviceLabel: String(data.deviceLabel ?? ""),
            uaSnippet: String(data.uaSnippet ?? ""),
            lastSeenAt: data.lastSeenAt,
            ...extra,
          };
        });
        setRows(list);
        setSessions(sessionList);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          e && typeof e === "object" && "code" in e
            ? `${String((e as { code?: string }).code)}: ${String((e as { message?: string }).message ?? e)}`
            : String(e);
        setLoadError(msg);
        setRows([]);
        setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const todayIstYmd = useMemo(
    () =>
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    []
  );

  const stats = useMemo(() => {
    const sessionIdsSet = new Set<string>();
    const byDay = new Map<string, number>();

    const todayRows: Row[] = [];
    for (const r of rows) {
      const ts = toTimestamp(r.createdAt);
      if (!ts) continue;
      if (r.sessionId) sessionIdsSet.add(r.sessionId);
      const day = istCalendarDate(ts);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      if (day === todayIstYmd) todayRows.push(r);
    }

    const dayList = [...byDay.entries()].sort((a, b) =>
      b[0].localeCompare(a[0])
    );

    const todayPageViews = todayRows.length;
    const todaySessions = new Set(
      todayRows.map((r) => r.sessionId).filter(Boolean)
    ).size;

    const sortedToday = [...todayRows].sort((a, b) => {
      const ta = toTimestamp(a.createdAt)?.toMillis() ?? 0;
      const tb = toTimestamp(b.createdAt)?.toMillis() ?? 0;
      return ta - tb;
    });

    const sessionFirstDevice = new Map<string, DeviceCategory | "unknown">();
    for (const r of sortedToday) {
      if (!r.sessionId) continue;
      if (sessionFirstDevice.has(r.sessionId)) continue;
      const c: DeviceCategory | "unknown" = r.deviceCategory || "unknown";
      sessionFirstDevice.set(r.sessionId, c);
    }

    const todayDeviceVisitors: Record<string, number> = {
      mobile: 0,
      tablet: 0,
      desktop: 0,
      unknown: 0,
    };
    for (const c of sessionFirstDevice.values()) {
      todayDeviceVisitors[c] = (todayDeviceVisitors[c] ?? 0) + 1;
    }

    const sampleDevicePageViews: Record<string, number> = {
      mobile: 0,
      tablet: 0,
      desktop: 0,
      unknown: 0,
    };
    for (const r of rows) {
      const c = r.deviceCategory || "unknown";
      const key =
        c === "mobile" || c === "tablet" || c === "desktop" ? c : "unknown";
      sampleDevicePageViews[key] = (sampleDevicePageViews[key] ?? 0) + 1;
    }

    const now = Date.now();
    const onlineNow = sessions.filter((s) => {
      const ts = toTimestamp(s.lastSeenAt);
      if (!ts) return false;
      return now - ts.toMillis() <= ONLINE_WINDOW_MS && s.lastEventType !== "leave";
    });
    const onlineIdSet = new Set(onlineNow.map((s) => s.sessionId));
    const sessionById = new Map(sessions.map((s) => [s.sessionId, s]));

    const uniqueTodaySessionIds = new Set(
      todayRows.map((r) => r.sessionId).filter(Boolean)
    );
    const todayVisitorSummaries = [...uniqueTodaySessionIds].map((sid) => {
      const sessionRows = todayRows
        .filter((r) => r.sessionId === sid)
        .sort((a, b) => {
          const ta = toTimestamp(a.createdAt)?.toMillis() ?? 0;
          const tb = toTimestamp(b.createdAt)?.toMillis() ?? 0;
          return ta - tb;
        });
      const first = sessionRows[0];
      const last = sessionRows[sessionRows.length - 1];
      const lastSeen = toTimestamp(last?.createdAt)?.toMillis() ?? 0;
      const totalDurationMs = sessionRows
        .filter((r) => r.eventType === "leave")
        .reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
      const sess = sessionById.get(sid);
      const geoLine = formatGeoLine({
        geoCity: sess?.geoCity,
        geoRegion: sess?.geoRegion,
        geoCountry: sess?.geoCountry,
      });
      const screenLine =
        formatScreenViewportLine(sess ?? {}) ||
        formatScreenViewportLine(first ?? {});
      return {
        sessionId: sid,
        firstSeen: first?.createdAt,
        lastSeen,
        lastPath: last?.path ?? "—",
        lastPageShort: shortenPageLabel(last?.pageLabel ?? ""),
        pageEvents: sessionRows.length,
        totalDurationMs,
        deviceCategory: first?.deviceCategory || "unknown",
        deviceLabel: sess?.deviceLabel || first?.deviceLabel || "",
        isOnline: onlineIdSet.has(sid),
        geoLine,
        screenLine,
        language: sess?.language,
        timeZone: sess?.timeZone,
      };
    });
    todayVisitorSummaries.sort((a, b) => b.lastSeen - a.lastSeen);

    return {
      pageViews: rows.length,
      sessionsApprox: sessionIdsSet.size,
      byDay: dayList.slice(0, 14),
      todayPageViews,
      todaySessions,
      onlineNow: onlineNow.length,
      onlineSessions: onlineNow,
      todayVisitorSummaries,
      todayDeviceVisitors,
      sampleDevicePageViews,
    };
  }, [rows, sessions, todayIstYmd]);

  useEffect(() => {
    if (!selectedSessionId && stats.todayVisitorSummaries.length > 0) {
      setSelectedSessionId(stats.todayVisitorSummaries[0].sessionId);
    }
  }, [selectedSessionId, stats.todayVisitorSummaries]);

  const selectedTimeline = useMemo(() => {
    if (!selectedSessionId) return [];
    const sessionRows = rows
      .filter((r) => r.sessionId === selectedSessionId)
      .sort((a, b) => {
        const ta = toTimestamp(a.createdAt)?.toMillis() ?? 0;
        const tb = toTimestamp(b.createdAt)?.toMillis() ?? 0;
        return ta - tb;
      });
    return sessionRows;
  }, [rows, selectedSessionId]);

  if (!db) {
    return (
      <p className="text-ocean-700">
        Firebase client not configured. Page views are recorded when{" "}
        <code className="text-xs">FIREBASE_SERVICE_ACCOUNT_KEY</code> is set on
        the server.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">
        Analytics
      </h1>
      <p className="mt-2 text-sm text-ocean-600">
        Visitor activity from the public site. Times are <strong>IST</strong> in
        12-hour AM/PM format. Numbers use the latest{" "}
        {SAMPLE_LIMIT.toLocaleString("en-IN")} events.
      </p>

      {loadError ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Could not load analytics</p>
          <p className="mt-2 font-mono text-xs opacity-90">{loadError}</p>
          <p className="mt-3 text-ocean-800">
            Deploy <code className="text-xs">firestore.rules</code> so admins can read{" "}
            <code className="text-xs">pageViews</code>. Redeploy rules in Firebase
            Console or run{" "}
            <code className="text-xs">firebase deploy --only firestore:rules</code>.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-ocean-600">Loading…</p>
      ) : loadError ? null : (
        <>
          <div className="mt-8 rounded-2xl border border-ocean-200 bg-ocean-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ocean-600">
              Today ({todayIstYmd} · IST)
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-ocean-500">
                  Users online now
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-ocean-900">
                  {stats.onlineNow}
                </p>
                <p className="mt-1 text-xs text-ocean-600">
                  Active in last 2 minutes
                </p>
              </div>
              <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-ocean-500">
                  Unique visitors (sessions)
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-ocean-900">
                  {stats.todaySessions}
                </p>
                <p className="mt-1 text-xs text-ocean-600">
                  Distinct browsers/tabs that loaded a page today
                </p>
              </div>
              <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-ocean-500">
                  Page views today
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-ocean-900">
                  {stats.todayPageViews}
                </p>
                <p className="mt-1 text-xs text-ocean-600">
                  Total tracked page loads today
                </p>
              </div>
              <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-medium text-ocean-500">
                  Today’s visitors by device type
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      ["Phone / mobile", stats.todayDeviceVisitors.mobile],
                      ["Tablet", stats.todayDeviceVisitors.tablet],
                      ["Desktop", stats.todayDeviceVisitors.desktop],
                      ["Unknown", stats.todayDeviceVisitors.unknown],
                    ] as const
                  ).map(([label, n]) => (
                    <li
                      key={label}
                      className="rounded-lg bg-sand/80 px-3 py-2 text-ocean-900"
                    >
                      <span className="block text-xs text-ocean-600">{label}</span>
                      <span className="text-lg font-bold">{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-ocean-900">
              Users online now
            </h2>
            <p className="mt-1 text-xs text-ocean-500">
              City/country uses request headers on Vercel (
              <code className="text-[10px]">x-vercel-ip-*</code>). Local dev may show
              no location. Screen size comes from the visitor&apos;s browser.
            </p>
            {stats.onlineSessions.length === 0 ? (
              <p className="mt-3 text-sm text-ocean-600">No users online now.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {stats.onlineSessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-ocean-100 bg-sand/40 px-3 py-2 text-ocean-900"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        Online
                      </span>
                      <span className="font-mono text-xs text-ocean-600">
                        {s.sessionId.slice(0, 14)}…
                      </span>
                      <span className="text-xs text-ocean-500">
                        last activity {formatTs(s.lastSeenAt)}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold text-ocean-900">
                      {s.lastPath || "—"}
                    </p>
                    {shortenPageLabel(s.pageLabel) ? (
                      <p className="mt-0.5 text-xs text-ocean-600" title={s.pageLabel}>
                        {shortenPageLabel(s.pageLabel)}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-ocean-700">
                      <span className="font-medium text-ocean-800">
                        {s.deviceCategory || "unknown"}
                      </span>
                      {s.deviceLabel ? ` · ${s.deviceLabel}` : ""}
                    </p>
                    {formatGeoLine({
                      geoCity: s.geoCity,
                      geoRegion: s.geoRegion,
                      geoCountry: s.geoCountry,
                    }) ? (
                      <p className="mt-0.5 text-xs text-ocean-600">
                        Location:{" "}
                        {formatGeoLine({
                          geoCity: s.geoCity,
                          geoRegion: s.geoRegion,
                          geoCountry: s.geoCountry,
                        })}
                      </p>
                    ) : null}
                    {formatScreenViewportLine(s) ? (
                      <p className="mt-0.5 text-xs text-ocean-600">
                        {formatScreenViewportLine(s)}
                      </p>
                    ) : null}
                    {(s.language || s.timeZone) && (
                      <p className="mt-0.5 text-xs text-ocean-500">
                        {s.language ? `Lang: ${s.language}` : ""}
                        {s.language && s.timeZone ? " · " : ""}
                        {s.timeZone ? `TZ: ${s.timeZone}` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                Page views in sample
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-ocean-900">
                {stats.pageViews}
              </p>
            </div>
            <div className="rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                Unique sessions (sample)
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-ocean-900">
                {stats.sessionsApprox}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-ocean-900">
              Device mix (page views in sample)
            </h2>
            <p className="mt-1 text-xs text-ocean-600">
              From User-Agent on each request — not 100% exact, but good for trends.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-4 text-sm">
              {(
                [
                  ["Mobile", stats.sampleDevicePageViews.mobile],
                  ["Tablet", stats.sampleDevicePageViews.tablet],
                  ["Desktop", stats.sampleDevicePageViews.desktop],
                  ["Unknown / old data", stats.sampleDevicePageViews.unknown],
                ] as const
              ).map(([label, n]) => (
                <li
                  key={label}
                  className="flex justify-between rounded-xl border border-ocean-50 bg-sand/50 px-3 py-2"
                >
                  <span className="text-ocean-700">{label}</span>
                  <span className="font-semibold text-ocean-900">{n}</span>
                </li>
              ))}
            </ul>
          </div>

          {stats.byDay.length > 0 ? (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ocean-900">
                Views by day (IST)
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-ocean-800">
                {stats.byDay.map(([day, n]) => (
                  <li
                    key={day}
                    className="flex justify-between rounded-xl border border-ocean-100 bg-white px-4 py-2"
                  >
                    <span>{day}</span>
                    <span className="font-semibold">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-10 rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-ocean-900">
              Today visitor list (click to inspect timeline)
            </h2>
            {stats.todayVisitorSummaries.length === 0 ? (
              <p className="mt-4 text-ocean-600">No visitors recorded today.</p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ul className="max-h-[30rem] space-y-2 overflow-y-auto text-sm">
                  {stats.todayVisitorSummaries.map((s) => (
                    <li key={s.sessionId}>
                      <button
                        type="button"
                        onClick={() => setSelectedSessionId(s.sessionId)}
                        className={`w-full rounded-xl border px-3 py-2 text-left ${
                          selectedSessionId === s.sessionId
                            ? "border-ocean-300 bg-ocean-50"
                            : "border-ocean-100 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs text-ocean-600">
                            {s.sessionId.slice(0, 14)}…
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {s.isOnline ? (
                              <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                                Online
                              </span>
                            ) : null}
                            <span className="text-xs text-ocean-500">
                              {formatTs(s.firstSeen)}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 font-mono text-sm font-semibold text-ocean-900">
                          Last: {s.lastPath}
                        </p>
                        {s.lastPageShort ? (
                          <p className="mt-0.5 text-xs text-ocean-600">{s.lastPageShort}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-ocean-600">
                          Events: {s.pageEvents} · Time on site:{" "}
                          {formatMs(s.totalDurationMs)}
                        </p>
                        <p className="mt-0.5 text-xs text-ocean-700">
                          {s.deviceCategory || "unknown"}
                          {s.deviceLabel ? ` · ${s.deviceLabel}` : ""}
                        </p>
                        {s.geoLine ? (
                          <p className="mt-0.5 text-xs text-ocean-600">
                            Location: {s.geoLine}
                          </p>
                        ) : null}
                        {s.screenLine ? (
                          <p className="mt-0.5 text-xs text-ocean-500">{s.screenLine}</p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl border border-ocean-100 bg-sand/30 p-3">
                  <h3 className="font-semibold text-ocean-900">
                    Timeline for {selectedSessionId.slice(0, 12)}…
                  </h3>
                  {selectedTimeline.length === 0 ? (
                    <p className="mt-3 text-sm text-ocean-600">
                      No events for this visitor.
                    </p>
                  ) : (
                    <ul className="mt-3 max-h-[27rem] space-y-2 overflow-y-auto text-sm">
                      {selectedTimeline.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-lg border border-ocean-100 bg-white px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-ocean-600">
                              {formatTs(r.createdAt)}
                            </span>
                            <span className="rounded-md bg-ocean-100 px-2 py-0.5 text-xs font-semibold text-ocean-900">
                              {r.eventType || "view"}
                            </span>
                            {r.durationMs ? (
                              <span className="text-xs text-ocean-700">
                                stayed {formatMs(r.durationMs)}
                              </span>
                            ) : null}
                          </div>
                          {r.eventType === "click" ? (
                            <p className="mt-1 text-xs text-ocean-700">
                              Click:{" "}
                              <span className="font-medium text-ocean-900">
                                {r.clickLabel || "(no label)"}
                              </span>
                              {r.clickTarget ? ` · ${r.clickTarget}` : ""}
                              {r.clickHref ? ` · ${r.clickHref}` : ""}
                            </p>
                          ) : null}
                          <p className="mt-1 break-all font-mono text-sm font-semibold text-ocean-900">
                            {r.path || "—"}
                          </p>
                          {shortenPageLabel(r.pageLabel) ? (
                            <p
                              className="mt-0.5 text-xs text-ocean-600"
                              title={r.pageLabel}
                            >
                              {shortenPageLabel(r.pageLabel)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-ocean-700">
                            <span className="font-medium">
                              {r.deviceCategory || "unknown"}
                            </span>
                            {r.deviceLabel ? ` · ${r.deviceLabel}` : ""}
                          </p>
                          {formatGeoLine({
                            geoCity: r.geoCity,
                            geoRegion: r.geoRegion,
                            geoCountry: r.geoCountry,
                          }) ? (
                            <p className="mt-0.5 text-xs text-ocean-600">
                              Location:{" "}
                              {formatGeoLine({
                                geoCity: r.geoCity,
                                geoRegion: r.geoRegion,
                                geoCountry: r.geoCountry,
                              })}
                            </p>
                          ) : null}
                          {formatScreenViewportLine(r) ? (
                            <p className="mt-0.5 text-xs text-ocean-500">
                              {formatScreenViewportLine(r)}
                            </p>
                          ) : null}
                          {(r.language || r.timeZone) && (
                            <p className="mt-0.5 text-xs text-ocean-500">
                              {r.language ? `Lang ${r.language}` : ""}
                              {r.language && r.timeZone ? " · " : ""}
                              {r.timeZone ? r.timeZone : ""}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ocean-900">
              Recent raw activity events
            </h2>
            {rows.length === 0 ? (
              <p className="mt-4 text-ocean-600">
                No page events yet. Deploy with Admin SDK env and browse the site.
              </p>
            ) : (
              <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto text-sm">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-ocean-100 bg-white px-3 py-2 text-ocean-800"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-mono text-xs text-ocean-600">
                        {formatTs(r.createdAt)}
                      </span>
                      <span className="text-ocean-300">·</span>
                      <span className="rounded bg-ocean-100 px-2 py-0.5 text-[10px] font-semibold text-ocean-900">
                        {r.eventType || "view"}
                      </span>
                      <span className="text-ocean-300">·</span>
                      <span className="font-medium">{r.path}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-ocean-100 px-2 py-0.5 font-medium text-ocean-900">
                        {r.deviceCategory || "unknown"}
                      </span>
                      <span className="text-ocean-700">
                        {r.deviceLabel || "—"}
                      </span>
                      <span className="text-ocean-500">
                        session {r.sessionId.slice(0, 10)}…
                      </span>
                      {r.durationMs ? (
                        <span className="text-ocean-500">
                          time {formatMs(r.durationMs)}
                        </span>
                      ) : null}
                      {r.eventType === "click" ? (
                        <span className="text-ocean-700">
                          click: {r.clickLabel || "(no label)"}
                          {r.clickTarget ? ` (${r.clickTarget})` : ""}
                        </span>
                      ) : null}
                    </div>
                    {r.eventType === "click" && r.clickHref ? (
                      <p className="mt-0.5 break-all text-xs text-ocean-600">
                        target: {r.clickHref}
                      </p>
                    ) : null}
                    {formatGeoLine({
                      geoCity: r.geoCity,
                      geoRegion: r.geoRegion,
                      geoCountry: r.geoCountry,
                    }) ? (
                      <p className="mt-1 text-xs text-ocean-600">
                        Location:{" "}
                        {formatGeoLine({
                          geoCity: r.geoCity,
                          geoRegion: r.geoRegion,
                          geoCountry: r.geoCountry,
                        })}
                      </p>
                    ) : null}
                    {formatScreenViewportLine(r) ? (
                      <p className="mt-0.5 text-xs text-ocean-500">
                        {formatScreenViewportLine(r)}
                      </p>
                    ) : null}
                    {r.uaSnippet ? (
                      <p
                        className="mt-1 truncate font-mono text-[10px] text-ocean-500"
                        title={r.uaSnippet}
                      >
                        {r.uaSnippet}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
