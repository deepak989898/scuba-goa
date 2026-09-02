"use client";

import { useState } from "react";
import type { SeoBlogCenterSettings } from "@/lib/seo-blog-center/types";

type ServiceOption = { slug: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  services: ServiceOption[];
  busy: boolean;
  onSubmit: (config: {
    frequency: "daily" | "weekly" | "monthly";
    postsPerDay: number;
    keywordsPerService: number;
    serviceMode: "all" | "selected";
    serviceSlugs: string[];
    imageMode: "stock" | "openai";
  }) => void;
};

export function AutomationStartWizard({
  open,
  onClose,
  services,
  busy,
  onSubmit,
}: Props) {
  const [frequency, setFrequency] =
    useState<"daily" | "weekly" | "monthly">("daily");
  const [postsPerDay, setPostsPerDay] = useState(5);
  const [keywordsPerService, setKeywordsPerService] = useState(50);
  const [serviceMode, setServiceMode] = useState<"all" | "selected">("all");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [imageMode, setImageMode] = useState<"stock" | "openai">("stock");

  if (!open) return null;

  const toggleService = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="automation-wizard-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-ocean-200 bg-white p-5 shadow-xl">
        <h2
          id="automation-wizard-title"
          className="font-display text-lg font-bold text-ocean-900"
        >
          Start SEO automation
        </h2>
        <p className="mt-1 text-sm text-ocean-700">
          The system will research keywords, create clusters, generate blogs, attach
          images, and publish automatically on your schedule (IST). Conflict clusters
          stay for manual review.
        </p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm text-ocean-800">
            Run frequency
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as "daily" | "weekly" | "monthly")
              }
            >
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </label>

          <label className="block text-sm text-ocean-800">
            Posts to publish per day
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={postsPerDay}
              onChange={(e) => setPostsPerDay(Number(e.target.value))}
            >
              {[3, 5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} posts / day</option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-ocean-800">
            Keywords researched per service (each run)
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={keywordsPerService}
              onChange={(e) => setKeywordsPerService(Number(e.target.value))}
            >
              {[25, 50, 100, 150, 200, 250].map((n) => (
                <option key={n} value={n}>{n} keywords</option>
              ))}
            </select>
          </label>

          <fieldset className="text-sm text-ocean-800">
            <legend className="font-semibold">Services to research</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={serviceMode === "all"}
                  onChange={() => setServiceMode("all")}
                />
                All services
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={serviceMode === "selected"}
                  onChange={() => setServiceMode("selected")}
                />
                Selected only
              </label>
            </div>
            {serviceMode === "selected" ? (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-ocean-100 p-2">
                {services.map((s) => (
                  <label
                    key={s.slug}
                    className="flex items-center gap-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSlugs.has(s.slug)}
                      onChange={() => toggleService(s.slug)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>

          <fieldset className="text-sm text-ocean-800">
            <legend className="font-semibold">Featured images</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2 rounded-lg border border-ocean-100 p-3">
                <input
                  type="radio"
                  className="mt-1"
                  checked={imageMode === "stock"}
                  onChange={() => setImageMode("stock")}
                />
                <span>
                  <span className="font-medium">Free stock images</span>
                  <span className="block text-xs text-ocean-600">
                    Pexels → Pixabay → Unsplash (no OpenAI cost)
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <input
                  type="radio"
                  className="mt-1"
                  checked={imageMode === "openai"}
                  onChange={() => setImageMode("openai")}
                />
                <span>
                  <span className="font-medium">OpenAI generated images</span>
                  <span className="block text-xs text-ocean-600">
                    Title-matched AI heroes (higher cost, best relevance)
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSubmit({
                frequency,
                postsPerDay,
                keywordsPerService,
                serviceMode,
                serviceSlugs:
                  serviceMode === "selected" ? [...selectedSlugs] : [],
                imageMode,
              })
            }
            className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "Starting…" : "Submit & start automation"}
          </button>
          <button
            type="button"
            className="rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function AutomationStatusCard({
  settings,
  busy,
  onStart,
  onStop,
  onRunNow,
}: {
  settings: SeoBlogCenterSettings;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onRunNow: () => void;
}) {
  const active = settings.automationScheduleEnabled === true;
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm sm:col-span-2 lg:col-span-4 ${
        active
          ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-cyan-50/60"
          : "border-ocean-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ocean-700">
            SEO automation
          </p>
          <p className="mt-1 text-sm text-ocean-800">
            {active
              ? `Running — ${settings.automationFrequency ?? "daily"}, ${settings.automationPostsPerDay ?? 5} posts/day, images: ${settings.automationImageMode ?? "stock"}`
              : "Off — start automation to research keywords and publish blogs automatically."}
          </p>
          {active && settings.automationLastRunAt ? (
            <p className="mt-1 text-xs text-ocean-600">
              Last run: {new Date(settings.automationLastRunAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              {settings.automationServiceMode === "selected"
                ? ` · ${(settings.automationServiceSlugs ?? []).length} services`
                : " · all services"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {active ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onRunNow}
                className="rounded-full border border-cyan-600 bg-white px-4 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
              >
                Run now
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onStop}
                className="rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-50 disabled:opacity-50"
              >
                Stop automation
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onStart}
              className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Start automation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
