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

type Row = {
  id: string;
  path: string;
  sessionId: string;
  createdAt: unknown;
};

function formatTs(v: unknown): string {
  if (
    v &&
    typeof v === "object" &&
    "toDate" in v &&
    typeof (v as Timestamp).toDate === "function"
  ) {
    return (v as Timestamp).toDate().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  }
  return String(v ?? "—");
}

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
          limit(500)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            path: String(data.path ?? ""),
            sessionId: String(data.sessionId ?? ""),
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

  const stats = useMemo(() => {
    const sessions = new Set<string>();
    const byDay = new Map<string, number>();
    for (const r of rows) {
      if (r.sessionId) sessions.add(r.sessionId);
      const v = r.createdAt;
      let day = "—";
      if (
        v &&
        typeof v === "object" &&
        "toDate" in v &&
        typeof (v as Timestamp).toDate === "function"
      ) {
        const d = (v as Timestamp).toDate();
        day = d.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const dayList = [...byDay.entries()].sort((a, b) =>
      b[0].localeCompare(a[0])
    );
    return {
      pageViews: rows.length,
      sessionsApprox: sessions.size,
      byDay: dayList.slice(0, 14),
    };
  }, [rows]);

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
        Page views from site visitors (last 500 events). Each browser tab session
        gets a session id; repeated views count toward page views.
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
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                Page views (loaded)
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-ocean-900">
                {stats.pageViews}
              </p>
            </div>
            <div className="rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                Unique sessions (in sample)
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-ocean-900">
                {stats.sessionsApprox}
              </p>
            </div>
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
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto text-sm">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-ocean-100 bg-white px-3 py-2 text-ocean-800"
                  >
                    <span className="font-mono text-xs text-ocean-600">
                      {formatTs(r.createdAt)}
                    </span>
                    <span className="mx-2 text-ocean-300">·</span>
                    <span>{r.path}</span>
                    <span className="ml-2 text-xs text-ocean-500">
                      {r.sessionId.slice(0, 8)}…
                    </span>
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
