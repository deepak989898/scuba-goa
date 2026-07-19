"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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

type Row = Record<string, unknown>;

const STATUS_COLOR: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  running: "bg-sky-100 text-sky-800",
  error: "bg-red-100 text-red-800",
  skipped: "bg-slate-100 text-slate-600",
  idle: "bg-sand text-ocean-700",
  queued: "bg-amber-100 text-amber-900",
  in_progress: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-600",
};

function str(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  if (Array.isArray(v)) return v.map(String).join(", ") || fallback;
  return String(v);
}

function shortDate(iso: unknown): string {
  const s = str(iso, "");
  if (!s) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    return new Date(s).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s.slice(0, 16);
  }
}

function priorityLevel(raw: unknown): "critical" | "high" | "medium" | "low" | "none" {
  const p = str(raw, "").toLowerCase();
  if (!p || p === "—") return "none";
  if (/(critical|urgent|emergency)/.test(p)) return "critical";
  if (p === "high") return "high";
  if (p === "medium") return "medium";
  if (p === "low") return "low";
  if (/(critical|urgent|emergency)/.test(p)) return "critical";
  return "none";
}

function PriorityBadge({ value }: { value: unknown }) {
  const level = priorityLevel(value);
  const label = str(value, "—");
  const cls =
    level === "critical"
      ? "bg-red-600 text-white"
      : level === "high"
        ? "bg-red-100 text-red-800 ring-1 ring-red-300"
        : level === "medium"
          ? "bg-amber-100 text-amber-900"
          : level === "low"
            ? "bg-slate-100 text-slate-700"
            : "bg-slate-50 text-slate-500";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function SeverityBadge({ value }: { value: unknown }) {
  const s = str(value, "").toLowerCase();
  const cls =
    s === "critical"
      ? "bg-red-600 text-white"
      : s === "warning"
        ? "bg-amber-100 text-amber-900"
        : "bg-sky-100 text-sky-800";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {str(value, "—")}
    </span>
  );
}

