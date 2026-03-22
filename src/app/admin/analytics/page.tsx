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

type Row = {
  id: string;
  path: string;
  sessionId: string;
  deviceCategory: DeviceCategory | "";
  deviceLabel: string;
  uaSnippet: string;
  createdAt: unknown;
};

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
  });
}

const SAMPLE_LIMIT = 2500;

export default function AdminAnalyticsPage() {
  const db = getDb();
  const [rows, setRows] = useState<Row[]>([]);
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
        const q = query(
          collection(db, "pageViews"),
          orderBy("createdAt", "desc"),
          limit(SAMPLE_LIMIT)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list = snap.docs.map((d) => {
          const data = d.data();
          const cat = String(data.deviceCategory ?? "") as DeviceCategory | "";
          return {
            id: d.id,
            path: String(data.path ?? ""),
            sessionId: String(data.sessionId ?? ""),
            deviceCategory:
              cat === "mobile" ||
              cat === "tablet" ||
              cat === "desktop" ||
              cat === "unknown"
                ? cat
                : "",
            deviceLabel: String(data.deviceLabel ?? ""),
            uaSnippet: String(data.uaSnippet ?? ""),
            createdAt: data.createdAt,
          };
        });
        setRows(list);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          e && typeof e === "object" && "code" in e
            ? `${String((e as { code?: string }).code)}: ${String((e as { message?: string }).message ?? e)}`
            : String(e);
        setLoadError(msg);
        setRows([]);
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
    const sessions = new Set<string>();
    const byDay = new Map<string, number>();

    const todayRows: Row[] = [];
    for (const r of rows) {
      const ts = toTimestamp(r.createdAt);
      if (!ts) continue;
      if (r.sessionId) sessions.add(r.sessionId);
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
      const c = r.deviceCategory || "unknown";
      sessionFirstDevice.set(r.sessionId, c === "" ? "unknown" : c);
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

    return {
      pageViews: rows.length,
      sessionsApprox: sessions.size,
      byDay: dayList.slice(0, 14),
      todayPageViews,
      todaySessions,
      todayDeviceVisitors,
      sampleDevicePageViews,
    };
  }, [rows, todayIstYmd]);

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
        Visitor activity from the public site. Times are <strong>IST</strong>.
        Numbers use the latest {SAMPLE_LIMIT.toLocaleString("en-IN")} events
        (very high traffic can make “today” a slight undercount).
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
              <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-2">
                <p className="text-xs font-medium text-ocean-500">
                  Today’s visitors by device type
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
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

          <div className="mt-10">
            <h2 className="font-display text-lg font-semibold text-ocean-900">
              Recent activity
            </h2>
            {rows.length === 0 ? (
              <p className="mt-4 text-ocean-600">
                No page views yet. Deploy with Admin SDK env and browse the site.
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
                    </div>
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
