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
  formatDurationMs,
  formatGeoLine,
  shortenPageLabel,
} from "@/lib/analytics-display";
import {
  botLabelFromUserAgent,
  resolveIsBot,
} from "@/lib/analytics-bot";
import {
  trafficChannelStyles,
  type TrafficChannel,
} from "@/lib/analytics-traffic";
import {
  resolveAdminVisitorKind,
  matchesAdminVisitorKind,
  type AdminVisitorKind,
} from "@/lib/analytics-visitor-kind";

type VisitorKindFilter = "human" | "suspected" | "bot" | "all";

type Row = {
  id: string;
  path: string;
  sessionId: string;
  eventType: "view" | "leave" | "heartbeat" | "click" | "";
  pageLabel: string;
  clickLabel?: string;
  durationMs: number | null;
  deviceCategory: DeviceCategory | "";
  deviceLabel: string;
  uaSnippet: string;
  isBot?: boolean;
  createdAt: unknown;
  geoCountry?: string;
  geoCity?: string;
  geoRegion?: string;
  trafficChannel?: string;
  trafficLabel?: string;
  trafficDetail?: string;
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
  isBot?: boolean;
  lastSeenAt: unknown;
  firstSeenAt?: unknown;
  geoCountry?: string;
  geoCity?: string;
  geoRegion?: string;
  trafficChannel?: string;
  trafficLabel?: string;
  trafficDetail?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
  visitorType?: string;
  sourceConfidence?: string;
  attributionReason?: string;
  analyticsVersion?: number;
  rawReferrer?: string;
};

type PageStay = {
  path: string;
  label: string;
  durationMs: number;
  views: number;
};

type VisitorSummary = {
  sessionId: string;
  arrivedAt: unknown;
  leftAt: unknown;
  arrivedAtMs: number;
  leftAtMs: number;
  totalDurationMs: number;
  pageViews: number;
  uniquePages: number;
  pages: PageStay[];
  lastPath: string;
  deviceCategory: DeviceCategory | "unknown";
  deviceLabel: string;
  geoLine: string;
  trafficChannel: TrafficChannel | "";
  trafficLabel: string;
  trafficDetail: string;
  landingPath: string;
  isOnline: boolean;
  isBot: boolean;
  botLabel: string;
  uaSnippet: string;
  visitorKind: AdminVisitorKind;
  sourceConfidence: string;
  attributionReason: string;
  analyticsVersion: number;
  rawReferrer: string;
};

