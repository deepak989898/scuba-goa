"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { CommandCenterSettings } from "@/lib/command-center/types";

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

type AgentMeta = {
  id: string;
  name: string;
  description: string;
  adminPath: string;
  cronSchedule?: string;
};

const STATUS_COLOR: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  running: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
  skipped: "bg-gray-100 text-gray-700",
  idle: "bg-sand text-ocean-700",
};

export default function AdminCommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [settings, setSettings] = useState<CommandCenterSettings | null>(null);
  const [latestReport, setLatestReport] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [tasks, setTasks] = useState<unknown[]>([]);
  const [agentLogs, setAgentLogs] = useState<unknown[]>([]);
  const [insights, setInsights] = useState<unknown[]>([]);
  const [decisions, setDecisions] = useState<unknown[]>([]);
  const [alerts, setAlerts] = useState<unknown[]>([]);
  const [memory, setMemory] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/command-center/dashboard?days=14");
      setAgents(data.agents ?? []);
      setSettings(data.settings ?? null);
      setLatestReport(data.latestReport ?? null);
      setStats(data.stats ?? null);
      setPendingApprovals(data.pendingApprovals ?? 0);
      setTasks(data.tasks ?? []);
      setAgentLogs(data.agentLogs ?? []);
      setInsights(data.insights ?? []);
      setDecisions(data.decisions ?? []);
      setAlerts(data.alerts ?? []);
      setMemory(data.memory ?? {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runCenter() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await adminFetch("/api/admin/command-center/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setOk("Command center orchestration complete.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/command-center/settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
      setSettings(data.settings ?? settings);
      setOk("Settings saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const agentStatuses = (latestReport?.agentStatuses ?? {}) as Record<string, string>;
  const revenue = (latestReport?.revenueSnapshot ?? {}) as Record<string, number>;
  const seo = (latestReport?.seoSnapshot ?? {}) as Record<string, number>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">
            AI Command Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Central hub for 7 autonomous AI agents — orchestration, memory, task queue,
            cross-agent insights, and daily business brief. Cron at{" "}
            <code className="rounded bg-sand px-1 text-xs">06:15 UTC</code>.
          </p>
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

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runCenter()}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Orchestrating…" : "Run command center now"}
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
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Bookings (yesterday)", revenue.bookingsPaid ?? 0],
              ["Revenue ₹", revenue.revenueInr ?? 0],
              ["Conversion %", revenue.conversionRatePct ?? 0],
              ["Pending approvals", pendingApprovals],
              ["SEO clicks", seo.clicks ?? 0],
              ["SEO position", seo.position ?? 0],
              ["Queued tasks", stats?.queuedTasks ?? 0],
              ["Critical alerts", stats?.openAlerts ?? 0],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                  {label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-ocean-900">{value}</p>
              </div>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ocean-900">AI agents</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((a) => {
                const st = agentStatuses[a.id] ?? "idle";
                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-ocean-900">{a.name}</h3>
                        <p className="mt-1 text-xs text-ocean-600">{a.description}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[st] ?? STATUS_COLOR.idle}`}
                      >
                        {st}
                      </span>
                    </div>
                    {a.cronSchedule ? (
                      <p className="mt-2 text-xs text-ocean-500">Cron: {a.cronSchedule} UTC</p>
                    ) : null}
                    <Link
                      href={a.adminPath}
                      className="mt-3 inline-block text-sm font-semibold text-ocean-700 underline"
                    >
                      Open agent →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

          {settings ? (
            <section className="mt-10 rounded-xl border border-ocean-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">Orchestration settings</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["enabled", "Command center enabled"],
                    ["masterAiEnabled", "Master AI coordinator"],
                    ["autoCreateTasks", "Auto-create task queue"],
                    ["conflictPrevention", "Conflict prevention"],
                    ["notifyTelegram", "Telegram daily brief"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-ocean-800">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) =>
                        setSettings((s) => (s ? { ...s, [key]: e.target.checked } : s))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveSettings()}
                className="mt-4 rounded-full bg-ocean-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save settings
              </button>
            </section>
          ) : null}

          {latestReport ? (
            <section className="mt-10">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Master AI brief — {String(latestReport.headline ?? "")}
              </h2>
              {Array.isArray(latestReport.topPriorities) ? (
                <ul className="mt-2 list-inside list-disc text-sm text-ocean-800">
                  {(latestReport.topPriorities as string[]).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-sand p-4 text-sm text-ocean-800">
                {String(latestReport.summaryMarkdown ?? latestReport.summaryPlain ?? "")}
              </pre>
            </section>
          ) : (
            <p className="mt-8 text-ocean-600">
              No command center report yet. Click <strong>Run command center now</strong> after
              other agents have run today.
            </p>
          )}

          <JsonSection title="Alerts" data={alerts.slice(0, 8)} />
          <JsonSection title="AI decisions" data={decisions.slice(0, 8)} />
          <JsonSection title="Cross-agent insights" data={insights.slice(0, 8)} />
          <JsonSection title="Task queue" data={tasks.slice(0, 10)} />
          <JsonSection title="Agent activity logs" data={agentLogs.slice(0, 12)} />

          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ocean-900">AI memory</h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sand p-3 text-xs text-ocean-800">
              {JSON.stringify(memory, null, 2)}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}

function JsonSection({ title, data }: { title: string; data: unknown[] }) {
  if (!data.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold text-ocean-900">{title}</h2>
      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sand p-3 text-xs text-ocean-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
