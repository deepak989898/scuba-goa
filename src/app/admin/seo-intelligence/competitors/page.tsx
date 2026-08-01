"use client";

import { useCallback, useEffect, useState } from "react";
import { seoIntelFetch } from "../admin-fetch";
import type { SeoIntelCompetitor } from "@/lib/seo-intelligence/types";

const TYPE_LABEL: Record<string, string> = {
  direct_local: "Direct local",
  marketplace: "Marketplace / large portal",
  informational: "Informational",
  other: "Other",
};

const STATUS_CLASS: Record<string, string> = {
  pending_review: "border-sky-300 bg-sky-50 text-sky-900",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-900",
  rejected: "border-slate-300 bg-slate-50 text-slate-700",
  blocked: "border-red-300 bg-red-50 text-red-900",
  paused: "border-amber-300 bg-amber-50 text-amber-950",
};

export default function SeoIntelCompetitorsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<SeoIntelCompetitor[]>([]);
  const [domain, setDomain] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<string>("direct_local");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/competitors?includeBlocked=1",
      );
      setRows((data.competitors ?? []) as SeoIntelCompetitor[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await seoIntelFetch("/api/admin/seo-intelligence/competitors", {
        method: "POST",
        body: JSON.stringify({ domain, notes, type, status: "approved" }),
      });
      setDomain("");
      setNotes("");
      setMsg("Competitor added.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function discover() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const data = await seoIntelFetch(
        "/api/admin/seo-intelligence/competitors/discover",
        { method: "POST", body: JSON.stringify({ maxKeywords: 10 }) },
      );
      if (!data.configured) {
        setErr(data.errors?.[0] || "SERP provider not configured");
      } else {
        setMsg(
          `Discovery done: ${data.discovered} new · ${data.skipped} skipped · ${data.keywordsScanned} keywords scanned`,
        );
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setBusy(false);
    }
  }

  async function patch(
    id: string,
    body: Partial<SeoIntelCompetitor>,
  ) {
    setBusy(true);
    setErr(null);
    try {
      await seoIntelFetch(`/api/admin/seo-intelligence/competitors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this competitor?")) return;
    setBusy(true);
    setErr(null);
    try {
      await seoIntelFetch(`/api/admin/seo-intelligence/competitors/${id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm sm:p-4">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          Competitor management
        </h2>
        <p className="mt-0.5 text-sm text-ocean-700">
          Add domains manually or discover from SERP seed keywords (services +
          business categories). New auto discoveries start as Pending review.
        </p>

        <form
          onSubmit={addManual}
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem_1fr_auto]"
        >
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com or https://www.example.com/page"
            className="rounded-lg border border-ocean-200 px-3 py-2 text-sm"
            required
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-ocean-200 px-2 py-2 text-sm"
          >
            <option value="direct_local">Direct local</option>
            <option value="marketplace">Marketplace</option>
            <option value="informational">Informational</option>
            <option value="other">Other</option>
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="rounded-lg border border-ocean-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Add
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void discover()}
            className="rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Discover competitors now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-bold text-ocean-800"
          >
            Refresh
          </button>
        </div>

        {err ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="mt-2 text-sm text-emerald-800" role="status">
            {msg}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-ocean-600">Loading competitors…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ocean-600">
          No competitors yet. Add one manually or run discovery.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ocean-50 text-xs uppercase text-ocean-600">
              <tr>
                <th className="p-2">Domain</th>
                <th className="p-2">Type</th>
                <th className="p-2">Status</th>
                <th className="p-2">Score</th>
                <th className="p-2">Source</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-ocean-50 align-top">
                  <td className="p-2">
                    <div className="font-semibold text-ocean-900">
                      {c.displayName || c.canonicalDomain}
                    </div>
                    <div className="break-all text-xs text-ocean-600">
                      {c.canonicalDomain}
                    </div>
                    {c.notes ? (
                      <div className="mt-0.5 text-xs text-ocean-500">{c.notes}</div>
                    ) : null}
                  </td>
                  <td className="p-2 text-xs">
                    {TYPE_LABEL[c.type] || c.type}
                  </td>
                  <td className="p-2">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_CLASS[c.status] || STATUS_CLASS.paused}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    Rel {c.relevanceScore} · Conf {c.confidence}
                  </td>
                  <td className="p-2 text-xs">{c.source}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {c.status === "pending_review" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void patch(c.id, { status: "approved" })
                            }
                            className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void patch(c.id, { status: "rejected" })
                            }
                            className="rounded bg-slate-500 px-2 py-1 text-[10px] font-bold text-white"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {c.status === "approved" && !c.paused ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void patch(c.id, { status: "paused", paused: true })
                          }
                          className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          Pause
                        </button>
                      ) : null}
                      {c.paused || c.status === "paused" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void patch(c.id, {
                              status: "approved",
                              paused: false,
                            })
                          }
                          className="rounded bg-cyan-600 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          Resume
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void patch(c.id, { status: "blocked", blocked: true })
                        }
                        className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white"
                      >
                        Block
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(c.id)}
                        className="rounded border border-ocean-200 px-2 py-1 text-[10px] font-bold text-ocean-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
