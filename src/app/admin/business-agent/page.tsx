"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";

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

type ActionRow = {
  actionId: string;
  createdAt: string;
  kind: string;
  risk?: string;
  status: string;
  target: { collection: string; docId: string };
  reason: string;
  lastRollbackId?: string;
  error?: string;
};

type DashboardData = {
  reports?: any[];
  actions?: ActionRow[];
  rollbacks?: any[];
};

export default function AdminBusinessAgentPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = (await adminFetch("/api/admin/business-agent/dashboard?days=14")) as DashboardData;
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

  const actions = data.actions ?? [];
  const pending = useMemo(
    () => actions.filter((a) => a.status === "pending_approval"),
    [actions],
  );
  const applied = useMemo(
    () => actions.filter((a) => a.status === "applied"),
    [actions],
  );

  async function approve(actionId: string) {
    setBusy(actionId);
    setErr(null);
    setOk(null);
    try {
      await adminFetch(`/api/admin/business-agent/action/approve`, {
        method: "POST",
        body: JSON.stringify({ actionId }),
      });
      setOk("Approved and applied.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(actionId: string) {
    setBusy(actionId);
    setErr(null);
    setOk(null);
    try {
      await adminFetch(`/api/admin/business-agent/action/reject`, {
        method: "POST",
        body: JSON.stringify({ actionId }),
      });
      setOk("Rejected.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  async function rollback(rollbackId: string) {
    if (!rollbackId) return;
    setBusy(`rb_${rollbackId}`);
    setErr(null);
    setOk(null);
    try {
      await adminFetch(`/api/admin/business-agent/rollback`, {
        method: "POST",
        body: JSON.stringify({ rollbackId }),
      });
      setOk("Rolled back.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rollback failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">AI business ops agent</h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Auto-monitors daily analytics, proposes safe SEO/meta updates, logs every change, and supports rollback + admin approvals.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-ocean-700">
          <Link href="/admin/ai-analytics" className="underline">
            AI analytics →
          </Link>
          <Link href="/admin/seo-agent" className="underline">
            SEO agent →
          </Link>
          <Link href="/admin/conversion-opt" className="underline">
            Conversion AI →
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ocean-900">Pending approvals</h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-ocean-500">No pending actions right now.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pending.map((a) => (
                <li key={a.actionId} className="rounded-lg border border-ocean-100 bg-sand/20 p-4">
                  <p className="font-mono text-xs text-ocean-900">{a.target.collection}/{a.target.docId}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-800">{a.kind}</p>
                  <p className="mt-1 text-xs text-ocean-600">{a.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === a.actionId}
                      onClick={() => void approve(a.actionId)}
                      className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy === a.actionId ? "Approving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === a.actionId}
                      onClick={() => void reject(a.actionId)}
                      className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-semibold text-ocean-800 disabled:opacity-50"
                    >
                      {busy === a.actionId ? "Rejecting…" : "Reject"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ocean-900">Applied actions (rollback ready)</h2>
          {applied.length === 0 ? (
            <p className="mt-2 text-sm text-ocean-500">No applied actions yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {applied.slice(0, 10).map((a) => (
                <li key={a.actionId} className="rounded-lg border border-ocean-100 bg-white p-4">
                  <p className="font-mono text-xs text-ocean-900">{a.target.collection}/{a.target.docId}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-800">{a.kind}</p>
                  <p className="mt-1 text-xs text-ocean-600">
                    {a.lastRollbackId ? `rollbackId: ${a.lastRollbackId}` : "rollbackId: —"}
                  </p>
                  <button
                    type="button"
                    disabled={!a.lastRollbackId || busy === `rb_${a.lastRollbackId}`}
                    onClick={() => void rollback(a.lastRollbackId ?? "")}
                    className="mt-3 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                  >
                    Rollback
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-10 text-xs text-ocean-500">
        Setup: this agent runs on <code>CRON_SECRET</code> and uses <code>OPENAI_API_KEY</code> + your existing Admin SDK credentials.
      </p>
    </div>
  );
}

