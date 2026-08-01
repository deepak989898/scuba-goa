"use client";

import { useCallback, useEffect, useState } from "react";
import { seoIntelFetch } from "../admin-fetch";

export default function SeoIntelLogsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [logs, setLogs] = useState<
    {
      id: string;
      action: string;
      details: string;
      result: string;
      actor: string;
      createdAt: string;
      error: string | null;
    }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/dashboard",
      );
      setLogs(data.recentLogs ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-ocean-600">Loading logs…</p>;
  if (err) return <p className="text-sm text-red-700">{err}</p>;

  return (
    <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          Activity logs
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full border border-ocean-200 px-3 py-1 text-xs font-bold text-ocean-800"
        >
          Refresh
        </button>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-ocean-600">No logs yet.</p>
      ) : (
        <ul className="divide-y divide-ocean-50 text-sm">
          {logs.map((log) => (
            <li key={log.id} className="py-2">
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="font-mono text-[11px] text-ocean-500">
                  {log.createdAt?.slice(0, 19)?.replace("T", " ")}
                </span>
                <span className="font-semibold text-ocean-900">{log.action}</span>
                <span className="text-ocean-600">by {log.actor}</span>
                <span
                  className={
                    log.result === "error"
                      ? "font-bold text-red-700"
                      : log.result === "skipped"
                        ? "font-bold text-amber-700"
                        : "font-bold text-emerald-700"
                  }
                >
                  {log.result}
                </span>
              </div>
              <p className="text-ocean-700">{log.details}</p>
              {log.error ? (
                <p className="text-xs text-red-700">{log.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
