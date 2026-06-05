"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type {
  ConversionOptDailyDoc,
  ConversionOptReportDoc,
  FunnelStep,
} from "@/lib/conversion-opt/types";

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

type DailyRow = ConversionOptDailyDoc & { id: string };
type ReportRow = ConversionOptReportDoc & { id: string };

const AREA_LABELS: Record<string, string> = {
  headings: "Headings",
  booking_buttons: "Booking buttons",
  trust: "Trust sections",
  pricing: "Pricing display",
  mobile: "Mobile conversion",
};

export default function AdminConversionOptPage() {
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/conversion-opt/dashboard?days=14");
      const d = (data.daily ?? []) as DailyRow[];
      const r = (data.reports ?? []) as ReportRow[];
      setDaily(d);
      setReports(r);
      setSelectedDate((prev) => prev || d[0]?.dateIst || "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshot = daily.find((d) => d.dateIst === selectedDate) ?? daily[0];
  const report = reports.find((r) => r.dateIst === (snapshot?.dateIst ?? "")) ?? reports[0];
  const j = snapshot?.journeyTotals;

  async function runNow() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/conversion-opt/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setOk("Conversion funnel + AI suggestions generated for yesterday (IST).");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  const maxFunnel = Math.max(...(snapshot?.funnel?.map((s) => s.count) ?? [1]), 1);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">
            AI conversion optimization
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Tracks scroll depth, CTA clicks, WhatsApp, booking attempts, and payment failures.
            OpenAI suggests daily improvements. Runs with the analytics cron at{" "}
            <code className="rounded bg-sand px-1 text-xs">04:00 UTC</code>.
          </p>
        </div>
        <Link
          href="/admin/ai-analytics"
          className="text-sm font-semibold text-ocean-700 underline"
        >
          AI analytics →
        </Link>
      </div>

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {ok}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runNow()}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Running…" : "Generate suggestions now"}
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
      ) : !snapshot ? (
        <p className="mt-8 text-ocean-600">
          No conversion reports yet. Browse the site (scroll, click Book/WhatsApp), then click{" "}
          <strong>Generate suggestions now</strong>.
        </p>
      ) : (
        <>
          <label className="mt-6 block text-sm text-ocean-800">
            Day (IST)
            <select
              className="mt-1 rounded-lg border border-ocean-200 px-3 py-2"
              value={selectedDate || snapshot.dateIst}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              {daily.map((d) => (
                <option key={d.dateIst} value={d.dateIst}>
                  {d.dateIst}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="WhatsApp clicks" value={j?.whatsappClicks ?? 0} />
            <MetricCard label="Book CTA clicks" value={j?.bookCtaClicks ?? 0} />
            <MetricCard label="Checkout started" value={j?.checkoutStarted ?? 0} />
            <MetricCard
              label="Payment fail / dismiss"
              value={`${j?.paymentFailed ?? 0} / ${j?.paymentDismissed ?? 0}`}
            />
            <MetricCard label="Mobile sessions" value={j?.mobileSessions ?? 0} />
            <MetricCard label="Mobile bounce" value={`${j?.mobileBouncePct ?? 0}%`} />
            <MetricCard label="Phone clicks" value={j?.phoneClicks ?? 0} />
            <MetricCard label="Verify failed" value={j?.verifyFailed ?? 0} />
          </div>

          <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ocean-900">Conversion funnel</h2>
            <p className="mt-1 text-sm text-ocean-600">
              Drop-off between steps shows where visitors leave before booking.
            </p>
            <div className="mt-6 space-y-4">
              {(snapshot.funnel ?? []).map((step) => (
                <FunnelBar key={step.id} step={step} maxCount={maxFunnel} />
              ))}
            </div>
          </section>

          {snapshot.issues?.length ? (
            <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Detected issues
              </h2>
              <ul className="mt-4 space-y-3">
                {snapshot.issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="rounded-lg border border-amber-100 bg-white p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={issue.severity} />
                      <span className="rounded bg-sand px-2 py-0.5 text-xs font-medium uppercase text-ocean-600">
                        {issue.category}
                      </span>
                      <span className="font-semibold text-ocean-900">{issue.title}</span>
                    </div>
                    <p className="mt-2 text-ocean-700">{issue.detail}</p>
                    {issue.affectedPaths?.length ? (
                      <p className="mt-2 font-mono text-xs text-ocean-500">
                        {issue.affectedPaths.join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {report?.summaryPlain ? (
            <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                AI daily summary — {report.dateIst}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ocean-800">{report.summaryPlain}</p>
              {report.recommendations?.length ? (
                <div className="mt-6 space-y-4">
                  {report.recommendations.map((rec, i) => (
                    <div
                      key={`${rec.area}-${i}`}
                      className="rounded-lg border border-ocean-100 bg-sand/30 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ocean-900">
                          {AREA_LABELS[rec.area] ?? rec.area}
                        </span>
                        <PriorityBadge priority={rec.priority} />
                      </div>
                      <p className="mt-2 text-ocean-800">{rec.suggestion}</p>
                      {rec.example ? (
                        <p className="mt-2 rounded bg-white px-3 py-2 text-xs italic text-ocean-600">
                          Example: {rec.example}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : (
            <p className="mt-8 text-sm text-ocean-600">
              No OpenAI report for this day. Set <code>OPENAI_API_KEY</code> and run again.
            </p>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <PageTable
              title="Top-performing pages"
              pages={snapshot.topPerformingPages ?? []}
              variant="high"
            />
            <PageTable
              title="Low-performing pages"
              pages={snapshot.lowPerformingPages ?? []}
              variant="low"
            />
          </div>

          <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ocean-900">Top landing pages</h2>
            {snapshot.topLandingPages?.length ? (
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ocean-100 text-xs uppercase text-ocean-500">
                    <th className="py-2">Path</th>
                    <th className="py-2 text-right">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.topLandingPages.map((p) => (
                    <tr key={p.path} className="border-b border-ocean-50">
                      <td className="py-2 font-mono text-xs text-ocean-800">{p.path}</td>
                      <td className="py-2 text-right tabular-nums text-ocean-900">
                        {p.sessions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-ocean-500">No landing data</p>
            )}
          </section>
        </>
      )}

      <p className="mt-10 text-xs text-ocean-500">
        Setup: <code>docs/AI-CONVERSION-OPT.md</code>
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ocean-900">{value}</p>
    </div>
  );
}

function FunnelBar({ step, maxCount }: { step: FunnelStep; maxCount: number }) {
  const widthPct = maxCount > 0 ? Math.max(4, (step.count / maxCount) * 100) : 4;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ocean-900">{step.label}</span>
        <span className="tabular-nums text-ocean-700">
          {step.count.toLocaleString("en-IN")}
          {step.dropOffPct != null && step.dropOffPct > 0 ? (
            <span className="ml-2 text-red-600">−{step.dropOffPct}% drop</span>
          ) : null}
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-ocean-100">
        <div
          className="h-full rounded-full bg-ocean-600 transition-all"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === "high"
      ? "bg-red-100 text-red-800"
      : severity === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-ocean-100 text-ocean-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${cls}`}>
      {severity}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "high"
      ? "text-red-700"
      : priority === "medium"
        ? "text-amber-700"
        : "text-ocean-600";
  return <span className={`text-xs font-semibold uppercase ${cls}`}>{priority}</span>;
}

function PageTable({
  title,
  pages,
  variant,
}: {
  title: string;
  pages: ConversionOptDailyDoc["topPerformingPages"];
  variant: "high" | "low";
}) {
  return (
    <section className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-ocean-900">{title}</h2>
      {pages.length === 0 ? (
        <p className="mt-2 text-sm text-ocean-500">No data yet</p>
      ) : (
        <table className="mt-3 w-full text-left text-xs">
          <thead>
            <tr className="border-b border-ocean-100 text-ocean-500">
              <th className="py-2">Page</th>
              <th className="py-2 text-right">Views</th>
              <th className="py-2 text-right">Book %</th>
              <th className="py-2 text-right">Scroll</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.path} className="border-b border-ocean-50">
                <td className="py-2 font-mono text-ocean-800">{p.path}</td>
                <td className="py-2 text-right tabular-nums">{p.views}</td>
                <td
                  className={`py-2 text-right tabular-nums ${
                    variant === "high" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {p.bookingPageRatePct}%
                </td>
                <td className="py-2 text-right tabular-nums text-ocean-600">
                  {p.avgScrollPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
