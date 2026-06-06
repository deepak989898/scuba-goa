"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { SeoHealthIssue, SeoHealthReportDoc } from "@/lib/seo-health/types";

async function adminFetch(path: string, init?: RequestInit) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Sign in at /admin/login first.");
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

const SEV_COLOR: Record<string, string> = {
  critical: "border-red-300 bg-red-50 text-red-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-ocean-200 bg-sand text-ocean-800",
};

export default function AdminSeoHealthPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<(SeoHealthReportDoc & { id?: string }) | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/seo-health");
      setReport(data.latest ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAudit() {
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/seo-health", { method: "POST" });
      setReport(data.report ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setBusy(false);
    }
  }

  const issues = (report?.issues ?? []) as SeoHealthIssue[];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">SEO health audit</h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Checks sitemap, robots.txt, canonical tags, Google Search Console, GA4, and schema.
            Zero visitors in daily email usually means low Google visibility — not a broken site.
          </p>
        </div>
        <Link href="/admin/seo-agent" className="text-sm font-semibold text-ocean-700 underline">
          SEO AI →
        </Link>
      </div>

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAudit()}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Auditing…" : "Run SEO health audit"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-full border border-ocean-200 px-4 py-2 text-sm text-ocean-800"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-ocean-600">Loading…</p>
      ) : !report ? (
        <p className="mt-8 text-ocean-600">No audit yet. Click Run SEO health audit.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Health score", `${report.healthScore}/100`],
              ["Sitemap URLs", report.sitemapUrlCount],
              ["GSC impressions (7d)", report.gscImpressions7d],
              ["GSC clicks (7d)", report.gscClicks7d],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm"
              >
                <p className="text-xs uppercase text-ocean-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-ocean-900">{value}</p>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-xl border border-ocean-100 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-ocean-900">Integrations</h2>
            <ul className="mt-3 space-y-2 text-sm text-ocean-800">
              <li>
                <strong>Search Console:</strong> {report.gscStatus} — {report.gscMessage}
              </li>
              <li>
                <strong>GA4:</strong> {report.ga4Status} — {report.ga4Message}
              </li>
            </ul>
          </section>

          {report.manualSteps?.length ? (
            <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-display text-lg font-bold text-amber-900">
                Do this manually in Google
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-amber-950">
                {report.manualSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="font-display text-lg font-bold text-ocean-900">
              Issues ({issues.length})
            </h2>
            <ul className="mt-3 space-y-2">
              {issues.map((i, idx) => (
                <li
                  key={`${i.category}-${idx}`}
                  className={`rounded-lg border px-4 py-3 text-sm ${SEV_COLOR[i.severity] ?? SEV_COLOR.info}`}
                >
                  <p className="font-semibold">
                    [{i.severity}] {i.category}
                  </p>
                  <p className="mt-1">{i.message}</p>
                  {i.fix ? <p className="mt-1 text-xs opacity-90">Fix: {i.fix}</p> : null}
                </li>
              ))}
            </ul>
          </section>

          {report.recommendations?.length ? (
            <section className="mt-8">
              <h2 className="font-display text-lg font-bold text-ocean-900">Recommendations</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ocean-800">
                {report.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