type DayGroup = {
  date: string;
  label: string;
  pageViews: number;
  visitors: VisitorSummary[];
  totalVisitors: number;
  totalBots: number;
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

function normalizeTrafficChannel(raw: string | undefined): TrafficChannel | "" {
  const v = (raw ?? "").trim();
  const allowed: TrafficChannel[] = [
    "facebook",
    "instagram",
    "google_ads",
    "google_organic",
    "bing",
    "direct",
    "email",
    "referral",
    "other",
  ];
  return allowed.includes(v as TrafficChannel) ? (v as TrafficChannel) : "";
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

function formatDayLabel(ymd: string, todayYmd: string): string {
  if (ymd === todayYmd) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYmd = yesterday.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  if (ymd === yesterdayYmd) return "Yesterday";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTs(v: unknown): string {
  const t = toTimestamp(v);
  if (!t) return "—";
  return t.toDate().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function pickGeoFields(data: Record<string, unknown>) {
  return {
    geoCountry: String(data.geoCountry ?? "").trim() || undefined,
    geoCity: String(data.geoCity ?? "").trim() || undefined,
    geoRegion: String(data.geoRegion ?? "").trim() || undefined,
  };
}

function pickTrafficFields(data: Record<string, unknown>) {
  return {
    trafficChannel: String(data.trafficChannel ?? "").trim() || undefined,
    trafficLabel: String(data.trafficLabel ?? "").trim() || undefined,
    trafficDetail: String(data.trafficDetail ?? "").trim() || undefined,
    referrerHost: String(data.referrerHost ?? "").trim() || undefined,
    utmSource: String(data.utmSource ?? "").trim() || undefined,
    utmMedium: String(data.utmMedium ?? "").trim() || undefined,
    utmCampaign: String(data.utmCampaign ?? "").trim() || undefined,
    landingPath: String(data.landingPath ?? "").trim() || undefined,
  };
}

function buildPageStays(sessionRows: Row[]): PageStay[] {
  const map = new Map<string, PageStay>();
  for (const r of sessionRows) {
    if (!r.path) continue;
    const existing = map.get(r.path) ?? {
      path: r.path,
      label: shortenPageLabel(r.pageLabel) || r.path,
      durationMs: 0,
      views: 0,
    };
    if (r.eventType === "view") {
      existing.views += 1;
      if (!existing.label || existing.label === r.path) {
        existing.label = shortenPageLabel(r.pageLabel) || r.path;
      }
    }
    if (r.eventType === "leave" && r.durationMs) {
      existing.durationMs += r.durationMs;
    }
    map.set(r.path, existing);
  }
  return [...map.values()].sort((a, b) => b.durationMs - a.durationMs);
}

function buildVisitorSummary(
  sid: string,
  sessionRows: Row[],
  sess: SessionDoc | undefined,
  onlineIdSet: Set<string>
): VisitorSummary {
  const sorted = [...sessionRows].sort((a, b) => {
    const ta = toTimestamp(a.createdAt)?.toMillis() ?? 0;
    const tb = toTimestamp(b.createdAt)?.toMillis() ?? 0;
    return ta - tb;
  });
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const arrivedAtMs = toTimestamp(first?.createdAt)?.toMillis() ?? 0;
  const leftAtMs = toTimestamp(last?.createdAt)?.toMillis() ?? 0;
  const totalDurationMs = sorted
    .filter((r) => r.eventType === "leave")
    .reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
  const pages = buildPageStays(sorted);
  const geoSource = sess ?? first;
  const trafficSource = sess ?? sorted.find((r) => r.trafficChannel) ?? first;
  const pageViews = sorted.filter((r) => r.eventType === "view").length;
  const isBot = resolveIsBot(
    sess?.isBot ?? first?.isBot,
    sess?.uaSnippet || first?.uaSnippet || "",
  );
  const visitorKind = resolveAdminVisitorKind({
    isBot,
    visitorType: sess?.visitorType,
    uaSnippet: sess?.uaSnippet || first?.uaSnippet || "",
    deviceLabel: sess?.deviceLabel || first?.deviceLabel || "",
    trafficChannel: trafficSource?.trafficChannel ?? sess?.trafficChannel,
    sourceConfidence: sess?.sourceConfidence,
    totalDurationMs,
    pageViews,
    analyticsVersion: sess?.analyticsVersion,
  });

  return {
    sessionId: sid,
    arrivedAt: first?.createdAt ?? sess?.firstSeenAt,
    leftAt: last?.createdAt ?? sess?.lastSeenAt,
    arrivedAtMs,
    leftAtMs,
    totalDurationMs,
    pageViews,
    uniquePages: pages.length,
    pages,
    lastPath: last?.path ?? sess?.lastPath ?? "—",
    deviceCategory: (first?.deviceCategory ||
      sess?.deviceCategory ||
      "unknown") as DeviceCategory | "unknown",
    deviceLabel: sess?.deviceLabel || first?.deviceLabel || "",
    geoLine: formatGeoLine({
      geoCity: geoSource?.geoCity,
      geoRegion: geoSource?.geoRegion,
      geoCountry: geoSource?.geoCountry,
    }),
    trafficChannel: normalizeTrafficChannel(
      trafficSource?.trafficChannel ?? sess?.trafficChannel
    ),
    trafficLabel:
      trafficSource?.trafficLabel ??
      sess?.trafficLabel ??
      (sess?.trafficChannel ? "Unknown source" : "—"),
    trafficDetail:
      trafficSource?.trafficDetail ?? sess?.trafficDetail ?? "",
    landingPath: sess?.landingPath ?? first?.path ?? "—",
    isOnline: onlineIdSet.has(sid),
    isBot,
    botLabel: botLabelFromUserAgent(
      sess?.uaSnippet || first?.uaSnippet || ""
    ),
    uaSnippet: sess?.uaSnippet || first?.uaSnippet || "",
    visitorKind,
    sourceConfidence: sess?.sourceConfidence ?? "",
    attributionReason: sess?.attributionReason ?? "",
    analyticsVersion: sess?.analyticsVersion ?? 1,
    rawReferrer: sess?.rawReferrer ?? "",
  };
}

const SAMPLE_LIMIT = 5000;
const SESSION_LIMIT = 2000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const MAX_DAYS = 30;

export default function AdminAnalyticsPage() {
  const db = getDb();
  const [rows, setRows] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [expandedDate, setExpandedDate] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visitorFilter, setVisitorFilter] =
    useState<VisitorKindFilter>("human");

  const todayIstYmd = useMemo(
    () =>
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    []
  );

  useEffect(() => {
    if (!expandedDate) setExpandedDate(todayIstYmd);
  }, [expandedDate, todayIstYmd]);

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
          const geo = pickGeoFields(data);
          const traffic = pickTrafficFields(data);
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
            durationMs: toNumberOrNull(data.durationMs),
            deviceCategory: normalizeDeviceCategory(
              String(data.deviceCategory ?? "")
            ),
            deviceLabel: String(data.deviceLabel ?? ""),
            uaSnippet: String(data.uaSnippet ?? ""),
            isBot:
              typeof data.isBot === "boolean" ? data.isBot : undefined,
            createdAt: data.createdAt,
            ...geo,
            ...traffic,
          };
        });
        const sessionList: SessionDoc[] = sessionsSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
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
            isBot:
              typeof data.isBot === "boolean" ? data.isBot : undefined,
            lastSeenAt: data.lastSeenAt,
            firstSeenAt: data.firstSeenAt,
            visitorType: String(data.visitorType ?? "") || undefined,
            sourceConfidence: String(data.sourceConfidence ?? "") || undefined,
            attributionReason: String(data.attributionReason ?? "") || undefined,
            analyticsVersion:
              typeof data.analyticsVersion === "number"
                ? data.analyticsVersion
                : undefined,
            rawReferrer: String(data.rawReferrer ?? "") || undefined,
            ...pickGeoFields(data),
            ...pickTrafficFields(data),
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

  const analytics = useMemo(() => {
    const sessionById = new Map(sessions.map((s) => [s.sessionId, s]));
    const now = Date.now();
    const sessionKind = new Map<string, AdminVisitorKind>();

    const rowsBySession = new Map<string, Row[]>();
    for (const r of rows) {
      const ts = toTimestamp(r.createdAt);
      if (!ts || !r.sessionId) continue;
      const list = rowsBySession.get(r.sessionId) ?? [];
      list.push(r);
      rowsBySession.set(r.sessionId, list);
    }

    // Precompute kinds with duration context
    for (const [sid, sessionRows] of rowsBySession) {
      const sess = sessionById.get(sid);
      const totalDurationMs = sessionRows
        .filter((r) => r.eventType === "leave")
        .reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
      const pageViews = sessionRows.filter((r) => r.eventType === "view").length;
      const isBot = resolveIsBot(
        sess?.isBot ?? sessionRows[0]?.isBot,
        sess?.uaSnippet || sessionRows[0]?.uaSnippet || "",
      );
      sessionKind.set(
        sid,
        resolveAdminVisitorKind({
          isBot,
          visitorType: sess?.visitorType,
          uaSnippet: sess?.uaSnippet || sessionRows[0]?.uaSnippet || "",
          deviceLabel: sess?.deviceLabel || sessionRows[0]?.deviceLabel || "",
          trafficChannel: sess?.trafficChannel || sessionRows.find((r) => r.trafficChannel)?.trafficChannel,
          sourceConfidence: sess?.sourceConfidence,
          totalDurationMs,
          pageViews,
          analyticsVersion: sess?.analyticsVersion,
        }),
      );
    }
    for (const s of sessions) {
      if (!sessionKind.has(s.sessionId)) {
        sessionKind.set(
          s.sessionId,
          resolveAdminVisitorKind({
            isBot: resolveIsBot(s.isBot, s.uaSnippet),
            visitorType: s.visitorType,
            uaSnippet: s.uaSnippet,
            deviceLabel: s.deviceLabel,
            trafficChannel: s.trafficChannel,
            sourceConfidence: s.sourceConfidence,
            analyticsVersion: s.analyticsVersion,
          }),
        );
      }
    }

    const onlineIdSet = new Set(
      sessions
        .filter((s) => {
          const ts = toTimestamp(s.lastSeenAt);
          if (!ts) return false;
          const kind = sessionKind.get(s.sessionId) ?? "unknown";
          if (!matchesAdminVisitorKind(kind, visitorFilter)) return false;
          return (
            now - ts.toMillis() <= ONLINE_WINDOW_MS &&
            s.lastEventType !== "leave"
          );
        })
        .map((s) => s.sessionId)
    );

    const visitorsByDay = new Map<string, VisitorSummary[]>();

    for (const [sid, sessionRows] of rowsBySession) {
      const firstTs = sessionRows
        .map((r) => toTimestamp(r.createdAt))
        .filter(Boolean)
        .sort((a, b) => a!.toMillis() - b!.toMillis())[0];
      if (!firstTs) continue;
      const day = istCalendarDate(firstTs);
      const summary = buildVisitorSummary(
        sid,
        sessionRows,
        sessionById.get(sid),
        onlineIdSet
      );
      const list = visitorsByDay.get(day) ?? [];
      list.push(summary);
      visitorsByDay.set(day, list);
    }

    for (const [, list] of visitorsByDay) {
      list.sort((a, b) => b.arrivedAtMs - a.arrivedAtMs);
    }

    const allDays = new Set([...visitorsByDay.keys(), todayIstYmd]);
    const dayGroupsRaw: DayGroup[] = [...allDays]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, MAX_DAYS)
      .map((date) => {
        const allVisitors = visitorsByDay.get(date) ?? [];
        return {
          date,
          label: formatDayLabel(date, todayIstYmd),
          pageViews: allVisitors.reduce((acc, v) => acc + v.pageViews, 0),
          visitors: allVisitors,
          totalVisitors: allVisitors.length,
          totalBots: allVisitors.filter((v) => v.visitorKind === "bot").length,
        };
      });

    const dayGroups: DayGroup[] = dayGroupsRaw.map((day) => {
      const visible = day.visitors.filter((v) =>
        matchesAdminVisitorKind(v.visitorKind, visitorFilter)
      );
      const pageViews = visible.reduce((acc, v) => acc + v.pageViews, 0);
      return { ...day, visitors: visible, pageViews };
    });

    const todayGroup = dayGroups.find((d) => d.date === todayIstYmd);
    const todayRaw = dayGroupsRaw.find((d) => d.date === todayIstYmd);
    const todayVisitors = todayGroup?.visitors.length ?? 0;
    const todayPageViews = todayGroup?.pageViews ?? 0;

    const trafficBreakdown = new Map<string, number>();
    for (const v of todayGroup?.visitors ?? []) {
      // Only count high-confidence Google as "Google (search)" in cards
      let key = v.trafficLabel || "Unknown";
      if (
        v.trafficChannel === "google_organic" &&
        v.sourceConfidence &&
        v.sourceConfidence !== "high"
      ) {
        key = "Unknown / low-confidence";
      }
      trafficBreakdown.set(key, (trafficBreakdown.get(key) ?? 0) + 1);
    }

    const todaySuspected =
      todayRaw?.visitors.filter((v) => v.visitorKind === "suspected").length ?? 0;
    const todayBots =
      todayRaw?.visitors.filter((v) => v.visitorKind === "bot").length ?? 0;
    const todayHumans =
      todayRaw?.visitors.filter((v) => v.visitorKind === "human").length ?? 0;

    const googleHighConfidence =
      todayGroup?.visitors.filter(
        (v) =>
          v.trafficChannel === "google_organic" &&
          v.sourceConfidence === "high",
      ).length ?? 0;

    return {
      onlineCount: onlineIdSet.size,
      onlineSessions: sessions.filter((s) => onlineIdSet.has(s.sessionId)),
      dayGroups,
      todayVisitors,
      todayPageViews,
      trafficBreakdown: [...trafficBreakdown.entries()].sort(
        (a, b) => b[1] - a[1]
      ),
      todayBotsHidden: visitorFilter === "human" ? todayBots + todaySuspected : 0,
      todaySuspected,
      todayBots,
      todayHumans,
      googleHighConfidence,
    };
  }, [rows, sessions, todayIstYmd, visitorFilter]);

  const expandedGroup = analytics.dayGroups.find((d) => d.date === expandedDate);
  const expandedVisitors = expandedGroup?.visitors ?? [];

  useEffect(() => {
    if (expandedVisitors.length === 0) {
      setSelectedSessionId("");
      return;
    }
    const stillVisible = expandedVisitors.some(
      (v) => v.sessionId === selectedSessionId
    );
    if (!stillVisible) {
      setSelectedSessionId(expandedVisitors[0].sessionId);
    }
  }, [expandedDate, expandedVisitors, selectedSessionId]);

  const selectedVisitor = expandedVisitors.find(
    (v) => v.sessionId === selectedSessionId
  );

  const selectedTimeline = useMemo(() => {
    if (!selectedSessionId) return [];
    return rows
      .filter((r) => r.sessionId === selectedSessionId)
      .sort((a, b) => {
        const ta = toTimestamp(a.createdAt)?.toMillis() ?? 0;
        const tb = toTimestamp(b.createdAt)?.toMillis() ?? 0;
        return ta - tb;
      });
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
      <h1 className="font-display text-base font-bold text-ocean-900">
        Analytics
      </h1>
      <p className="mt-2 text-sm text-ocean-700">
        Confirmed humans by default. Suspected automation and bots are kept for
        debugging — they are not deleted. All times are <strong>IST (India)</strong>.
      </p>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Analytics v2:</strong> Google Search is only counted with a verified
        Google referrer (or organic UTM). Legacy records from before v2 may have
        inaccurate source or bot classification — open the{" "}
        <em>Suspected</em> tab to review zero-engagement / Linux scrapers.
      </div>

      {loadError ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Could not load analytics</p>
          <p className="mt-2 font-mono text-xs opacity-90">{loadError}</p>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-3 text-ocean-700">Loading…</p>
      ) : loadError ? null : (
        <>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-green-200 bg-green-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                Online humans
              </p>
              <p className="mt-1 font-display text-base font-bold text-green-900">
                {analytics.onlineCount}
              </p>
              <p className="mt-1 text-xs text-green-800">Active in last 2 minutes</p>
            </div>
            <div className="rounded-xl border border-ocean-200 bg-ocean-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
                Humans today
              </p>
              <p className="mt-1 font-display text-base font-bold text-ocean-900">
                {visitorFilter === "human"
                  ? analytics.todayVisitors
                  : analytics.todayHumans}
              </p>
              {analytics.todayBotsHidden > 0 && visitorFilter === "human" ? (
                <p className="mt-1 text-xs text-ocean-600">
                  {analytics.todayBotsHidden} bot/suspected hidden
                </p>
              ) : null}
              {analytics.todayHumans === 0 &&
              analytics.todaySuspected + analytics.todayBots === 0 ? (
                <p className="mt-1 text-[11px] leading-snug text-ocean-600">
                  Tip: Marketing leads can appear before page views. After deploy,
                  booking-form leads count as humans here. Also try the{" "}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => setVisitorFilter("all")}
                  >
                    All
                  </button>{" "}
                  tab.
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Suspected today
              </p>
              <p className="mt-1 font-display text-base font-bold text-amber-950">
                {analytics.todaySuspected}
              </p>
            </div>
            <div className="rounded-xl border border-ocean-200 bg-ocean-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
                Page views (filtered)
              </p>
              <p className="mt-1 font-display text-base font-bold text-ocean-900">
                {analytics.todayPageViews}
              </p>
              <p className="mt-1 text-xs text-ocean-600">
                High-confidence Google organic: {analytics.googleHighConfidence}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-ocean-800">
              Show in visitor list
            </p>
            <div
              className="inline-flex flex-wrap rounded-xl border border-ocean-200 bg-white p-1 shadow-sm"
              role="group"
              aria-label="Visitor type filter"
            >
              {(
                [
                  ["human", "Humans"],
                  ["suspected", "Suspected"],
                  ["bot", "Bots"],
                  ["all", "All"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setVisitorFilter(value);
                    setSelectedSessionId("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    visitorFilter === value
                      ? "bg-ocean-800 text-white shadow-sm"
                      : "text-ocean-700 hover:bg-ocean-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {analytics.trafficBreakdown.length > 0 ? (
            <div className="mt-3 rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-ocean-900">
                Today — where visitors came from
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {analytics.trafficBreakdown.map(([label, n]) => (
                  <li
                    key={label}
                    className="rounded-full border border-ocean-100 bg-sand/60 px-3 py-1 text-sm text-ocean-900"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="ml-1.5 text-ocean-600">({n})</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ocean-500">
                New visits only — older sessions may show &quot;—&quot; until
                visitors return with the updated tracker.
              </p>
            </div>
          ) : null}

          <div className="mt-4">
            <h2 className="font-display text-base font-semibold text-ocean-900">
              Visitors by date
            </h2>
            <p className="mt-1 text-sm text-ocean-600">
              Tap a date to expand. Only one day is open at a time. Today opens
              by default.
            </p>

            <div className="mt-4 space-y-2">
              {analytics.dayGroups.map((day) => {
                const isOpen = expandedDate === day.date;
                return (
                  <div
                    key={day.date}
                    className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${
                      isOpen
                        ? "border-ocean-300 bg-white"
                        : "border-ocean-100 bg-white/90"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedDate(day.date);
                        setSelectedSessionId("");
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ocean-50/50"
                      aria-expanded={isOpen}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-transform ${
                            isOpen
                              ? "rotate-90 bg-ocean-200 text-ocean-900"
                              : "bg-ocean-100 text-ocean-700"
                          }`}
                          aria-hidden
                        >
                          ›
                        </span>
                        <div>
                          <p className="font-semibold text-ocean-900">
                            {day.label}
                          </p>
                          <p className="text-xs text-ocean-500">{day.date}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <p className="font-semibold text-ocean-900">
                          {day.visitors.length} visitor
                          {day.visitors.length === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-ocean-600">
                          {day.pageViews} page view
                          {day.pageViews === 1 ? "" : "s"}
                        </p>
                        {visitorFilter === "human" && day.totalBots > 0 ? (
                          <p className="text-[10px] text-ocean-500">
                            {day.totalBots} bot{day.totalBots === 1 ? "" : "s"}{" "}
                            on this day
                          </p>
                        ) : null}
                        {visitorFilter === "bot" &&
                        day.totalVisitors > day.totalBots ? (
                          <p className="text-[10px] text-ocean-500">
                            {day.totalVisitors - day.totalBots} other
                            {day.totalVisitors - day.totalBots === 1
                              ? ""
                              : "s"}{" "}
                            on this day
                          </p>
                        ) : null}
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-ocean-100 px-4 pb-4 pt-2">
                        {day.visitors.length === 0 ? (
                          <p className="py-3 text-center text-sm text-ocean-600">
                            {visitorFilter === "bot"
                              ? "No bots recorded on this day."
                              : visitorFilter === "human"
                                ? "No human visitors on this day."
                                : "No visitors recorded on this day."}
                          </p>
                        ) : (
                          <div className="grid gap-2.5 lg:grid-cols-2">
                            <ul className="max-h-[36rem] space-y-2 overflow-y-auto">
                              {day.visitors.map((v) => (
                                <li key={v.sessionId}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedSessionId(v.sessionId)
                                    }
                                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                                      selectedSessionId === v.sessionId
                                        ? "border-ocean-400 bg-ocean-50 ring-1 ring-ocean-200"
                                        : "border-ocean-100 bg-sand/30 hover:border-ocean-200"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {v.isOnline ? (
                                          <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                                            Online
                                          </span>
                                        ) : null}
                                        {v.visitorKind === "bot" ? (
                                          <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
                                            Bot · {v.botLabel}
                                          </span>
                                        ) : null}
                                        {v.visitorKind === "suspected" ? (
                                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                                            Suspected
                                          </span>
                                        ) : null}
                                        {v.analyticsVersion < 2 ? (
                                          <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                                            Legacy
                                          </span>
                                        ) : null}
                                        {v.trafficChannel ? (
                                          <span
                                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${trafficChannelStyles(v.trafficChannel)}`}
                                          >
                                            {v.trafficLabel}
                                          </span>
                                        ) : null}
                                      </div>
                                      <span className="text-xs text-ocean-500">
                                        {formatDurationMs(v.totalDurationMs)}{" "}
                                        on site
                                      </span>
                                    </div>

                                    <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                                      <p className="text-ocean-800">
                                        <span className="font-medium text-ocean-900">
                                          Arrived:
                                        </span>{" "}
                                        {formatTs(v.arrivedAt)}
                                      </p>
                                      <p className="text-ocean-800">
                                        <span className="font-medium text-ocean-900">
                                          Left:
                                        </span>{" "}
                                        {v.isOnline
                                          ? "Still browsing"
                                          : formatTs(v.leftAt)}
                                      </p>
                                    </div>

                                    {v.geoLine ? (
                                      <p className="mt-1.5 text-xs text-ocean-700">
                                        <span className="font-medium">
                                          Location:
                                        </span>{" "}
                                        {v.geoLine}
                                      </p>
                                    ) : (
                                      <p className="mt-1.5 text-xs text-ocean-500">
                                        Location: not available (local dev or
                                        missing IP headers)
                                      </p>
                                    )}

                                    {v.trafficDetail &&
                                    v.trafficDetail !== v.trafficLabel ? (
                                      <p className="mt-0.5 text-xs text-ocean-600">
                                        Source detail: {v.trafficDetail}
                                      </p>
                                    ) : null}

                                    <p className="mt-1.5 text-xs text-ocean-700">
                                      {v.uniquePages} page
                                      {v.uniquePages === 1 ? "" : "s"} ·{" "}
                                      {v.pageViews} page view
                                      {v.pageViews === 1 ? "" : "s"} ·{" "}
                                      {v.deviceCategory}
                                      {v.deviceLabel ? ` · ${v.deviceLabel}` : ""}
                                    </p>
                                    <p className="mt-0.5 truncate font-mono text-xs text-ocean-600">
                                      Last: {v.lastPath}
                                    </p>
                                  </button>
                                </li>
                              ))}
                            </ul>

                            <div className="rounded-xl border border-ocean-100 bg-sand/20 p-3">
                              {!selectedVisitor ? (
                                <p className="text-sm text-ocean-600">
                                  Select a visitor to see page-by-page time.
                                </p>
                              ) : (
                                <>
                                  <h3 className="font-semibold text-ocean-900">
                                    Visit details
                                  </h3>
                                  <dl className="mt-2 space-y-1.5 text-xs text-ocean-800">
                                    <div className="flex gap-2">
                                      <dt className="w-24 shrink-0 font-medium text-ocean-900">
                                        Arrived
                                      </dt>
                                      <dd>{formatTs(selectedVisitor.arrivedAt)}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-24 shrink-0 font-medium text-ocean-900">
                                        Left
                                      </dt>
                                      <dd>
                                        {selectedVisitor.isOnline
                                          ? "Still browsing"
                                          : formatTs(selectedVisitor.leftAt)}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-24 shrink-0 font-medium text-ocean-900">
                                        Total time
                                      </dt>
                                      <dd>
                                        {formatDurationMs(
                                          selectedVisitor.totalDurationMs
                                        )}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-24 shrink-0 font-medium text-ocean-900">
                                        Location
                                      </dt>
                                      <dd>
                                        {selectedVisitor.geoLine || "—"}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-24 shrink-0 font-medium text-ocean-900">
                                        Visitor type
                                      </dt>
                                      <dd>
                                        {selectedVisitor.visitorKind === "bot"
                                          ? `Bot (${selectedVisitor.botLabel})`
                                          : selectedVisitor.visitorKind === "suspected"
                                            ? "Suspected automation"
                                            : "Human"}
                                        {selectedVisitor.sourceConfidence
                                          ? ` · ${selectedVisitor.sourceConfidence} confidence`
                                          : ""}
                                        {selectedVisitor.attributionReason
                                          ? ` · ${selectedVisitor.attributionReason}`
                                          : ""}
                                        {selectedVisitor.analyticsVersion < 2
                                          ? " · legacy"
                                          : " · v2"}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-24 shrink-0 font-medium text-ocean-900">
                                        Came from
                                      </dt>
                                      <dd>
                                        {selectedVisitor.trafficLabel !== "—"
                                          ? selectedVisitor.trafficLabel
                                          : "Not recorded"}
                                        {selectedVisitor.trafficDetail &&
                                        selectedVisitor.trafficDetail !==
                                          selectedVisitor.trafficLabel
                                          ? ` (${selectedVisitor.trafficDetail})`
                                          : ""}
                                      </dd>
                                    </div>
                                    {selectedVisitor.landingPath &&
                                    selectedVisitor.landingPath !== "—" ? (
                                      <div className="flex gap-2">
                                        <dt className="w-24 shrink-0 font-medium text-ocean-900">
                                          Landing page
                                        </dt>
                                        <dd className="break-all font-mono">
                                          {selectedVisitor.landingPath}
                                        </dd>
                                      </div>
                                    ) : null}
                                  </dl>

                                  <h4 className="mt-4 text-sm font-semibold text-ocean-900">
                                    Pages viewed & time on each
                                  </h4>
                                  {selectedVisitor.pages.length === 0 ? (
                                    <p className="mt-2 text-xs text-ocean-600">
                                      No page data yet.
                                    </p>
                                  ) : (
                                    <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                                      {selectedVisitor.pages.map((p) => (
                                        <li
                                          key={p.path}
                                          className="rounded-lg border border-ocean-100 bg-white px-2.5 py-2 text-xs"
                                        >
                                          <p className="font-mono font-semibold text-ocean-900">
                                            {p.path}
                                          </p>
                                          {p.label && p.label !== p.path ? (
                                            <p className="text-ocean-700">
                                              {p.label}
                                            </p>
                                          ) : null}
                                          <p className="mt-0.5 text-ocean-600">
                                            Time on page:{" "}
                                            <span className="font-medium text-ocean-900">
                                              {formatDurationMs(p.durationMs)}
                                            </span>
                                            {p.views > 1
                                              ? ` · opened ${p.views}×`
                                              : ""}
                                          </p>
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  <h4 className="mt-4 text-sm font-semibold text-ocean-900">
                                    Activity timeline
                                  </h4>
                                  <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto text-xs">
                                    {selectedTimeline.map((r) => (
                                      <li
                                        key={r.id}
                                        className="rounded-lg border border-ocean-50 bg-white px-2 py-1.5"
                                      >
                                        <span className="text-ocean-600">
                                          {formatTs(r.createdAt)}
                                        </span>
                                        <span className="mx-1 text-ocean-300">
                                          ·
                                        </span>
                                        <span className="font-medium text-ocean-900">
                                          {r.eventType || "view"}
                                        </span>
                                        {r.durationMs ? (
                                          <span className="text-ocean-600">
                                            {" "}
                                            · {formatDurationMs(r.durationMs)}
                                          </span>
                                        ) : null}
                                        <p className="truncate font-mono text-ocean-800">
                                          {r.path}
                                        </p>
                                        {r.eventType === "click" && r.clickLabel ? (
                                          <p className="text-ocean-600">
                                            Click: {r.clickLabel}
                                          </p>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-xs text-ocean-500">
            Showing the latest {SAMPLE_LIMIT.toLocaleString("en-IN")} events.
            Location uses Vercel/Cloudflare IP headers on production.
          </p>
        </>
      )}
    </div>
  );
}

