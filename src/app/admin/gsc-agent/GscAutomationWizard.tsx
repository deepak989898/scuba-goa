"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  onSubmit: (config: {
    frequency: "daily" | "weekly" | "monthly";
    positionThreshold: number;
    inspectPerRun: number;
    rankingImproveMax: number;
  }) => void;
};

export function GscAutomationStartWizard({
  open,
  onClose,
  busy,
  onSubmit,
}: Props) {
  const [frequency, setFrequency] =
    useState<"daily" | "weekly" | "monthly">("daily");
  const [positionThreshold, setPositionThreshold] = useState(10);
  const [inspectPerRun, setInspectPerRun] = useState(50);
  const [rankingImproveMax, setRankingImproveMax] = useState(5);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gsc-automation-wizard-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-ocean-200 bg-white p-5 shadow-xl">
        <h2
          id="gsc-automation-wizard-title"
          className="font-display text-lg font-bold text-ocean-900"
        >
          Start GSC SEO automation
        </h2>
        <p className="mt-1 text-sm text-ocean-700">
          Every run (on your schedule, IST): sync Search Console analytics, inspect
          the pending URL queue, then AI-improve blogs ranking worse than your
          position target. Hero images use <strong>free stock only</strong> — blogs
          that need a better match are flagged for manual OpenAI image generation.
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
            Improve blogs ranking worse than position
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={positionThreshold}
              onChange={(e) => setPositionThreshold(Number(e.target.value))}
            >
              <option value={8}>Position &gt; 8 (not in top 8)</option>
              <option value={10}>Position &gt; 10 (not on page 1)</option>
              <option value={15}>Position &gt; 15 (deep page 2)</option>
            </select>
            <span className="mt-1 block text-xs text-ocean-600">
              Example: position 12 is worse than 10 — those blogs get title, content,
              and internal-link updates to move toward page 1.
            </span>
          </label>

          <label className="block text-sm text-ocean-800">
            URLs to inspect per run
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={inspectPerRun}
              onChange={(e) => setInspectPerRun(Number(e.target.value))}
            >
              {[4, 6, 8, 12, 15].map((n) => (
                <option key={n} value={n}>{n} URLs (GSC quota ~50/day)</option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-ocean-800">
            Ranking content improves per run
            <select
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              value={rankingImproveMax}
              onChange={(e) => setRankingImproveMax(Number(e.target.value))}
            >
              {[3, 5, 8, 12].map((n) => (
                <option key={n} value={n}>{n} blogs / guides</option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-cyan-200 bg-cyan-50/60 p-3 text-xs text-ocean-800">
            <p className="font-semibold">Images in automation</p>
            <p className="mt-1">
              Free stock only (Pexels → Pixabay → Unsplash → Wikimedia). If stock
              fails or looks wrong for the title, the blog appears in{" "}
              <strong>Needs OpenAI image</strong> on Overview so you can generate
              manually from Edit.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSubmit({
                frequency,
                positionThreshold,
                inspectPerRun,
                rankingImproveMax,
              })
            }
            className="rounded-full bg-ocean-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start automation & run now"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-ocean-200 px-4 py-2 text-sm font-bold text-ocean-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
