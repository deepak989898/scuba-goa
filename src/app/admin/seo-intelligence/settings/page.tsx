"use client";

import { useCallback, useEffect, useState } from "react";
import { seoIntelFetch } from "../admin-fetch";
import type {
  SeoIntelAgentSettings,
  SeoIntelSuggestionAutoType,
} from "@/lib/seo-intelligence/types";

const AUTO_TYPES: { id: SeoIntelSuggestionAutoType; label: string; dangerous?: boolean }[] = [
  { id: "title", label: "Title optimisation" },
  { id: "meta_description", label: "Meta description optimisation" },
  { id: "internal_links", label: "Internal links" },
  { id: "faq_additions", label: "FAQ additions" },
  { id: "image_alt", label: "Image alt text" },
  { id: "schema", label: "Schema additions" },
  { id: "content_expansion", label: "Existing content expansion" },
  { id: "new_blog", label: "New blog creation" },
  { id: "new_service_page", label: "New service page creation", dangerous: true },
  { id: "url_changes", label: "URL changes", dangerous: true },
  { id: "page_consolidation", label: "Page consolidation", dangerous: true },
  { id: "redirect_creation", label: "Redirect creation", dangerous: true },
  { id: "canonical_changes", label: "Canonical changes", dangerous: true },
];

export default function SeoIntelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState<SeoIntelAgentSettings | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await seoIntelFetch("/api/admin/seo-intelligence/settings");
      setSettings(data.settings as SeoIntelAgentSettings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Partial<SeoIntelAgentSettings>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const data = await seoIntelFetch("/api/admin/seo-intelligence/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSettings(data.settings as SeoIntelAgentSettings);
      setMsg("Settings saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !settings) {
    return <p className="text-sm text-ocean-600">Loading settings…</p>;
  }

  const allowed = new Set(settings.allowedAutoApproveTypes);

  function toggleAllowed(id: SeoIntelSuggestionAutoType) {
    const next = new Set(allowed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void save({ allowedAutoApproveTypes: [...next] });
  }

  function toggleDangerous(id: SeoIntelSuggestionAutoType) {
    if (!settings) return;
    const next = {
      ...settings.dangerousActionSettings,
      [id]: !settings.dangerousActionSettings[id],
    };
    void save({ dangerousActionSettings: next });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        {settings.disclaimer} Auto-approve defaults to <strong>OFF</strong>.
        Dangerous actions always need a separate enable + confirmation.
      </div>

      {err ? (
        <p className="text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="text-sm text-emerald-800" role="status">
          {msg}
        </p>
      ) : null}

      <section className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          SEO Suggestions Auto-Approve
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void save({
                suggestionAutoApprove: !settings.suggestionAutoApprove,
              })
            }
            className={`rounded-full px-5 py-2 text-sm font-extrabold text-white ${
              settings.suggestionAutoApprove
                ? "bg-orange-500"
                : "bg-slate-500"
            }`}
            aria-pressed={settings.suggestionAutoApprove}
          >
            {settings.suggestionAutoApprove ? "ON" : "OFF"}
          </button>
          <span className="text-sm text-ocean-700">
            When OFF, every suggestion stays in the approval queue. Nothing
            modifies production content automatically.
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="text-sm text-ocean-800">
            Min confidence
            <input
              type="number"
              min={0}
              max={100}
              value={settings.minConfidence}
              disabled={busy}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  minConfidence: Number(e.target.value),
                })
              }
              onBlur={() =>
                void save({ minConfidence: settings.minConfidence })
              }
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-1.5"
            />
          </label>
          <label className="text-sm text-ocean-800">
            Daily change limit
            <input
              type="number"
              min={0}
              value={settings.dailyChangeLimit}
              disabled={busy}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dailyChangeLimit: Number(e.target.value),
                })
              }
              onBlur={() =>
                void save({ dailyChangeLimit: settings.dailyChangeLimit })
              }
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-1.5"
            />
          </label>
          <label className="text-sm text-ocean-800">
            Weekly new page limit
            <input
              type="number"
              min={0}
              value={settings.weeklyPageLimit}
              disabled={busy}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  weeklyPageLimit: Number(e.target.value),
                })
              }
              onBlur={() =>
                void save({ weeklyPageLimit: settings.weeklyPageLimit })
              }
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-1.5"
            />
          </label>
          <label className="text-sm text-ocean-800">
            Max risk for auto-approve
            <select
              value={settings.maxRisk}
              disabled={busy}
              onChange={(e) =>
                void save({
                  maxRisk: e.target.value as SeoIntelAgentSettings["maxRisk"],
                })
              }
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-1.5"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <h3 className="mt-4 text-sm font-bold text-ocean-900">
          Allowed auto-approve types
        </h3>
        <ul className="mt-2 space-y-1.5">
          {AUTO_TYPES.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ocean-50 px-2 py-1.5 text-sm"
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowed.has(t.id)}
                  disabled={busy}
                  onChange={() => toggleAllowed(t.id)}
                />
                <span>
                  {t.label}
                  {t.dangerous ? (
                    <span className="ml-1 text-[10px] font-bold text-red-700">
                      DANGEROUS
                    </span>
                  ) : null}
                </span>
              </label>
              {t.dangerous ? (
                <label className="flex items-center gap-1 text-xs text-red-800">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.dangerousActionSettings[t.id])}
                    disabled={busy}
                    onChange={() => toggleDangerous(t.id)}
                  />
                  Explicitly allow dangerous
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          Competitor discovery
        </h2>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.competitorAutoDiscovery}
              disabled={busy}
              onChange={() =>
                void save({
                  competitorAutoDiscovery: !settings.competitorAutoDiscovery,
                })
              }
            />
            Automatically discover competitors
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.competitorAutoApprove}
              disabled={busy}
              onChange={() =>
                void save({
                  competitorAutoApprove: !settings.competitorAutoApprove,
                })
              }
            />
            Auto-approve highly relevant competitors
          </label>
          <label className="text-ocean-800">
            Min confidence
            <input
              type="number"
              className="ml-2 w-20 rounded border border-ocean-200 px-2 py-1"
              value={settings.competitorAutoApproveMinConfidence}
              disabled={busy}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  competitorAutoApproveMinConfidence: Number(e.target.value),
                })
              }
              onBlur={() =>
                void save({
                  competitorAutoApproveMinConfidence:
                    settings.competitorAutoApproveMinConfidence,
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
        <h2 className="font-display text-lg font-bold text-ocean-900">
          Automation
        </h2>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.automationPaused}
            disabled={busy}
            onChange={() =>
              void save({ automationPaused: !settings.automationPaused })
            }
          />
          Pause automation
        </label>
      </section>
    </div>
  );
}
