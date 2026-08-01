"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { seoIntelFetch } from "./admin-fetch";

type Dashboard = {
  disclaimer: string;
  provider: { name: string; configured: boolean };
  stats: {
    totalTrackedKeywords: number;
    position1to3: number;
    position4to10: number;
    position11to20: number;
    position21to50: number;
    positionBelow50: number;
    notRanking: number;
    missingPages: number;
    cannibalisation: number;
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
        <StatCard label="Positions 1–3" value={s.position1to3 ?? 0} tone="good" />
        <StatCard label="Positions 4–10" value={s.position4to10 ?? 0} tone="warn" />
        <StatCard label="Positions 11–20" value={s.position11to20 ?? 0} />
        <StatCard label="Positions 21–50" value={s.position21to50 ?? 0} />
        <StatCard label="Below 50" value={s.positionBelow50 ?? 0} />
        <StatCard label="Not ranking" value={s.notRanking ?? 0} tone="info" />
        <StatCard
          label="Missing pages"
          value={s.missingPages ?? 0}
          tone={s.missingPages ? "warn" : "neutral"}
        />
        <StatCard
          label="Cannibalisation"
          value={s.cannibalisation ?? 0}
          tone={s.cannibalisation ? "warn" : "neutral"}
        />
        <StatCard
          label="Competitors tracked"
          value={s.competitorsTracked}
          tone="good"
        />
        <StatCard
          label="Pending competitors"
          value={s.competitorsPending}
          tone={s.competitorsPending ? "warn" : "neutral"}
        />
        <StatCard
          label="Suggestion auto-approve"
          value={s.autoApproveOn ? "ON" : "OFF"}
          tone={s.autoApproveOn ? "warn" : "good"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/seo-intelligence/keywords"
          className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white"
        >
          Keyword rankings
        </Link>
        <Link
          href="/admin/seo-intelligence/competitors"
          className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-xs font-bold text-ocean-800"
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