function StatusBadge({ value }: { value: unknown }) {
  const s = str(value, "idle").toLowerCase();
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[s] ?? STATUS_COLOR.idle}`}
    >
      {s}
    </span>
  );
}

function highlightUrgentText(text: string) {
  const urgent = /(urgent|emergency|critical)/i.test(text);
  return (
    <span className={urgent ? "font-semibold text-red-700" : "text-ocean-800"}>
      {text}
    </span>
  );
}

function rowTone(priority: unknown, severity?: unknown): string {
  const level = priorityLevel(priority);
  const sev = str(severity, "").toLowerCase();
  if (level === "critical" || sev === "critical") return "bg-red-50/80";
  if (level === "high") return "bg-red-50/40";
  return "";
}

function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; label: string; className?: string; render?: (row: Row) => ReactNode }[];
  rows: Row[];
  empty?: string;
}) {
  if (!rows.length) {
    return (
      <p className="px-2 py-2 text-xs text-ocean-500">{empty ?? "No rows yet."}</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-ocean-100">
      <table className="min-w-full border-collapse text-left text-xs">
        <thead className="bg-ocean-900 text-white">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`whitespace-nowrap px-2 py-1.5 font-semibold ${c.className ?? ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={str(row.id ?? row.taskId ?? row.insightId ?? row.decisionId ?? row.alertId ?? row.logId ?? i)}
              className={`border-t border-ocean-100 ${rowTone(row.priority, row.severity)} ${
                i % 2 === 0 ? "" : "bg-white/60"
              }`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-2 py-1.5 align-top text-ocean-800 ${c.className ?? ""}`}>
                  {c.render ? c.render(row) : str(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 flex items-baseline gap-2 font-display text-sm font-bold text-ocean-900">
        {title}
        {count != null ? (
          <span className="text-[11px] font-medium text-ocean-500">({count})</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

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
  const [tasks, setTasks] = useState<Row[]>([]);
  const [agentLogs, setAgentLogs] = useState<Row[]>([]);
  const [insights, setInsights] = useState<Row[]>([]);
  const [decisions, setDecisions] = useState<Row[]>([]);
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [memory, setMemory] = useState<Record<string, string[]>>({});
  const [liveSeo, setLiveSeo] = useState<{
    clicks: number;
    impressions: number;
    position: number;
    asOfDate?: string;
    source?: string;
    note?: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      setTasks((data.tasks ?? []) as Row[]);
      setAgentLogs((data.agentLogs ?? []) as Row[]);
      setInsights((data.insights ?? []) as Row[]);
      setDecisions((data.decisions ?? []) as Row[]);
      setAlerts((data.alerts ?? []) as Row[]);
      setMemory(data.memory ?? {});
      setLiveSeo(data.liveSeoSnapshot ?? null);
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
  const seoFromReport = (latestReport?.seoSnapshot ?? {}) as Record<string, unknown>;
  const seo = {
    clicks: Number(liveSeo?.clicks ?? seoFromReport.clicks ?? 0),
    impressions: Number(liveSeo?.impressions ?? seoFromReport.impressions ?? 0),
    position: Number(liveSeo?.position ?? seoFromReport.position ?? 0),
    asOfDate: String(liveSeo?.asOfDate ?? seoFromReport.asOfDate ?? ""),
    source: String(liveSeo?.source ?? seoFromReport.source ?? ""),
    note: String(liveSeo?.note ?? seoFromReport.note ?? ""),
  };

  function formatSeoPosition(pos: number): string {
    if (!Number.isFinite(pos) || pos <= 0) return "—";
    return pos.toFixed(1);
  }

  const metricCritical = Number(stats?.openAlerts ?? 0) > 0;

  const memoryRows: Row[] = Object.entries(memory).flatMap(([category, lines]) =>
    (lines ?? []).slice(0, 6).map((line, i) => {
      const m = String(line).match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
      return {
        id: `${category}-${i}`,
        category,
        dateIst: m?.[1] ?? "—",
        summary: m?.[2] ?? String(line),
        priority: /(urgent|emergency|critical)/i.test(String(line)) ? "critical" : "",
      };
    }),
  );

  return (
    <div className="pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-base font-bold text-ocean-900">AI Command Center</h1>
          <p className="text-xs text-ocean-600">
            7 agents · cron <code className="rounded bg-sand px-1">06:15 UTC</code>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runCenter()}
            className="rounded-full bg-ocean-800 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Orchestrating…" : "Run now"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs text-ocean-800"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs text-ocean-800"
          >
            {settingsOpen ? "Hide settings" : "Settings"}
          </button>
        </div>
      </div>

      {err ? (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
          {ok}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-ocean-600">Loading…</p>
      ) : (
        <>
          {/* Compact metrics */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
            {[
              { label: "Bookings", value: revenue.bookingsPaid ?? 0 },
              { label: "Revenue ₹", value: revenue.revenueInr ?? 0 },
              { label: "Conv %", value: revenue.conversionRatePct ?? 0 },
              { label: "Approvals", value: pendingApprovals },
              { label: "SEO clicks", value: seo.clicks },
              { label: "SEO pos", value: formatSeoPosition(seo.position) },
              { label: "Tasks", value: stats?.queuedTasks ?? 0 },
              {
                label: "Alerts",
                value: stats?.openAlerts ?? 0,
                danger: metricCritical,
              },
            ].map((m) => (
              <div
                key={m.label}
                className={`rounded-lg border px-2 py-1.5 ${
                  m.danger
                    ? "border-red-300 bg-red-50"
                    : "border-ocean-100 bg-white"
                }`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-ocean-500">
                  {m.label}
                </p>
                <p
                  className={`font-display text-lg font-bold leading-tight ${
                    m.danger ? "text-red-700" : "text-ocean-900"
                  }`}
                >
                  {m.value}
                </p>
                {m.label === "SEO pos" && seo.asOfDate ? (
                  <p className="truncate text-[9px] text-ocean-500">{seo.asOfDate}</p>
                ) : null}
              </div>
            ))}
          </div>
          {seo.note ? (
            <p
              className={`mt-1.5 rounded border px-2 py-1 text-[10px] ${
                seo.source === "none"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-ocean-100 bg-ocean-50/50 text-ocean-700"
              }`}
            >
              <strong>SEO:</strong> {seo.note}
            </p>
          ) : null}

          {/* Agents compact table */}
          <Section title="AI agents" count={agents.length}>
            <DataTable
              rows={agents.map((a) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                status: agentStatuses[a.id] ?? "idle",
                cron: a.cronSchedule ? `${a.cronSchedule} UTC` : "—",
                adminPath: a.adminPath,
              }))}
              columns={[
                { key: "name", label: "Agent", className: "min-w-[7rem]" },
                {
                  key: "status",
                  label: "Status",
                  render: (r) => <StatusBadge value={r.status} />,
                },
                {
                  key: "description",
                  label: "Focus",
                  className: "max-w-[14rem]",
                  render: (r) => (
                    <span className="line-clamp-2 text-[11px] text-ocean-700">
                      {str(r.description)}
                    </span>
                  ),
                },
                { key: "cron", label: "Cron" },
                {
                  key: "open",
                  label: "",
                  render: (r) => (
                    <Link
                      href={str(r.adminPath)}
                      className="font-semibold text-cyan-800 underline"
                    >
                      Open
                    </Link>
                  ),
                },
              ]}
            />
          </Section>

          {settingsOpen && settings ? (
            <section className="mt-3 rounded-lg border border-ocean-100 bg-white p-3">
              <h2 className="font-display text-sm font-bold text-ocean-900">
                Orchestration settings
              </h2>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["enabled", "Command center enabled"],
                    ["masterAiEnabled", "Master AI coordinator"],
                    ["autoCreateTasks", "Auto-create task queue"],
                    ["conflictPrevention", "Conflict prevention"],
                    ["notifyTelegram", "Telegram daily brief"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-ocean-800">
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
                className="mt-2 rounded-full bg-ocean-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save settings
              </button>
            </section>
          ) : null}

          {latestReport ? (
            <Section title={`Brief — ${str(latestReport.headline, "Master AI")}`}>
              {Array.isArray(latestReport.topPriorities) &&
              (latestReport.topPriorities as string[]).length > 0 ? (
                <ul className="mb-2 space-y-0.5 text-xs">
                  {(latestReport.topPriorities as string[]).map((p) => (
                    <li key={p} className="flex gap-1.5">
                      <span className="text-red-600">•</span>
                      {highlightUrgentText(p)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="max-h-36 overflow-auto rounded-lg border border-ocean-100 bg-sand/60 px-2.5 py-2 text-xs leading-snug text-ocean-800 whitespace-pre-wrap">
                {String(latestReport.summaryMarkdown ?? latestReport.summaryPlain ?? "").slice(
                  0,
                  1200,
                )}
                {String(latestReport.summaryMarkdown ?? latestReport.summaryPlain ?? "").length >
                1200
                  ? "…"
                  : ""}
              </div>
            </Section>
          ) : (
            <p className="mt-3 text-xs text-ocean-600">
              No report yet. Click <strong>Run now</strong> after other agents have data.
            </p>
          )}

          <Section title="Alerts" count={alerts.length}>
            <DataTable
              rows={alerts.slice(0, 12)}
              empty="No alerts."
              columns={[
                {
                  key: "severity",
                  label: "Severity",
                  render: (r) => <SeverityBadge value={r.severity} />,
                },
                { key: "agentId", label: "Agent" },
                {
                  key: "title",
                  label: "Title",
                  className: "min-w-[10rem]",
                  render: (r) => (
                    <span className="font-medium">{highlightUrgentText(str(r.title))}</span>
                  ),
                },
                {
                  key: "message",
                  label: "Message",
                  className: "max-w-[18rem]",
                  render: (r) => (
                    <span className="line-clamp-2 text-[11px]">{str(r.message)}</span>
                  ),
                },
                {
                  key: "dateIst",
                  label: "Date",
                  render: (r) => shortDate(r.dateIst ?? r.createdAt),
                },
              ]}
            />
          </Section>

          <Section title="AI decisions" count={decisions.length}>
            <DataTable
              rows={decisions.slice(0, 12)}
              empty="No decisions yet."
              columns={[
                {
                  key: "priority",
                  label: "Priority",
                  render: (r) => <PriorityBadge value={r.priority} />,
                },
                {
                  key: "title",
                  label: "Decision",
                  className: "min-w-[12rem]",
                  render: (r) => (
                    <span className="font-medium">{highlightUrgentText(str(r.title))}</span>
                  ),
                },
                {
                  key: "reasoning",
                  label: "Why",
                  className: "max-w-[16rem]",
                  render: (r) => (
                    <span className="line-clamp-2 text-[11px]">{str(r.reasoning)}</span>
                  ),
                },
                {
                  key: "affectedAgents",
                  label: "Agents",
                  render: (r) => (
                    <span className="text-[11px]">{str(r.affectedAgents)}</span>
                  ),
                },
                {
                  key: "requiresApproval",
                  label: "Approval",
                  render: (r) =>
                    r.requiresApproval ? (
                      <span className="font-bold text-red-700">Yes</span>
                    ) : (
                      "No"
                    ),
                },
              ]}
            />
          </Section>

          <Section title="Cross-agent insights" count={insights.length}>
            <DataTable
              rows={insights.slice(0, 12)}
              empty="No insights yet."
              columns={[
                {
                  key: "priority",
                  label: "Priority",
                  render: (r) => <PriorityBadge value={r.priority} />,
                },
                { key: "topic", label: "Topic", className: "min-w-[8rem]" },
                {
                  key: "message",
                  label: "Insight",
                  className: "max-w-[18rem]",
                  render: (r) => (
                    <span className="line-clamp-2 text-[11px]">
                      {highlightUrgentText(str(r.message))}
                    </span>
                  ),
                },
                { key: "fromAgent", label: "From" },
                {
                  key: "toAgents",
                  label: "To",
                  render: (r) => <span className="text-[11px]">{str(r.toAgents)}</span>,
                },
                {
                  key: "createdAt",
                  label: "When",
                  render: (r) => shortDate(r.createdAt ?? r.dateIst),
                },
              ]}
            />
          </Section>

          <Section title="Task queue" count={tasks.length}>
            <DataTable
              rows={tasks.slice(0, 15)}
              empty="No queued tasks."
              columns={[
                {
                  key: "priority",
                  label: "Priority",
                  render: (r) => <PriorityBadge value={r.priority} />,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (r) => <StatusBadge value={r.status} />,
                },
                { key: "agentId", label: "Agent" },
                {
                  key: "title",
                  label: "Task",
                  className: "min-w-[12rem]",
                  render: (r) => (
                    <div>
                      <p className="font-medium">{highlightUrgentText(str(r.title))}</p>
                      <p className="line-clamp-1 text-[10px] text-ocean-600">
                        {str(r.description)}
                      </p>
                    </div>
                  ),
                },
                { key: "dateIst", label: "Date" },
                {
                  key: "createdAt",
                  label: "Created",
                  render: (r) => shortDate(r.createdAt),
                },
              ]}
            />
          </Section>

          <Section title="Agent activity logs" count={agentLogs.length}>
            <DataTable
              rows={agentLogs.slice(0, 15)}
              empty="No logs yet."
              columns={[
                {
                  key: "status",
                  label: "Status",
                  render: (r) => <StatusBadge value={r.status} />,
                },
                { key: "agentId", label: "Agent" },
                { key: "action", label: "Action" },
                {
                  key: "summary",
                  label: "Summary",
                  className: "max-w-[20rem]",
                  render: (r) => (
                    <span className="line-clamp-2 text-[11px]">{str(r.summary)}</span>
                  ),
                },
                { key: "dateIst", label: "Date" },
                {
                  key: "createdAt",
                  label: "When",
                  render: (r) => shortDate(r.createdAt),
                },
              ]}
            />
          </Section>

          <Section title="AI memory" count={memoryRows.length}>
            <DataTable
              rows={memoryRows}
              empty="No memory entries."
              columns={[
                {
                  key: "category",
                  label: "Category",
                  render: (r) => (
                    <span className="rounded bg-ocean-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ocean-800">
                      {str(r.category)}
                    </span>
                  ),
                },
                { key: "dateIst", label: "Date" },
                {
                  key: "summary",
                  label: "Memory",
                  className: "min-w-[16rem]",
                  render: (r) => highlightUrgentText(str(r.summary)),
                },
              ]}
            />
          </Section>
        </>
      )}
    </div>
  );
}
