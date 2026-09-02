"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { adminFetch } from "@/lib/admin-fetch";
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
  trafficChannelFromLabel,
  resolveTrafficDisplay,
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
  clickHref?: string;
  clickCategory?: string;
  clickTarget?: string;
  durationMs: number | null;
  deviceCategory: DeviceCategory | "";
  deviceLabel: string;
  uaSnippet: string;
  isBot?: boolean;
  createdAt: unknown;
  geoCountry?: string;
  geoCountryName?: string;
  geoCity?: string;
  geoRegion?: string;
  geoRegionName?: string;
  geoTimezone?: string;
  timeZone?: string;
  language?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  trafficChannel?: string;
  trafficLabel?: string;
  trafficDetail?: string;
  source?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
};

type RecentEvent = {
  atMs?: number;
  eventType?: string;
  path?: string;
  clickLabel?: string;
  clickHref?: string;
  clickCategory?: string;
  clickTarget?: string;
  durationMs?: number;
  pageLabel?: string;
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
  geoCountryName?: string;
  geoCity?: string;
  geoRegion?: string;
  geoRegionName?: string;
  geoTimezone?: string;
  timeZone?: string;
  language?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  visitorId?: string;
  visitorVisitCount?: number;
  isReturningVisitor?: boolean;
  trafficChannel?: string;
  trafficLabel?: string;
  trafficDetail?: string;
  source?: string;
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
  interactionCount?: number;
  maxScrollDepthPct?: number;
  visitedPaths?: string[];
  pageViewCount?: number;
  engagedMs?: number;
  currentPageActiveMs?: number;
  pageDurationsMs?: Record<string, number>;
  pageViewCounts?: Record<string, number>;
  pageLabels?: Record<string, string>;
  recentEvents?: RecentEvent[];
  hasLeadCapture?: boolean;
  hasBookingIntent?: boolean;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadSource?: string;
  interestedItem?: string;
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
  deviceLine: string;
  geoLine: string;
  timeZone: string;
  language: string;
  screenWidth?: number;
  screenHeight?: number;
  visitorVisitCount: number;
  isReturningVisitor: boolean;
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
  hasLeadCapture: boolean;
  hasBookingIntent: boolean;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  leadSource: string;
};

