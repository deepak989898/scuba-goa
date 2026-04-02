"use client";

import { useMemo, useState } from "react";
import type { ServiceItem } from "@/data/services";

type TabType = "posts" | "reels" | "videos";

function normalizeList(raw: string[] | undefined): string[] {
  if (!raw?.length) return [];
  return raw.map((x) => x.trim()).filter(Boolean);
}

export function ServiceMediaTabs({ service }: { service: ServiceItem }) {
  const posts = normalizeList(service.serviceMedia?.posts);
  const reels = normalizeList(service.serviceMedia?.reels);
  const videos = normalizeList(service.serviceMedia?.videos);

  const availableTabs = useMemo(() => {
    const tabs: Array<{ key: TabType; label: string; count: number }> = [];
    if (posts.length) tabs.push({ key: "posts", label: "Posts", count: posts.length });
    if (reels.length) tabs.push({ key: "reels", label: "Reels", count: reels.length });
    if (videos.length) tabs.push({ key: "videos", label: "Videos", count: videos.length });
    return tabs;
  }, [posts.length, reels.length, videos.length]);

  const [tab, setTab] = useState<TabType>(
    availableTabs[0]?.key ?? "posts"
  );
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  if (availableTabs.length === 0) return null;

  const currentList = tab === "posts" ? posts : tab === "reels" ? reels : videos;

  return (
    <section className="mt-10 rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-ocean-900">
        Related media
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              tab === t.key
                ? "border-ocean-300 bg-ocean-100 text-ocean-900"
                : "border-ocean-200 bg-white text-ocean-700"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "posts" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {currentList.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setZoomImageUrl(url)}
              className="block overflow-hidden rounded-xl border border-ocean-100 text-left"
            >
              <img
                src={url}
                alt={service.title}
                className="h-48 w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {currentList.map((url) => (
            <div
              key={url}
              className="overflow-hidden rounded-xl border border-ocean-100 bg-black/5 p-2"
              onContextMenu={(e) => e.preventDefault()}
            >
              <video
                src={url}
                controls
                controlsList="nodownload"
                disablePictureInPicture
                playsInline
                preload="metadata"
                className="max-h-[26rem] w-full rounded-lg bg-black"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          ))}
        </div>
      )}

      {zoomImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomImageUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-ocean-900"
            onClick={() => setZoomImageUrl(null)}
          >
            Close
          </button>
          <img
            src={zoomImageUrl}
            alt={`${service.title} preview`}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
