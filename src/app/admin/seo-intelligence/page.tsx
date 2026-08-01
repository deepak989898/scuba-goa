"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { seoIntelFetch } from "./admin-fetch";

type Dashboard = {
  disclaimer: string;
  provider: { name: string; configured: boolean };
  stats: {
    totalTrackedKeywords: number;
    competitorsTracked: number;
    competitorsPending: number;
    competitorsTotal: number;
    marketplaceCompetitors: number;
    directLocalCompetitors: number;
    pendingSuggestions: number;
    appliedChanges: number;
    autoApproveOn: boolean;
    automationPaused: boolean;
  };
  settings: {
    suggestionAutoApprove: boolean;
  };
  recentLogs: {
    id: string;
    action: string;
    details: string;
    result: string;
    createdAt: string;
  }[];
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "good" | "warn" | "info" | "neutral";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-ocean-100 bg-white";
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-ocean-500">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ocean-900">
        {value}
      </p>
    </div>
  );
}

export default function SeoIntelligenceOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = (await seoIntelFetch(
        "/api/admin/seo-intelligence/dashboard",
      )) as Dashboard;
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="text-sm text-ocean-600" role="status">
        Loading SEO Intelligence…
      </p>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {err}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-3 font-bold underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;
  const s = data.stats;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        {data.disclaimer}
      </div>

      {!data.provider.configured ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          <strong>Setup required:</strong> SERP provider not configured. GSC
          features stay available. Set <code className="font-mono">SERPER_API_KEY</code>{" "}
          (or <code className="font-mono">SERP_API_KEY</code>) for automatic
          competitor/keyword discovery. Manual competitor entry still works.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          SERP provider: <strong>{data.provider.name}</strong> · configured
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tracked keywords" value={s.totalTrackedKeywords} />
        <StatCard
          label="Competitors tracked"
          value={s.competitorsTracked}
          tone="good"
        />
        <StatCard
          label="Pending review"
          value={s.competitorsPending}
          tone={s.competitorsPending ? "warn" : "neutral"}
        />
        <StatCard
          label="Pending suggestions"
          value={s.pendingSuggestions}
          tone="info"
        />
        <StatCard label="Direct local" value={s.directLocalCompetitors} />
        <StatCard label="Marketplace portals" value={s.marketplaceCompetitors} />
        <StatCard label="Applied changes" value={s.appliedChanges} tone="good" />
        <StatCard
          label="Suggestion auto-approve"
          value={s.autoApproveOn ? "ON" : "OFF"}
          tone={s.autoApproveOn ? "warn" : "good"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/seo-intelligence/competitors"
          className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white"
        >
          Manage competitors
        </Link>
        <Link
          href="/admin/seo-intelligence/settings"
          className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-xs font-bold text-ocean-800"
        >
          Auto-approve settings
        </Link>
        <Link
          href="/admin/gsc-agent"
          className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-xs font-bold text-ocean-800"
        >
          Open GSC Indexing Agent
        </Link>
      </div>

      <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
        <h2 className="font-display text-base font-bold text-ocean-900">
          Recent activity
        </h2>
        {data.recentLogs.length === 0 ? (
          <p className="mt-2 text-sm text-ocean-600">No activity yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ocean-50 text-sm">
            {data.recentLogs.slice(0, 12).map((log) => (
              <li key={log.id} className="flex flex-wrap gap-x-2 py-1.5">
                <span className="font-mono text-[11px] text-ocean-500">
                  {log.createdAt?.slice(0, 19)?.replace("T", " ")}
                </span>
                <span className="font-semibold text-ocean-800">{log.action}</span>
                <span className="text-ocean-700">{log.details}</span>
                <span
                  className={
                    log.result === "error"
                      ? "text-red-700"
                      : log.result === "skipped"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }
                >
                  {log.result}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
