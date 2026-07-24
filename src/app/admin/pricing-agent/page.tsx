"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import type { PricingSettings, PricingSuggestion } from "@/lib/pricing-agent/types";

type Cards = {
  totalAnalyzed: number;
  pending: number;
  approved: number;
  rejected: number;
  autoApproved: number;
  skipped: number;
  lowConfidence: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  avgIncreasePercent: number;
  avgDecreasePercent: number;
};

type RunRow = {
  id: string;
  status: string;
  runType: string;
  startedAt: string;
  suggestionsCreated: number;
  pricesUpdated: number;
  dryRun?: boolean;
};

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

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function AdminPricingAgentPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cards, setCards] = useState<Cards | null>(null);
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [suggestions, setSuggestions] = useState<PricingSuggestion[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [serperConfigured, setSerperConfigured] = useState<boolean | null>(null);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<PricingSuggestion | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [detail, setDetail] = useState<{
    snapshots: { providerName: string; price: number; sourceUrl: string; similarityScore: number; packageTitle: string }[];
    history: { id: string; oldPrice: number; newPrice: number; createdAt: string; changeSource: string }[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/pricing-agent/dashboard");
      setCards(data.cards);
      setSettings(data.settings);
      setSuggestions(data.suggestions ?? []);
      setRuns(data.runs ?? []);
      setSerperConfigured(
        typeof data.serperConfigured === "boolean" ? data.serperConfigured : null,
      );
      setOpenaiConfigured(
        typeof data.openaiConfigured === "boolean" ? data.openaiConfigured : null,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return suggestions.filter((s) => {
      if (filter === "all") return true;
      if (filter === "pending") return s.status === "pending";
      if (filter === "approved") return s.status === "approved" || s.status === "auto_approved";
      if (filter === "rejected") return s.status === "rejected";
      if (filter === "auto_approved") return s.status === "auto_approved";
      if (filter === "low") return s.status === "pending" && s.confidenceScore < 75;
      if (filter === "increase") return s.differenceAmount > 0;
      if (filter === "decrease") return s.differenceAmount < 0;
      return true;
    });
  }, [suggestions, filter]);

  async function runNow(dryRun: boolean) {
    if (
      !confirm(
        dryRun
          ? "Dry run: generate suggestions without changing live prices?"
          : "Run full market price analysis now? This may take a few minutes.",
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const data = await adminFetch("/api/admin/pricing-agent/run", {
        method: "POST",
        body: JSON.stringify({ dryRun }),
      });
      setOk(
        `Run ${data.runId}: ${data.suggestionsCreated} suggestions, ${data.pricesUpdated} prices updated.` +
          (data.serperConfigured === false
            ? " ⚠ SERPER_API_KEY missing on Vercel — Serper credits will stay unused. Add SERPER_API_KEY in Vercel → Environment Variables, then Redeploy."
            : ` Serper calls OK: ${data.serperHttpOk ?? 0}` +
              (data.serperHttpFail
                ? `, failed: ${data.serperHttpFail}`
                : "") +
              "."),
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(patch: Partial<PricingSettings>) {
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/pricing-agent/settings", {
        method: "POST",
        body: JSON.stringify(patch),
      });
      setSettings(data.settings);
      setOk("Settings saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(s: PricingSuggestion) {
    setSelected(s);
    setCustomPrice(String(s.suggestedPrice));
    setDetail(null);
    try {
      const data = await adminFetch(
        `/api/admin/pricing-agent/suggestion?id=${encodeURIComponent(s.id)}`,
      );
      setDetail({
        snapshots: data.snapshots ?? [],
        history: data.history ?? [],
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load details");
    }
  }

  async function act(
    action: "approve" | "reject" | "keep" | "edit_approve" | "rollback",
  ) {
    if (!selected) return;
    setBusy(true);
    setErr(null);
    try {
      await adminFetch("/api/admin/pricing-agent/suggestion", {
        method: "POST",
        body: JSON.stringify({
          suggestionId: selected.id,
          action,
          customPrice:
            action === "edit_approve" ? Number(customPrice) : undefined,
          historyId: action === "rollback" ? detail?.history?.[0]?.id : undefined,
        }),
      });
      setOk(`Action ${action} completed.`);
      setSelected(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function bulkApprove() {
    const pending = filtered.filter(
      (s) =>
        s.status === "pending" &&
        s.autoApproveEligible &&
        s.confidenceScore >= 75,
    );
    if (!pending.length) {
      setErr("No high-confidence pending suggestions in this filter.");
      return;
    }
    if (
      !confirm(
        `Approve ${pending.length} high-confidence suggestion(s) and update live prices?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    let n = 0;
    try {
      for (const s of pending) {
        await adminFetch("/api/admin/pricing-agent/suggestion", {
          method: "POST",
          body: JSON.stringify({ suggestionId: s.id, action: "approve" }),
        });
        n += 1;
      }
      setOk(`Bulk approved ${n} suggestion(s).`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk approve failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">
            AI Pricing
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Weekly Goa market research (Tuesday 6:00 AM IST). Suggestions need
            approval unless Auto Approve is enabled. Existing bookings keep their
            original cart prices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runNow(true)}
            className="rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800 disabled:opacity-50"
          >
            Dry run
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runNow(false)}
            className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Working…" : "Run price analysis now"}
          </button>
        </div>
      </div>

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {ok}
        </p>
      ) : null}

      {serperConfigured === false ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Serper API key not found on the live server.</strong> Creating a
          key on serper.dev is not enough — add{" "}
          <code className="rounded bg-white px-1">SERPER_API_KEY</code> in{" "}
          <strong>Vercel → Project → Settings → Environment Variables</strong>{" "}
          (Production), then <strong>Redeploy</strong>. Until then Serper credits
          stay unused and every item will be Skipped.
        </p>
      ) : null}
      {serperConfigured === true && openaiConfigured === false ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2 text-sm text-amber-900">
          Serper is configured. <code className="rounded bg-white px-1">OPENAI_API_KEY</code>{" "}
          is missing — recommendations still run with basic rules, but AI reasons
          may be limited.
        </p>
      ) : null}
      {serperConfigured === true ? (
        <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-2 text-xs text-emerald-900">
          Serper key detected on server. After <strong>Run price analysis now</strong>,
          check serper.dev → Dashboard — Credits / Total usage should increase.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-ocean-600">Loading…</p>
      ) : (
        <>
          {cards ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Pending", cards.pending],
                ["Approved", cards.approved],
                ["Auto-approved", cards.autoApproved],
                ["Low confidence", cards.lowConfidence],
                ["Rejected", cards.rejected],
                ["Skipped / keep", cards.skipped],
                ["Avg ↑ %", cards.avgIncreasePercent],
                ["Avg ↓ %", cards.avgDecreasePercent],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean-500">
                    {label}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-ocean-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <p className="mt-4 text-xs text-ocean-600">
            Last run: {cards?.lastRunAt ?? "—"} · Next Tuesday 6:00 IST:{" "}
            {cards?.nextRunAt ?? "—"}
          </p>

          {settings ? (
            <section className="mt-3 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Safety &amp; auto-approve
              </h2>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-ocean-800">
                  <input
                    type="checkbox"
                    checked={settings.autoApproveEnabled}
                    onChange={(e) =>
                      void saveSettings({ autoApproveEnabled: e.target.checked })
                    }
                  />
                  Auto Approve Pricing
                </label>
                <label className="flex items-center gap-2 text-sm text-ocean-800">
                  <input
                    type="checkbox"
                    checked={settings.emergencyPause}
                    onChange={(e) =>
                      void saveSettings({ emergencyPause: e.target.checked })
                    }
                  />
                  Emergency pause
                </label>
                <label className="text-sm text-ocean-800">
                  Min sources
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                    value={settings.minimumSources}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        minimumSources: Number(e.target.value),
                      })
                    }
                    onBlur={() =>
                      void saveSettings({
                        minimumSources: settings.minimumSources,
                      })
                    }
                  />
                </label>
                <label className="text-sm text-ocean-800">
                  Min confidence %
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                    value={settings.minimumConfidence}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        minimumConfidence: Number(e.target.value),
                      })
                    }
                    onBlur={() =>
                      void saveSettings({
                        minimumConfidence: settings.minimumConfidence,
                      })
                    }
                  />
                </label>
                <label className="text-sm text-ocean-800">
                  Max weekly increase %
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                    value={settings.maxIncreasePercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxIncreasePercent: Number(e.target.value),
                      })
                    }
                    onBlur={() =>
                      void saveSettings({
                        maxIncreasePercent: settings.maxIncreasePercent,
                      })
                    }
                  />
                </label>
                <label className="text-sm text-ocean-800">
                  Max weekly decrease %
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                    value={settings.maxDecreasePercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxDecreasePercent: Number(e.target.value),
                      })
                    }
                    onBlur={() =>
                      void saveSettings({
                        maxDecreasePercent: settings.maxDecreasePercent,
                      })
                    }
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-ocean-500">
                Needs <code className="rounded bg-sand px-1">OPENAI_API_KEY</code>{" "}
                + <code className="rounded bg-sand px-1">SERPER_API_KEY</code>.
                Schedule via cron-job.org →{" "}
                <code className="rounded bg-sand px-1">
                  /api/cron/pricing-agent-weekly
                </code>{" "}
                Tue 00:30 UTC.
              </p>
            </section>
          ) : null}

          <section className="mt-3 overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ocean-100 px-4 py-3">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Suggestions
              </h2>
              <div className="flex flex-wrap gap-2">
                <select
                  className="rounded-lg border border-ocean-200 px-3 py-1.5 text-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="auto_approved">Auto-approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="low">Low confidence</option>
                  <option value="increase">Price increase</option>
                  <option value="decrease">Price decrease</option>
                  <option value="all">All</option>
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void bulkApprove()}
                  className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900 disabled:opacity-50"
                >
                  Bulk approve safe
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-ocean-100 text-ocean-700">
                  <tr>
                    <th className="p-3">Package</th>
                    <th className="p-3">Current</th>
                    <th className="p-3">Suggested</th>
                    <th className="p-3">Δ</th>
                    <th className="p-3">Market</th>
                    <th className="p-3">Conf.</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-3 text-ocean-500">
                        No suggestions yet. Run analysis or wait for Tuesday cron.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.id} className="border-b border-ocean-50">
                        <td className="p-3">
                          <p className="font-semibold text-ocean-900">{s.name}</p>
                          <p className="text-xs text-ocean-500">
                            {s.kind} · {s.category}
                          </p>
                        </td>
                        <td className="p-3 tabular-nums">{inr(s.currentPrice)}</td>
                        <td className="p-3 font-semibold tabular-nums text-cyan-900">
                          {inr(s.suggestedPrice)}
                        </td>
                        <td className="p-3 tabular-nums">
                          {s.differenceAmount >= 0 ? "+" : ""}
                          {inr(s.differenceAmount)} ({s.differencePercent}%)
                        </td>
                        <td className="p-3 text-xs text-ocean-600">
                          {inr(s.marketMinimum)}–{inr(s.marketMaximum)}
                          <br />
                          med {inr(s.marketMedian)} · {s.sourceCount} src
                        </td>
                        <td className="p-3 tabular-nums">{s.confidenceScore}%</td>
                        <td className="p-3">
                          <span className="rounded-full bg-ocean-50 px-2 py-0.5 text-xs font-semibold uppercase text-ocean-800">
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            className="text-cyan-800 underline"
                            onClick={() => void openDetail(s)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {runs.length ? (
            <section className="mt-3 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Recent runs
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-ocean-800">
                {runs.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="font-mono text-xs text-ocean-500">{r.id.slice(0, 8)}</span>
                    <span className="uppercase">{r.status}</span>
                    <span>{r.runType}</span>
                    <span>
                      {r.suggestionsCreated} suggestions · {r.pricesUpdated} updated
                    </span>
                    <span className="text-ocean-500">{r.startedAt}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-ocean-900">
                  {selected.name}
                </h3>
                <p className="mt-1 text-sm text-ocean-600">{selected.reason}</p>
              </div>
              <button
                type="button"
                className="rounded-full bg-ocean-50 px-3 py-1 text-sm"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ocean-500">Current</dt>
                <dd className="font-semibold">{inr(selected.currentPrice)}</dd>
              </div>
              <div>
                <dt className="text-ocean-500">Suggested</dt>
                <dd className="font-semibold text-cyan-900">
                  {inr(selected.suggestedPrice)}
                </dd>
              </div>
              <div>
                <dt className="text-ocean-500">Confidence</dt>
                <dd>{selected.confidenceScore}% · {selected.sourceCount} sources</dd>
              </div>
              <div>
                <dt className="text-ocean-500">Market range</dt>
                <dd>
                  {inr(selected.marketMinimum)} – {inr(selected.marketMaximum)}
                </dd>
              </div>
            </dl>
            {selected.warnings.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">
                {selected.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}

            <label className="mt-4 block text-sm text-ocean-800">
              Custom approve price
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || selected.status !== "pending"}
                onClick={() => void act("approve")}
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy || selected.status !== "pending"}
                onClick={() => void act("edit_approve")}
                className="rounded-full bg-ocean-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Edit &amp; approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void act("reject")}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void act("keep")}
                className="rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800"
              >
                Keep current
              </button>
              <button
                type="button"
                disabled={busy || !detail?.history?.length}
                onClick={() => void act("rollback")}
                className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50"
              >
                Rollback last
              </button>
            </div>

            {detail?.snapshots?.length ? (
              <div className="mt-3">
                <h4 className="text-sm font-bold text-ocean-900">Competitor sources</h4>
                <ul className="mt-2 space-y-2 text-xs text-ocean-700">
                  {detail.snapshots.map((c, i) => (
                    <li key={i} className="rounded-lg border border-ocean-100 p-2">
                      <p className="font-semibold">
                        {c.providerName} · {inr(c.price)} · sim {c.similarityScore}
                      </p>
                      <p className="line-clamp-2">{c.packageTitle}</p>
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-800 underline"
                      >
                        Source
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-4 text-xs text-ocean-500">
              Live catalog:{" "}
              <Link href="/admin/packages" className="underline">
                Packages
              </Link>{" "}
              ·{" "}
              <Link href="/admin/services" className="underline">
                Services
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
