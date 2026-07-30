"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { AiAnalyticsDailyDoc, AiAnalyticsReportDoc } from "@/lib/ai-analytics/types";

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

type DailyRow = AiAnalyticsDailyDoc & { id: string };
type ReportRow = AiAnalyticsReportDoc & { id: string };

export default function AdminAiAnalyticsPage() {
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
      const data = await adminFetch("/api/admin/ai-analytics/dashboard?days=14");
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

  async function runNow(skipNotify: boolean) {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/ai-analytics/run", {
        method: "POST",
        body: JSON.stringify({ skipNotifications: skipNotify }),
      });
      setOk(
        skipNotify
          ? "Daily snapshot + AI report generated (notifications skipped)."
          : "Daily snapshot generated and notifications sent where configured.",
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  const m = snapshot?.internal;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">
            AI analytics agent
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Daily data from Firestore + GA4 + Search Console. OpenAI writes the report;
            Telegram / email / WhatsApp alerts when env vars are set. Cron runs{" "}
            <code className="rounded bg-sand px-1 text-xs">04:00 UTC</code> (yesterday IST).
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 text-sm font-semibold text-ocean-700">
          <Link href="/admin/conversion-opt" className="underline">
            Conversion AI →
          </Link>
          <Link href="/admin/analytics" className="underline">
            Live visitors →
          </Link>
        </div>
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

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runNow(true)}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Running…" : "Generate report now"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runNow(false)}
          className="rounded-full border border-ocean-300 px-5 py-2 text-sm font-semibold text-ocean-900 disabled:opacity-50"
        >
          Generate + send alerts
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
        <p className="mt-3 text-ocean-600">Loading…</p>
      ) : !snapshot ? (
        <p className="mt-3 text-ocean-600">
          No daily snapshots yet. Click <strong>Generate report now</strong> after you have
          site traffic.
        </p>
      ) : (
        <>
          <label className="mt-3 block text-sm text-ocean-800">
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

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Humans" value={m?.visitorsHuman ?? m?.visitors ?? 0} />
            <MetricCard label="Bots" value={m?.visitorsBot ?? 0} />
            <MetricCard label="Suspected" value={m?.visitorsSuspected ?? 0} />
            <MetricCard label="All visitors" value={m?.visitorsAll ?? m?.visitors ?? 0} />
            <MetricCard label="Page views (humans)" value={m?.pageViews ?? 0} />
            <MetricCard label="Bounce rate" value={`${m?.bounceRatePct ?? 0}%`} />
            <MetricCard label="Bookings paid" value={m?.bookingsPaid ?? 0} />
            <MetricCard label="Revenue (₹)" value={(m?.bookingRevenueInr ?? 0).toLocaleString("en-IN")} />
            <MetricCard label="Conversion" value={`${m?.bookingConversionRatePct ?? 0}%`} />
            <MetricCard label="WhatsApp clicks" value={m?.whatsappClicks ?? 0} />
            <MetricCard
              label="Payments fail / dismiss"
              value={`${m?.paymentFailed ?? 0} / ${m?.paymentDismissed ?? 0}`}
            />
          </div>

          <section className="mt-3 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ocean-900">Connectors</h2>
            <ul className="mt-3 space-y-1 text-sm text-ocean-800">
              <li>
                GA4:{" "}
                <StatusBadge status={snapshot.connectorsStatus?.ga4} />{" "}
                <span className="text-ocean-600">{snapshot.connectorsStatus?.ga4Message}</span>
              </li>
              <li>
                Search Console:{" "}
                <StatusBadge status={snapshot.connectorsStatus?.searchConsole} />{" "}
                <span className="text-ocean-600">
                  {snapshot.connectorsStatus?.searchConsoleMessage}
                </span>
              </li>
              <li>
                Clarity:{" "}
                {snapshot.clarity?.configured ? (
                  <>
                    <a
                      href="https://clarity.microsoft.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-ocean-700 underline"
                    >
                      Open Clarity
                    </a>
                    <span className="text-ocean-600">
                      {" "}
                      — sign in, then select project{" "}
                      <code className="rounded bg-sand px-1 text-xs">
                        {snapshot.clarity.projectId}
                      </code>
                    </span>
                  </>
                ) : (
                  <span className="text-amber-700">Not configured</span>
                )}
              </li>
            </ul>
            {snapshot.clarity?.configured ? (
              <p className="mt-3 rounded-lg border border-ocean-100 bg-ocean-50 px-3 py-2 text-xs text-ocean-700">
                <strong>Tip:</strong> Use the main Clarity website (link above). Direct project
                URLs often show &quot;Confirmation Type not supported&quot; — pick your site from
                the project list after login.
              </p>
            ) : null}
          </section>

          {(report?.actions?.length || snapshot.insights?.recommendations?.length) ? (
            <section className="mt-3 rounded-xl border border-ocean-200 bg-ocean-50/40 p-3 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Tomorrow&apos;s 3 actions
              </h2>
              <p className="mt-1 text-xs text-ocean-600">
                Based on exit pages, bounce, and bookings — not generic marketing tips.
              </p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-ocean-900">
                {(report?.actions?.length
                  ? report.actions
                  : snapshot.insights.recommendations
                )
                  .slice(0, 3)
                  .map((a) => (
                    <li key={a} className="leading-relaxed">
                      {a}
                    </li>
                  ))}
              </ol>
            </section>
          ) : null}

          {report?.summaryMarkdown ? (
            <section className="mt-3 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                AI daily report — {report.dateIst}
              </h2>
              {report.headline ? (
                <p className="mt-2 text-sm font-semibold text-ocean-800">{report.headline}</p>
              ) : null}
              <div className="prose prose-ocean mt-4 max-w-none whitespace-pre-wrap text-sm text-ocean-800">
                {report.summaryMarkdown}
              </div>
            </section>
          ) : null}

          {snapshot.insights?.recommendations?.length ? (
            <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Agent recommendations
              </h2>
              <p className="mt-1 text-xs text-ocean-600">
                Rule-based alerts from today&apos;s paths and metrics.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ocean-800">
                {snapshot.insights.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <TableBlock
              title="Top pages (views)"
              rows={m?.topPages?.map((p) => [p.path, String(p.views)]) ?? []}
            />
            <TableBlock
              title="Exit pages (leaves)"
              rows={m?.exitPages?.map((p) => [p.path, String(p.views)]) ?? []}
            />
          </div>

          {snapshot.insights?.highTrafficLowConversion?.length ? (
            <section className="mt-3 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                High traffic, low conversion
              </h2>
              <ul className="mt-4 space-y-3 text-sm">
                {snapshot.insights.highTrafficLowConversion.map((p) => (
                  <li key={p.path} className="rounded-lg border border-ocean-100 bg-sand/40 p-3">
                    <p className="font-mono font-semibold text-ocean-900">{p.path}</p>
                    <p className="text-ocean-700">
                      {p.views} views · ~{p.conversionRatePct}% conv
                    </p>
                    <p className="mt-1 text-ocean-600">{p.likelyIssue}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <p className="mt-4 text-xs text-ocean-500">
        Setup: <code>docs/AI-ANALYTICS-AGENT.md</code>
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-ocean-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const cls =
    status === "ok"
      ? "text-green-700"
      : status === "skipped"
        ? "text-ocean-600"
        : "text-red-700";
  return <span className={`font-semibold ${cls}`}>{status ?? "—"}</span>;
}

function TableBlock({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
      <h2 className="font-display text-lg font-bold text-ocean-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ocean-500">No data</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <tbody>
            {rows.map(([path, n]) => (
              <tr key={path} className="border-b border-ocean-50">
                <td className="py-2 font-mono text-xs text-ocean-800">{path}</td>
                <td className="py-2 text-right tabular-nums text-ocean-900">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