function visitorHasSavedLead(v: VisitorSummary): boolean {
  if (v.hasLeadCapture) return true;
  const phone = v.leadPhone.replace(/\D/g, "");
  if (phone.length >= 10) return true;
  const email = v.leadEmail.trim();
  if (email.includes("@") && email.includes(".")) return true;
  const name = v.leadName.trim();
  if (name.length >= 2) return true;
  return false;
}

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
    "whatsapp",
    "youtube",
    "twitter",
    "linkedin",
    "tiktok",
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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMsIst(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return "—";
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

function pickGeoFields(data: Record<string, unknown>) {
  return {
    geoCountry: String(data.geoCountry ?? "").trim() || undefined,
    geoCountryName: String(data.geoCountryName ?? "").trim() || undefined,
    geoCity: String(data.geoCity ?? "").trim() || undefined,
    geoRegion: String(data.geoRegion ?? "").trim() || undefined,
    geoRegionName: String(data.geoRegionName ?? "").trim() || undefined,
    geoTimezone: String(data.geoTimezone ?? "").trim() || undefined,
  };
}

function pickDeviceMeta(data: Record<string, unknown>) {
  const num = (k: string) => {
    const v = data[k];
    return typeof v === "number" && Number.isFinite(v) && v > 0
      ? Math.round(v)
      : undefined;
  };
  return {
    timeZone: String(data.timeZone ?? "").trim() || undefined,
    language: String(data.language ?? "").trim() || undefined,
    screenWidth: num("screenWidth"),
    screenHeight: num("screenHeight"),
    viewportWidth: num("viewportWidth"),
    viewportHeight: num("viewportHeight"),
  };
}

function formatDeviceLine(parts: {
  deviceCategory?: string;
  deviceLabel?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  language?: string;
  timeZone?: string;
}): string {
  const bits: string[] = [];
  const label = parts.deviceLabel?.trim();
  const cat = parts.deviceCategory?.trim();
  if (label) bits.push(label);
  else if (cat && cat !== "unknown") bits.push(cat);
  if (parts.screenWidth && parts.screenHeight) {
    bits.push(`${parts.screenWidth}×${parts.screenHeight}`);
  } else if (parts.viewportWidth && parts.viewportHeight) {
    bits.push(`viewport ${parts.viewportWidth}×${parts.viewportHeight}`);
  }
  if (parts.language) bits.push(parts.language);
  if (parts.timeZone) bits.push(parts.timeZone);
  return bits.join(" · ");
}

function deviceCategoryStyles(cat: string): string {
  switch (cat) {
    case "mobile":
      return "bg-violet-100 text-violet-900 border-violet-200";
    case "tablet":
      return "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200";
    case "desktop":
      return "bg-sky-100 text-sky-900 border-sky-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function pickTrafficFields(data: Record<string, unknown>) {
  return {
    trafficChannel: String(data.trafficChannel ?? "").trim() || undefined,
    trafficLabel: String(data.trafficLabel ?? "").trim() || undefined,
    trafficDetail: String(data.trafficDetail ?? "").trim() || undefined,
    source: String(data.source ?? "").trim() || undefined,
    referrerHost: String(data.referrerHost ?? "").trim() || undefined,
    utmSource: String(data.utmSource ?? "").trim() || undefined,
    utmMedium: String(data.utmMedium ?? "").trim() || undefined,
    utmCampaign: String(data.utmCampaign ?? "").trim() || undefined,
    landingPath: String(data.landingPath ?? "").trim() || undefined,
  };
}

function pathStayKey(path: string): string {
  const raw = path.trim() || "/";
  return raw.replace(/[/.]/g, "_").replace(/_+/g, "_").slice(0, 180) || "_root";
}

function buildPageStays(
  sessionRows: Row[],
  sess?: SessionDoc,
): PageStay[] {
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
    if (r.eventType === "leave" && (r.durationMs ?? 0) > 0) {
      existing.durationMs += r.durationMs ?? 0;
    }
    map.set(r.path, existing);
  }

  // Fill gaps from denormalized session fields (survives missing pageViews).
  const paths = new Set<string>([
    ...map.keys(),
    ...(sess?.visitedPaths ?? []),
    ...(sess?.lastPath ? [sess.lastPath] : []),
  ]);
  for (const path of paths) {
    if (!path) continue;
    const key = pathStayKey(path);
    const fromSessDuration = sess?.pageDurationsMs?.[key] ?? 0;
    const fromSessViews = sess?.pageViewCounts?.[key] ?? 0;
    const fromSessLabel = sess?.pageLabels?.[key] ?? "";
    const existing = map.get(path) ?? {
      path,
      label: shortenPageLabel(fromSessLabel) || path,
      durationMs: 0,
      views: 0,
    };
    if (fromSessViews > existing.views) existing.views = fromSessViews;
    if (existing.views < 1) existing.views = 1;
    if (fromSessDuration > existing.durationMs) {
      existing.durationMs = fromSessDuration;
    }
    if (fromSessLabel) {
      existing.label = shortenPageLabel(fromSessLabel) || existing.label;
    }
    // Live time on the current page (heartbeat snapshot).
    if (
      sess?.lastPath === path &&
      (sess.currentPageActiveMs ?? 0) > existing.durationMs
    ) {
      existing.durationMs = sess.currentPageActiveMs ?? 0;
    }
    map.set(path, existing);
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
  const arrivedAtMs =
    toTimestamp(sess?.firstSeenAt)?.toMillis() ??
    toTimestamp(first?.createdAt)?.toMillis() ??
    toTimestamp(sess?.lastSeenAt)?.toMillis() ??
    0;
  const leftAtMs = Math.max(
    toTimestamp(sess?.lastSeenAt)?.toMillis() ?? 0,
    toTimestamp(last?.createdAt)?.toMillis() ?? 0,
    arrivedAtMs,
  );
  const leaveDurationMs = sorted
    .filter((r) => r.eventType === "leave")
    .reduce((acc, r) => acc + (r.durationMs ?? 0), 0);
  const pages = buildPageStays(sorted, sess);
  const geoSource = sess ?? first;
  const rowWithTraffic =
    sorted.find((r) => r.trafficChannel || r.trafficLabel) ??
    sorted.find((r) => r.source || r.referrerHost || r.utmSource);
  const trafficSource =
    sess?.trafficChannel || sess?.trafficLabel
      ? sess
      : rowWithTraffic ?? sess ?? first;
  const pageViewsFromEvents = sorted.filter((r) => r.eventType === "view").length;
  const pageViews = Math.max(
    pageViewsFromEvents,
    sess?.pageViewCount ?? 0,
    pages.reduce((acc, p) => acc + p.views, 0),
    sess?.lastPath || pages.length ? 1 : 0,
  );
  const totalDurationMs = Math.max(
    leaveDurationMs,
    sess?.engagedMs ?? 0,
    pages.reduce((acc, p) => acc + p.durationMs, 0),
    onlineIdSet.has(sid)
      ? Math.max(0, Date.now() - arrivedAtMs)
      : 0,
  );
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
    totalDurationMs:
      totalDurationMs || Math.max(0, leftAtMs - arrivedAtMs),
    pageViews,
    interactionCount: sess?.interactionCount,
    analyticsVersion: sess?.analyticsVersion,
  });

  const deviceCategory = (first?.deviceCategory ||
    sess?.deviceCategory ||
    "unknown") as DeviceCategory | "unknown";
  const deviceLabel = sess?.deviceLabel || first?.deviceLabel || "";
  const timeZone =
    sess?.timeZone || first?.timeZone || sess?.geoTimezone || "";
  const language = sess?.language || first?.language || "";
  const screenWidth = sess?.screenWidth ?? first?.screenWidth;
  const screenHeight = sess?.screenHeight ?? first?.screenHeight;
  const viewportWidth = sess?.viewportWidth ?? first?.viewportWidth;
  const viewportHeight = sess?.viewportHeight ?? first?.viewportHeight;
  const visitorVisitCount = Math.max(
    0,
    Math.round(Number(sess?.visitorVisitCount) || 0),
  );
  const isReturningVisitor =
    sess?.isReturningVisitor === true || visitorVisitCount > 1;

  return {
    sessionId: sid,
    arrivedAt: sess?.firstSeenAt ?? first?.createdAt ?? sess?.lastSeenAt,
    leftAt: sess?.lastSeenAt ?? last?.createdAt,
    arrivedAtMs,
    leftAtMs,
    totalDurationMs:
      totalDurationMs || Math.max(0, leftAtMs - arrivedAtMs),
    pageViews,
    uniquePages: Math.max(pages.length, sess?.visitedPaths?.length ?? 0),
    pages,
    lastPath: last?.path ?? sess?.lastPath ?? "—",
    deviceCategory,
    deviceLabel,
    deviceLine: formatDeviceLine({
      deviceCategory,
      deviceLabel,
      screenWidth,
      screenHeight,
      viewportWidth,
      viewportHeight,
      language,
      timeZone,
    }),
    geoLine: formatGeoLine({
      geoCity: geoSource?.geoCity,
      geoRegion: geoSource?.geoRegion,
      geoRegionName: geoSource?.geoRegionName,
      geoCountry: geoSource?.geoCountry,
      geoCountryName: geoSource?.geoCountryName,
      geoTimezone: geoSource?.geoTimezone ?? sess?.geoTimezone,
      timeZone: sess?.timeZone || first?.timeZone,
    }),
    timeZone,
    language,
    screenWidth,
    screenHeight,
    visitorVisitCount,
    isReturningVisitor,
    ...(() => {
      const resolved = resolveTrafficDisplay({
        trafficChannel:
          trafficSource?.trafficChannel ?? sess?.trafficChannel,
        trafficLabel:
          trafficSource?.trafficLabel ??
          sess?.trafficLabel ??
          rowWithTraffic?.trafficLabel,
        trafficDetail:
          trafficSource?.trafficDetail ?? sess?.trafficDetail,
        referrerHost:
          sess?.referrerHost ??
          trafficSource?.referrerHost ??
          rowWithTraffic?.referrerHost,
        source:
          sess?.source ??
          trafficSource?.source ??
          rowWithTraffic?.source,
      });
      return {
        trafficChannel: normalizeTrafficChannel(resolved.channel) ||
          normalizeTrafficChannel(
            trafficSource?.trafficChannel ?? sess?.trafficChannel,
          ),
        trafficLabel: resolved.badgeLabel,
        trafficDetail: resolved.detail,
      };
    })(),
    landingPath: (() => {
      const candidates = [
        sess?.landingPath,
        first?.landingPath,
        sorted.find((r) => r.landingPath)?.landingPath,
        sess?.visitedPaths?.[0],
        pages[0]?.path,
        first?.path,
        sess?.lastPath,
      ];
      for (const c of candidates) {
        const p = String(c ?? "").trim();
        if (p && p !== "—") return p;
      }
      return "—";
    })(),
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
    hasLeadCapture: sess?.hasLeadCapture === true,
    hasBookingIntent: sess?.hasBookingIntent === true,
    leadName: String(sess?.leadName ?? "").trim(),
    leadEmail: String(sess?.leadEmail ?? "").trim(),
    leadPhone: String(sess?.leadPhone ?? "").trim(),
    leadSource: String(sess?.leadSource ?? "").trim(),
  };
}

type CapturedLeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  sessionId: string;
  interestedItem: string;
  capturePath: string;
  updatedAt: unknown;
};

function exportCapturedLeadsCsv(leads: CapturedLeadRow[]) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Source",
    "Session ID",
    "Page",
    "Interested",
    "Saved at (IST)",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = leads.map((l) =>
    [
      l.name,
      l.email,
      l.phone,
      l.source,
      l.sessionId,
      l.capturePath,
      l.interestedItem,
      formatTs(l.updatedAt),
    ]
      .map((c) => esc(String(c)))
      .join(","),
  );
  const csv = [headers.map((h) => esc(h)).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `visitor-leads-${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Keep small — this page used to poll 5k+2k docs every 20s (~7k reads/poll). */
const SAMPLE_LIMIT = 400;
const SESSION_LIMIT = 150;
/** Heartbeat is ~3 min — allow two missed beats before going offline. */
const ONLINE_WINDOW_MS = 420_000;
const ANALYTICS_POLL_MS = 120_000;
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
  const [leadOnly, setLeadOnly] = useState(false);
  const [sessionTimeline, setSessionTimeline] = useState<Row[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [gscToday, setGscToday] = useState<{
    ok: boolean;
    date: string;
    impressions: number;
    clicks: number;
    error?: string;
    note?: string;
    isLatestAvailable?: boolean;
  } | null>(null);
  const [gscLoading, setGscLoading] = useState(true);
  const [capturedLeads, setCapturedLeads] = useState<CapturedLeadRow[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  const todayIstYmd = useMemo(
    () =>
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    []
  );

  const popupLeadsToday = useMemo(() => {
    return capturedLeads.filter((l) => {
      if (l.source !== "visitor_popup") return false;
      const ts = toTimestamp(l.updatedAt);
      if (!ts) return false;
      return istCalendarDate(ts) === todayIstYmd;
    });
  }, [capturedLeads, todayIstYmd]);

  const popupLeadsAll = useMemo(
    () => capturedLeads.filter((l) => l.source === "visitor_popup"),
    [capturedLeads],
  );

  useEffect(() => {
    if (!expandedDate) setExpandedDate(todayIstYmd);
  }, [expandedDate, todayIstYmd]);

  useEffect(() => {
    let cancelled = false;
    const loadGsc = async () => {
      setGscLoading(true);
      try {
        const data = await adminFetch("/api/admin/analytics/gsc-today");
        if (!cancelled) setGscToday(data);
      } catch (e) {
        if (!cancelled) {
          setGscToday({
            ok: false,
            date: todayIstYmd,
            impressions: 0,
            clicks: 0,
            error:
              e instanceof Error ? e.message : "Could not load GSC data",
          });
        }
      } finally {
        if (!cancelled) setGscLoading(false);
      }
    };
    void loadGsc();
    return () => {
      cancelled = true;
    };
  }, [todayIstYmd]);

  useEffect(() => {
    if (!db) {
      setLeadsLoading(false);
      return;
    }
    let cancelled = false;
    const loadLeads = async () => {
      try {
        const q = query(
          collection(db, "marketingLeads"),
          orderBy("updatedAt", "desc"),
          limit(200),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const rows: CapturedLeadRow[] = snap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            name: String(x.name ?? ""),
            phone: String(x.phone ?? d.id),
            email: String(x.email ?? ""),
            source: String(x.source ?? ""),
            sessionId: String(x.sessionId ?? ""),
            interestedItem: String(x.interestedItem ?? ""),
            capturePath: String(x.capturePath ?? ""),
            updatedAt: x.updatedAt,
          };
        });
        setCapturedLeads(rows);
      } catch {
        if (!cancelled) setCapturedLeads([]);
      } finally {
        if (!cancelled) setLeadsLoading(false);
      }
    };
    void loadLeads();
    const poll = window.setInterval(() => void loadLeads(), ANALYTICS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async (isInitial: boolean) => {
      if (isInitial) setLoadError(null);
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
          const deviceMeta = pickDeviceMeta(data);
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
            clickHref: String(data.clickHref ?? "") || undefined,
            clickCategory: String(data.clickCategory ?? "") || undefined,
            clickTarget: String(data.clickTarget ?? "") || undefined,
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
            ...deviceMeta,
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
            visitorId: String(data.visitorId ?? "").trim() || undefined,
            visitorVisitCount:
              typeof data.visitorVisitCount === "number"
                ? data.visitorVisitCount
                : undefined,
            isReturningVisitor:
              typeof data.isReturningVisitor === "boolean"
                ? data.isReturningVisitor
                : undefined,
            visitorType: String(data.visitorType ?? "") || undefined,
            sourceConfidence: String(data.sourceConfidence ?? "") || undefined,
            attributionReason: String(data.attributionReason ?? "") || undefined,
            analyticsVersion:
              typeof data.analyticsVersion === "number"
                ? data.analyticsVersion
                : undefined,
            rawReferrer: String(data.rawReferrer ?? "") || undefined,
            interactionCount:
              typeof data.interactionCount === "number"
                ? data.interactionCount
                : undefined,
            maxScrollDepthPct:
              typeof data.maxScrollDepthPct === "number"
                ? data.maxScrollDepthPct
                : undefined,
            visitedPaths: Array.isArray(data.visitedPaths)
              ? data.visitedPaths.map((p) => String(p)).filter(Boolean)
              : undefined,
            pageViewCount:
              typeof data.pageViewCount === "number"
                ? data.pageViewCount
                : undefined,
            engagedMs:
              typeof data.engagedMs === "number" ? data.engagedMs : undefined,
            currentPageActiveMs:
              typeof data.currentPageActiveMs === "number"
                ? data.currentPageActiveMs
                : undefined,
            pageDurationsMs:
              data.pageDurationsMs &&
              typeof data.pageDurationsMs === "object"
                ? (data.pageDurationsMs as Record<string, number>)
                : undefined,
            pageViewCounts:
              data.pageViewCounts && typeof data.pageViewCounts === "object"
                ? (data.pageViewCounts as Record<string, number>)
                : undefined,
            pageLabels:
              data.pageLabels && typeof data.pageLabels === "object"
                ? (data.pageLabels as Record<string, string>)
                : undefined,
            recentEvents: Array.isArray(data.recentEvents)
              ? (data.recentEvents as RecentEvent[]).slice(-50)
              : undefined,
            hasLeadCapture:
              typeof data.hasLeadCapture === "boolean"
                ? data.hasLeadCapture
                : undefined,
            hasBookingIntent:
              typeof data.hasBookingIntent === "boolean"
                ? data.hasBookingIntent
                : undefined,
            leadName: String(data.leadName ?? "").trim() || undefined,
            leadEmail: String(data.leadEmail ?? "").trim() || undefined,
            leadPhone: String(data.leadPhone ?? "").trim() || undefined,
            leadSource: String(data.leadSource ?? "").trim() || undefined,
            interestedItem: String(data.interestedItem ?? "").trim() || undefined,
            ...pickGeoFields(data),
            ...pickDeviceMeta(data),
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
        if (isInitial) {
          setLoadError(msg);
          setRows([]);
          setSessions([]);
        }
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    };

    void load(true);
    // Sparse poll — pause while the tab is hidden to stop runaway Firestore reads.
    const poll = window.setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void load(false);
    }, ANALYTICS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
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
          interactionCount: sess?.interactionCount,
          analyticsVersion: sess?.analyticsVersion,
        }),
      );
    }
    for (const s of sessions) {
      if (!sessionKind.has(s.sessionId)) {
        const firstMs = toTimestamp(s.firstSeenAt)?.toMillis() ?? 0;
        const lastMs = toTimestamp(s.lastSeenAt)?.toMillis() ?? 0;
        sessionKind.set(
          s.sessionId,
          resolveAdminVisitorKind({
            isBot: resolveIsBot(s.isBot, s.uaSnippet),
            visitorType: s.visitorType,
            uaSnippet: s.uaSnippet,
            deviceLabel: s.deviceLabel,
            trafficChannel: s.trafficChannel,
            sourceConfidence: s.sourceConfidence,
            totalDurationMs: Math.max(0, lastMs - firstMs),
            pageViews: s.lastPath ? 1 : 0,
            interactionCount: s.interactionCount,
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
          const age = now - ts.toMillis();
          if (age > ONLINE_WINDOW_MS) return false;
          // Heartbeats keep Online even after a soft tab-hide; hard leave ends it.
          if (s.lastEventType === "leave" && s.isActive === false) return false;
          return true;
        })
        .map((s) => s.sessionId)
    );

    const visitorsByDay = new Map<string, VisitorSummary[]>();
    const listedSessionIds = new Set<string>();

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
      listedSessionIds.add(sid);
    }

    // Include sessions whose pageViews fell out of the 5k event sample
    // (otherwise GA4/Clarity humans can look "missing" on Today).
    for (const s of sessions) {
      if (!s.sessionId || listedSessionIds.has(s.sessionId)) continue;
      const firstTs =
        toTimestamp(s.firstSeenAt) || toTimestamp(s.lastSeenAt);
      if (!firstTs) continue;
      const day = istCalendarDate(firstTs);
      const summary = buildVisitorSummary(
        s.sessionId,
        rowsBySession.get(s.sessionId) ?? [],
        s,
        onlineIdSet
      );
      if (!summary.arrivedAtMs) continue;
      const list = visitorsByDay.get(day) ?? [];
      list.push(summary);
      visitorsByDay.set(day, list);
      listedSessionIds.add(s.sessionId);
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
      const visible = day.visitors.filter((v) => {
        if (!matchesAdminVisitorKind(v.visitorKind, visitorFilter)) return false;
        if (leadOnly && !visitorHasSavedLead(v)) return false;
        return true;
      });
      const pageViews = visible.reduce((acc, v) => acc + v.pageViews, 0);
      return { ...day, visitors: visible, pageViews };
    });

    const todayGroup = dayGroups.find((d) => d.date === todayIstYmd);
    const todayRaw = dayGroupsRaw.find((d) => d.date === todayIstYmd);
    const todayVisitors = todayGroup?.visitors.length ?? 0;
    const todayPageViews = todayGroup?.pageViews ?? 0;

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
      todayBotsHidden: visitorFilter === "human" ? todayBots + todaySuspected : 0,
      todaySuspected,
      todayBots,
      todayHumans,
      googleHighConfidence,
    };
  }, [rows, sessions, todayIstYmd, visitorFilter, leadOnly]);

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

  useEffect(() => {
    if (!db || !selectedSessionId) {
      setSessionTimeline([]);
      setTimelineError(null);
      return;
    }
    let cancelled = false;
    setTimelineLoading(true);
    setTimelineError(null);

    const mapDocs = (
      docs: Array<{ id: string; data: () => Record<string, unknown> }>,
    ): Row[] =>
      docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
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
          clickHref: String(data.clickHref ?? "") || undefined,
          clickCategory: String(data.clickCategory ?? "") || undefined,
          clickTarget: String(data.clickTarget ?? "") || undefined,
          durationMs: toNumberOrNull(data.durationMs),
          deviceCategory: normalizeDeviceCategory(
            String(data.deviceCategory ?? ""),
          ),
          deviceLabel: String(data.deviceLabel ?? ""),
          uaSnippet: String(data.uaSnippet ?? ""),
          createdAt: data.createdAt,
          ...pickGeoFields(data),
          ...pickTrafficFields(data),
        };
      });

    const load = async () => {
      try {
        // Prefer composite index query; fall back to equality-only if index missing.
        let list: Row[] = [];
        try {
          const q = query(
            collection(db, "pageViews"),
            where("sessionId", "==", selectedSessionId),
            orderBy("createdAt", "asc"),
            limit(200),
          );
          const snap = await getDocs(q);
          if (cancelled) return;
          list = mapDocs(snap.docs);
        } catch {
          const q2 = query(
            collection(db, "pageViews"),
            where("sessionId", "==", selectedSessionId),
            limit(200),
          );
          const snap2 = await getDocs(q2);
          if (cancelled) return;
          list = mapDocs(snap2.docs).sort((a, b) => {
            const am = toTimestamp(a.createdAt)?.toMillis() ?? 0;
            const bm = toTimestamp(b.createdAt)?.toMillis() ?? 0;
            return am - bm;
          });
          if (!cancelled) {
            setTimelineError(
              "Using fallback timeline query (deploy Firestore index for faster loads).",
            );
          }
        }
        if (!cancelled) setSessionTimeline(list);
      } catch (e: unknown) {
        if (!cancelled) {
          setSessionTimeline([]);
          setTimelineError(
            e && typeof e === "object" && "message" in e
              ? String((e as { message?: string }).message)
              : "Could not load timeline events",
          );
        }
      } finally {
        if (!cancelled) setTimelineLoading(false);
      }
    };
    void load();
    const poll = window.setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void load();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [db, selectedSessionId]);

  const selectedTimeline = useMemo(() => {
    if (!selectedSessionId)
      return [] as Array<{
        id: string;
        atMs: number;
        eventType: string;
        path: string;
        clickLabel?: string;
        clickHref?: string;
        clickCategory?: string;
        durationMs?: number | null;
      }>;

    const fromQuery = sessionTimeline.map((r) => ({
      id: r.id,
      atMs: toTimestamp(r.createdAt)?.toMillis() ?? 0,
      eventType: r.eventType || "view",
      path: r.path,
      clickLabel: r.clickLabel,
      clickHref: r.clickHref,
      clickCategory: r.clickCategory,
      durationMs: r.durationMs,
    }));

    const sess = sessions.find((s) => s.sessionId === selectedSessionId);
    const fromTrail = (sess?.recentEvents ?? []).map((e, i) => ({
      id: `trail-${i}-${e.atMs ?? i}`,
      atMs: typeof e.atMs === "number" ? e.atMs : 0,
      eventType: String(e.eventType ?? "event"),
      path: String(e.path ?? ""),
      clickLabel: e.clickLabel,
      clickHref: e.clickHref,
      clickCategory: e.clickCategory,
      durationMs: e.durationMs ?? null,
    }));

    const fromSample = rows
      .filter((r) => r.sessionId === selectedSessionId)
      .map((r) => ({
        id: r.id,
        atMs: toTimestamp(r.createdAt)?.toMillis() ?? 0,
        eventType: r.eventType || "view",
        path: r.path,
        clickLabel: r.clickLabel,
        clickHref: r.clickHref,
        clickCategory: r.clickCategory,
        durationMs: r.durationMs,
      }));

    // Fallback from denormalized page list so timeline is never blank when pages exist
    const merged = new Map<
      string,
      {
        id: string;
        atMs: number;
        eventType: string;
        path: string;
        clickLabel?: string;
        clickHref?: string;
        clickCategory?: string;
        durationMs?: number | null;
      }
    >();
    for (const e of [...fromTrail, ...fromSample, ...fromQuery]) {
      if (e.eventType === "heartbeat" || e.eventType === "scroll") continue;
      if (!e.atMs && !e.path) continue;
      const key = `${e.atMs}|${e.eventType}|${e.path}|${e.clickLabel ?? ""}`;
      if (!merged.has(key)) merged.set(key, e);
    }

    // If still empty, synthesize "Opened page" rows from session page stays
    if (merged.size === 0 && sess) {
      const paths = [
        ...(sess.visitedPaths ?? []),
        ...(sess.lastPath ? [sess.lastPath] : []),
        ...(sess.landingPath ? [sess.landingPath] : []),
      ];
      const unique = [...new Set(paths.filter(Boolean))];
      unique.forEach((path, i) => {
        merged.set(`synth-${path}`, {
          id: `synth-${path}`,
          atMs: (sess.firstSeenAt
            ? toTimestamp(sess.firstSeenAt)?.toMillis()
            : 0) || Date.now() - (unique.length - i) * 1000,
          eventType: "view",
          path,
        });
      });
    }

    return [...merged.values()].sort((a, b) => a.atMs - b.atMs);
  }, [selectedSessionId, sessionTimeline, sessions, rows]);

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
        Humans by default (includes provisional first-paint visits). Bots and
        suspected automation stay under their own tabs. All times are{" "}
        <strong>IST (India)</strong>. Counts can differ slightly from GA4 /
        Clarity (different bot filters and sampling).
      </p>

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
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border border-green-200 bg-green-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                Online humans
              </p>
              <p className="mt-1 font-display text-base font-bold text-green-900">
                {analytics.onlineCount}
              </p>
              <p className="mt-1 text-xs text-green-800">
                Active in last ~70 seconds (heartbeat)
              </p>
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
            <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                {gscToday?.isLatestAvailable
                  ? "GSC impressions (latest)"
                  : "GSC impressions today"}
              </p>
              <p className="mt-1 font-display text-base font-bold text-violet-950">
                {gscLoading
                  ? "…"
                  : gscToday?.ok
                    ? gscToday.impressions.toLocaleString("en-IN")
                    : "—"}
              </p>
              <p className="mt-1 text-xs text-violet-700">
                {gscToday?.date ?? todayIstYmd} (IST) · Search Console
                {gscToday?.ok && gscToday.clicks > 0
                  ? ` · ${gscToday.clicks} clicks`
                  : ""}
              </p>
              {gscToday?.error ? (
                <p className="mt-1 text-[11px] leading-snug text-red-700">
                  {gscToday.error}
                </p>
              ) : gscToday?.note ? (
                <p className="mt-1 text-[11px] leading-snug text-violet-600">
                  {gscToday.note}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
                Popup leads today
              </p>
              <p className="mt-1 font-display text-base font-bold text-orange-950">
                {leadsLoading ? "…" : popupLeadsToday.length}
              </p>
              <p className="mt-1 text-xs text-orange-700">
                Name, email &amp; phone from site popup
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-orange-200 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/30 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-orange-950">
                  Captured visitor contacts
                </h2>
                <p className="mt-1 text-xs text-orange-800/90">
                  From the on-site popup (visitor_popup). Export for WhatsApp or
                  email campaigns.
                </p>
              </div>
              <button
                type="button"
                disabled={popupLeadsAll.length === 0}
                onClick={() => exportCapturedLeadsCsv(popupLeadsAll)}
                className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
            {leadsLoading ? (
              <p className="mt-3 text-sm text-orange-800">Loading leads…</p>
            ) : popupLeadsAll.length === 0 ? (
              <p className="mt-3 text-sm text-orange-800">
                No popup leads yet. They appear here when visitors submit the
                offers form on the website.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-orange-100 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-orange-100/60 text-orange-950">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Email</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      <th className="px-3 py-2 font-semibold">Page</th>
                      <th className="px-3 py-2 font-semibold">Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-50">
                    {popupLeadsAll.slice(0, 25).map((l) => (
                      <tr key={l.id} className="text-slate-800">
                        <td className="px-3 py-2 font-medium">{l.name || "—"}</td>
                        <td className="px-3 py-2">{l.email || "—"}</td>
                        <td className="px-3 py-2 font-mono">{l.phone}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">
                          {l.capturePath || l.interestedItem || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {formatTs(l.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {popupLeadsAll.length > 25 ? (
                  <p className="border-t border-orange-50 px-3 py-2 text-[11px] text-orange-700">
                    Showing 25 of {popupLeadsAll.length}. Use Export CSV for the
                    full list.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-ocean-800">
              Show in visitor list
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLeadOnly((prev) => !prev);
                  setSelectedSessionId("");
                }}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
                  leadOnly
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-orange-200 bg-white text-orange-900 hover:bg-orange-50"
                }`}
              >
                Leads only
              </button>
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
          </div>
          {leadOnly ? (
            <p className="mt-2 text-xs text-orange-800">
              Showing visitors who saved name, email, or phone (popup, booking
              form, or chat).
            </p>
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
                            {leadOnly
                              ? "No leads with saved contact on this day."
                              : visitorFilter === "bot"
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
                                        ? "border-teal-400 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50 ring-1 ring-teal-200"
                                        : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/40 hover:border-teal-200"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {v.isOnline ? (
                                          <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                            Online
                                          </span>
                                        ) : null}
                                        {v.isReturningVisitor ? (
                                          <span className="rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                                            Returning · visit #
                                            {v.visitorVisitCount || "?"}
                                          </span>
                                        ) : v.visitorVisitCount === 1 ? (
                                          <span className="rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                                            New visitor
                                          </span>
                                        ) : null}
                                        {v.visitorKind === "bot" ? (
                                          <span className="rounded-md bg-slate-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                            Bot · {v.botLabel}
                                          </span>
                                        ) : null}
                                        {v.visitorKind === "suspected" ? (
                                          <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                            Suspected
                                          </span>
                                        ) : null}
                                        {v.analyticsVersion < 2 ? (
                                          <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-900">
                                            Legacy
                                          </span>
                                        ) : null}
                                        {v.hasLeadCapture || v.leadName ? (
                                          <span className="rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                            Lead saved
                                          </span>
                                        ) : null}
                                        {v.trafficLabel &&
                                        v.trafficLabel !== "—" ? (
                                          <span
                                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ${trafficChannelStyles(
                                              v.trafficChannel ||
                                                trafficChannelFromLabel(
                                                  v.trafficLabel,
                                                ),
                                            )}`}
                                          >
                                            {v.trafficLabel}
                                          </span>
                                        ) : null}
                                      </div>
                                      <span className="rounded-md bg-cyan-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                        {formatDurationMs(v.totalDurationMs)}{" "}
                                        on site
                                      </span>
                                    </div>

                                    <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                                      <p className="text-slate-700">
                                        <span className="font-semibold text-teal-800">
                                          Arrived:
                                        </span>{" "}
                                        {formatTs(v.arrivedAt)}
                                      </p>
                                      <p className="text-slate-700">
                                        <span className="font-semibold text-rose-800">
                                          Left:
                                        </span>{" "}
                                        {v.isOnline
                                          ? "Still browsing"
                                          : formatTs(v.leftAt)}
                                      </p>
                                    </div>

                                    {v.geoLine ? (
                                      <p className="mt-1.5 inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-xs text-teal-950">
                                        <span className="font-semibold">
                                          Location:
                                        </span>{" "}
                                        <span className="truncate">
                                          {v.geoLine}
                                        </span>
                                      </p>
                                    ) : (
                                      <p className="mt-1.5 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs text-rose-800">
                                        Location: unavailable (fills on next
                                        visit with geo)
                                      </p>
                                    )}

                                    {v.leadName || v.leadPhone || v.leadEmail ? (
                                      <p className="mt-1.5 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-1 text-xs text-orange-950">
                                        <span className="font-semibold">
                                          Contact:
                                        </span>{" "}
                                        {v.leadName ? `${v.leadName}` : ""}
                                        {v.leadPhone
                                          ? `${v.leadName ? " · " : ""}+${v.leadPhone}`
                                          : ""}
                                        {v.leadEmail
                                          ? ` · ${v.leadEmail}`
                                          : ""}
                                      </p>
                                    ) : null}

                                    {v.deviceLine ? (
                                      <p
                                        className={`mt-1.5 inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${deviceCategoryStyles(
                                          v.deviceCategory,
                                        )}`}
                                      >
                                        <span className="font-semibold">
                                          Device:
                                        </span>{" "}
                                        <span className="truncate">
                                          {v.deviceLine}
                                        </span>
                                      </p>
                                    ) : null}

                                    {v.trafficDetail &&
                                    v.trafficDetail !== v.trafficLabel ? (
                                      <p className="mt-0.5 text-xs font-medium text-slate-700">
                                        Source detail: {v.trafficDetail}
                                      </p>
                                    ) : null}

                                    <p className="mt-1.5 text-xs text-slate-700">
                                      <span className="font-medium text-indigo-800">
                                        {v.uniquePages} page
                                        {v.uniquePages === 1 ? "" : "s"}
                                      </span>
                                      {" · "}
                                      <span className="font-medium text-sky-800">
                                        {v.pageViews} page view
                                        {v.pageViews === 1 ? "" : "s"}
                                      </span>
                                      {v.isReturningVisitor &&
                                      v.visitorVisitCount > 1 ? (
                                        <>
                                          {" · "}
                                          <span className="font-semibold text-amber-800">
                                            {v.visitorVisitCount} lifetime
                                            visits
                                          </span>
                                        </>
                                      ) : null}
                                    </p>
                                    <div className="mt-1 space-y-0.5 font-mono text-[11px] leading-snug text-slate-700">
                                      <p className="truncate">
                                        <span className="font-sans font-semibold text-cyan-800">
                                          First:
                                        </span>{" "}
                                        <span
                                          className={
                                            v.landingPath.startsWith("/blog/")
                                              ? "font-semibold text-amber-800"
                                              : ""
                                          }
                                          title={v.landingPath}
                                        >
                                          {v.landingPath || "—"}
                                        </span>
                                      </p>
                                      <p className="truncate">
                                        <span className="font-sans font-semibold text-slate-800">
                                          Last:
                                        </span>{" "}
                                        <span title={v.lastPath}>
                                          {v.lastPath || "—"}
                                        </span>
                                      </p>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>

                            <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-white via-cyan-50/50 to-teal-50/40 p-3">
                              {!selectedVisitor ? (
                                <p className="text-sm text-slate-600">
                                  Select a visitor to see page-by-page time.
                                </p>
                              ) : (
                                <>
                                  <h3 className="font-semibold text-teal-950">
                                    Visit details
                                  </h3>
                                  <dl className="mt-2 space-y-1.5 text-xs text-slate-800">
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-amber-900">
                                        First page
                                      </dt>
                                      <dd className="min-w-0 break-all font-mono text-amber-950">
                                        {selectedVisitor.landingPath &&
                                        selectedVisitor.landingPath !== "—" ? (
                                          selectedVisitor.landingPath
                                        ) : (
                                          <span className="font-sans text-rose-700">
                                            Not recorded
                                          </span>
                                        )}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-teal-800">
                                        Arrived
                                      </dt>
                                      <dd>{formatTs(selectedVisitor.arrivedAt)}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-rose-800">
                                        Left
                                      </dt>
                                      <dd>
                                        {selectedVisitor.isOnline
                                          ? "Still browsing"
                                          : formatTs(selectedVisitor.leftAt)}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-cyan-800">
                                        Total time
                                      </dt>
                                      <dd className="font-semibold text-cyan-950">
                                        {formatDurationMs(
                                          selectedVisitor.totalDurationMs
                                        )}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-teal-800">
                                        Location
                                      </dt>
                                      <dd>
                                        {selectedVisitor.geoLine ? (
                                          <span className="rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-teal-950">
                                            {selectedVisitor.geoLine}
                                          </span>
                                        ) : (
                                          <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-800">
                                            Unavailable (fills on next visit
                                            with geo)
                                          </span>
                                        )}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-violet-800">
                                        Device
                                      </dt>
                                      <dd className="min-w-0">
                                        {selectedVisitor.deviceLine ? (
                                          <span
                                            className={`inline-block rounded-md border px-1.5 py-0.5 ${deviceCategoryStyles(
                                              selectedVisitor.deviceCategory,
                                            )}`}
                                          >
                                            {selectedVisitor.deviceLine}
                                          </span>
                                        ) : (
                                          <span className="text-slate-500">
                                            Not recorded
                                          </span>
                                        )}
                                        {selectedVisitor.uaSnippet ? (
                                          <p
                                            className="mt-0.5 truncate text-[10px] text-slate-500"
                                            title={selectedVisitor.uaSnippet}
                                          >
                                            UA: {selectedVisitor.uaSnippet}
                                          </p>
                                        ) : null}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-amber-800">
                                        Visits
                                      </dt>
                                      <dd>
                                        {selectedVisitor.visitorVisitCount >
                                        0 ? (
                                          selectedVisitor.isReturningVisitor ? (
                                            <span className="rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-950">
                                              Returning · visit #
                                              {selectedVisitor.visitorVisitCount}{" "}
                                              (lifetime)
                                            </span>
                                          ) : (
                                            <span className="rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-900">
                                              New visitor · first visit
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-slate-500">
                                            Count starts after deploy (next
                                            visit)
                                          </span>
                                        )}
                                      </dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="w-28 shrink-0 font-semibold text-slate-800">
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
                                      <dt className="w-28 shrink-0 font-semibold text-indigo-800">
                                        Came from
                                      </dt>
                                      <dd className="min-w-0">
                                        {selectedVisitor.trafficLabel !==
                                        "—" ? (
                                          <span className="inline-flex flex-wrap items-center gap-2">
                                            <span
                                              className={`rounded-md px-2 py-0.5 text-xs font-semibold shadow-sm ${trafficChannelStyles(
                                                selectedVisitor.trafficChannel ||
                                                  trafficChannelFromLabel(
                                                    selectedVisitor.trafficLabel,
                                                  ),
                                              )}`}
                                            >
                                              {selectedVisitor.trafficLabel}
                                            </span>
                                            {selectedVisitor.trafficDetail &&
                                            selectedVisitor.trafficDetail !==
                                              selectedVisitor.trafficLabel ? (
                                              <span className="text-sm font-medium text-slate-700">
                                                {selectedVisitor.trafficDetail}
                                              </span>
                                            ) : null}
                                          </span>
                                        ) : (
                                          <span className="text-slate-500">
                                            Not recorded yet — new visits show
                                            Direct / Search / Facebook /
                                            Instagram etc.
                                          </span>
                                        )}
                                      </dd>
                                    </div>
                                    {selectedVisitor.leadName ||
                                    selectedVisitor.leadPhone ||
                                    selectedVisitor.leadEmail ? (
                                      <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50/80 p-2.5">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-orange-900">
                                          Saved contact
                                        </p>
                                        {selectedVisitor.leadName ? (
                                          <div className="mt-1 flex gap-2 text-xs">
                                            <dt className="w-20 shrink-0 font-semibold text-orange-900">
                                              Name
                                            </dt>
                                            <dd>{selectedVisitor.leadName}</dd>
                                          </div>
                                        ) : null}
                                        {selectedVisitor.leadEmail ? (
                                          <div className="mt-1 flex gap-2 text-xs">
                                            <dt className="w-20 shrink-0 font-semibold text-orange-900">
                                              Email
                                            </dt>
                                            <dd className="break-all">
                                              {selectedVisitor.leadEmail}
                                            </dd>
                                          </div>
                                        ) : null}
                                        {selectedVisitor.leadPhone ? (
                                          <div className="mt-1 flex gap-2 text-xs">
                                            <dt className="w-20 shrink-0 font-semibold text-orange-900">
                                              Phone
                                            </dt>
                                            <dd className="font-mono">
                                              +{selectedVisitor.leadPhone}
                                            </dd>
                                          </div>
                                        ) : null}
                                        {selectedVisitor.leadSource ? (
                                          <p className="mt-1 text-[10px] text-orange-800">
                                            Source: {selectedVisitor.leadSource}
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </dl>

                                  <h4 className="mt-4 text-sm font-semibold text-indigo-950">
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
                                          className="rounded-lg border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 px-2.5 py-2 text-xs"
                                        >
                                          <p className="font-mono font-semibold text-indigo-950">
                                            {p.path}
                                          </p>
                                          {p.label && p.label !== p.path ? (
                                            <p className="text-slate-700">
                                              {p.label}
                                            </p>
                                          ) : null}
                                          <p className="mt-0.5 text-slate-600">
                                            Time on page:{" "}
                                            <span className="font-semibold text-cyan-800">
                                              {formatDurationMs(p.durationMs)}
                                            </span>
                                            <span className="text-slate-500">
                                              {" "}
                                              (
                                              {Math.max(
                                                0,
                                                Math.round(p.durationMs / 1000),
                                              )}
                                              s)
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
                                  {timelineError ? (
                                    <p className="mt-1 text-[11px] text-amber-800">
                                      {timelineError}
                                    </p>
                                  ) : null}
                                  {timelineLoading &&
                                  selectedTimeline.length === 0 ? (
                                    <p className="mt-2 text-xs text-ocean-600">
                                      Loading clicks &amp; page events…
                                    </p>
                                  ) : selectedTimeline.length === 0 ? (
                                    <p className="mt-2 text-xs text-ocean-500">
                                      No clicks or page events stored for this
                                      visit yet. Open the site in a new tab,
                                      click menu/buttons, then refresh — clicks
                                      appear here within a few seconds.
                                    </p>
                                  ) : (
                                    <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto text-xs">
                                      {selectedTimeline.map((r) => {
                                        const kind =
                                          r.eventType === "click"
                                            ? "click"
                                            : r.eventType === "leave"
                                              ? "leave"
                                              : r.eventType === "view"
                                                ? "view"
                                                : "other";
                                        const kindClass =
                                          kind === "click"
                                            ? "bg-violet-600 text-white"
                                            : kind === "leave"
                                              ? "bg-slate-500 text-white"
                                              : kind === "view"
                                                ? "bg-sky-600 text-white"
                                                : "bg-ocean-600 text-white";
                                        const kindLabel =
                                          kind === "click"
                                            ? "Click"
                                            : kind === "leave"
                                              ? "Left page"
                                              : kind === "view"
                                                ? "Opened page"
                                                : r.eventType;
                                        return (
                                          <li
                                            key={r.id}
                                            className="rounded-lg border border-ocean-50 bg-white px-2 py-1.5"
                                          >
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span className="text-ocean-600">
                                                {formatMsIst(r.atMs)}
                                              </span>
                                              <span
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindClass}`}
                                              >
                                                {kindLabel}
                                              </span>
                                              {r.durationMs ? (
                                                <span className="text-ocean-600">
                                                  {formatDurationMs(r.durationMs)}
                                                </span>
                                              ) : null}
                                            </div>
                                            {r.path ? (
                                              <p className="mt-0.5 truncate font-mono text-ocean-800">
                                                {r.path}
                                              </p>
                                            ) : null}
                                            {r.eventType === "click" ? (
                                              <p className="mt-0.5 text-ocean-700">
                                                {r.clickLabel
                                                  ? `“${r.clickLabel}”`
                                                  : "Button click"}
                                                {r.clickCategory
                                                  ? ` · ${r.clickCategory}`
                                                  : ""}
                                                {r.clickHref
                                                  ? ` → ${r.clickHref}`
                                                  : ""}
                                              </p>
                                            ) : null}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
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

