"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { RecoveryAgentSettings } from "@/lib/recovery-agent/types";

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

type Stats = {
  activeLeads: number;
  hotLeads: number;
  abandonedCount: number;
  recoveryMessagesSent: number;
  recoverySuccessRatePct: number;
  paymentFailures: number;
};

type LeadRow = {
  id: string;
  phone?: string;
  name?: string;
  temperature?: string;
  score?: number;
  status?: string;
  lastEventAt?: string;
  signals?: Record<string, number>;
};

export default function AdminRecoveryAgentPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<RecoveryAgentSettings | null>(null);
  const [hotLeads, setHotLeads] = useState<LeadRow[]>([]);
  const [abandoned, setAbandoned] = useState<unknown[]>([]);
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  const [conversations, setConversations] = useState<unknown[]>([]);
  const [whatsappEvents, setWhatsappEvents] = useState<unknown[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/recovery-agent/dashboard");
      setStats(data.stats ?? null);
      setSettings(data.settings ?? null);
      setHotLeads((data.hotLeads ?? []) as LeadRow[]);
      setAbandoned(data.abandoned ?? []);
      setCampaigns(data.campaigns ?? []);
      setConversations(data.conversations ?? []);
      setWhatsappEvents(data.whatsappEvents ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runPipeline() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const result = await adminFetch("/api/admin/recovery-agent/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setOk(
        `Recovery run complete: ${result.sent ?? 0} sent, ${result.skipped ?? 0} skipped.`,
      );
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
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/recovery-agent/settings", {
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">
            WhatsApp + booking recovery AI
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Tracks high-intent visitors, scores leads, sends AI WhatsApp recovery messages for
            abandoned checkouts, and powers the site chatbot with conversation memory. Hourly cron
            at <code className="rounded bg-sand px-1 text-xs">:15 UTC</code>.
          </p>
        </div>
        <Link
          href="/admin/conversion-opt"
          className="text-sm font-semibold text-ocean-700 underline"
        >
          Conversion AI →
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
          onClick={() => void runPipeline()}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Running…" : "Run recovery now"}
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
          {stats ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Active leads", stats.activeLeads],
                ["Hot leads", stats.hotLeads],
                ["Abandoned bookings", stats.abandonedCount],
                ["Recovery messages sent", stats.recoveryMessagesSent],
                ["Recovery success rate", `${stats.recoverySuccessRatePct}%`],
                ["Payment failures (signals)", stats.paymentFailures],
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
          ) : null}

          {settings ? (
            <section className="mt-10 rounded-xl border border-ocean-100 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">Automation settings</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-ocean-800">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, enabled: e.target.checked } : s))
                    }
                  />
                  Recovery automation enabled
                </label>
                <label className="flex items-center gap-2 text-sm text-ocean-800">
                  <input
                    type="checkbox"
                    checked={settings.urgencyEnabled}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, urgencyEnabled: e.target.checked } : s))
                    }
                  />
                  Limited-time urgency in messages
                </label>
                <label className="block text-sm text-ocean-800">
                  Recovery delay (minutes)
                  <input
                    type="number"
                    min={15}
                    max={240}
                    className="mt-1 w-full rounded border border-ocean-200 px-3 py-2"
                    value={settings.recoveryDelayMinutes}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, recoveryDelayMinutes: Number(e.target.value) } : s,
                      )
                    }
                  />
                </label>
                <label className="block text-sm text-ocean-800">
                  Max recovery attempts per lead
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className="mt-1 w-full rounded border border-ocean-200 px-3 py-2"
                    value={settings.maxRecoveryAttempts}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, maxRecoveryAttempts: Number(e.target.value) } : s,
                      )
                    }
                  />
                </label>
                <label className="block text-sm text-ocean-800">
                  Rate limit (messages / phone / hour)
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="mt-1 w-full rounded border border-ocean-200 px-3 py-2"
                    value={settings.rateLimitPerPhonePerHour}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, rateLimitPerPhonePerHour: Number(e.target.value) } : s,
                      )
                    }
                  />
                </label>
                <label className="block text-sm text-ocean-800">
                  Hot lead score threshold
                  <input
                    type="number"
                    min={40}
                    max={95}
                    className="mt-1 w-full rounded border border-ocean-200 px-3 py-2"
                    value={settings.hotLeadScoreThreshold}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, hotLeadScoreThreshold: Number(e.target.value) } : s,
                      )
                    }
                  />
                </label>
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

          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ocean-900">Hot leads</h2>
            {hotLeads.length === 0 ? (
              <p className="mt-2 text-sm text-ocean-600">No hot leads yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-ocean-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-sand text-ocean-700">
                    <tr>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Last event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotLeads.map((l) => (
                      <tr key={l.id} className="border-t border-ocean-50">
                        <td className="px-3 py-2">{l.phone ?? "—"}</td>
                        <td className="px-3 py-2">{l.name ?? "—"}</td>
                        <td className="px-3 py-2">{l.score ?? "—"}</td>
                        <td className="px-3 py-2">{l.status ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-ocean-600">
                          {l.lastEventAt ? new Date(l.lastEventAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ocean-900">
              Recent recovery campaigns
            </h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sand p-3 text-xs text-ocean-800">
              {JSON.stringify(campaigns.slice(0, 10), null, 2)}
            </pre>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ocean-900">Abandoned bookings</h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sand p-3 text-xs text-ocean-800">
              {JSON.stringify(abandoned.slice(0, 10), null, 2)}
            </pre>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ocean-900">AI conversations</h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sand p-3 text-xs text-ocean-800">
              {JSON.stringify(conversations.slice(0, 5), null, 2)}
            </pre>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ocean-900">WhatsApp events</h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sand p-3 text-xs text-ocean-800">
              {JSON.stringify(whatsappEvents.slice(0, 10), null, 2)}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
