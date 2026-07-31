"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
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
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const currentList = tab === "posts" ? posts : tab === "reels" ? reels : videos;
  const zoomUrl =
    zoomIndex != null && zoomIndex >= 0 && zoomIndex < posts.length
      ? posts[zoomIndex]
      : null;
  const zoomCount = posts.length;

  useEffect(() => {
    if (zoomIndex == null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setZoomIndex(null);
        return;
      }
      if (zoomCount <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setZoomIndex((i) =>
          i == null ? i : (i - 1 + zoomCount) % zoomCount
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setZoomIndex((i) => (i == null ? i : (i + 1) % zoomCount));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoomIndex, zoomCount]);

  if (availableTabs.length === 0) return null;

  function goZoom(delta: number) {
    if (zoomCount <= 1) return;
    setZoomIndex((i) =>
      i == null ? i : (i + delta + zoomCount) % zoomCount
    );
  }

  return (
    <section className="mt-5 rounded-xl border border-ocean-100 bg-white p-3 shadow-sm sm:p-3.5">
      <h2 className="font-display text-base font-semibold text-ocean-900 sm:text-lg">
        Related media
      </h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setZoomIndex(null);
            }}
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
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {posts.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setZoomIndex(index)}
              className="block w-full overflow-hidden rounded-lg border border-ocean-100 bg-ocean-950 text-left transition hover:opacity-95"
            >
              {/* showFull = intrinsic ratio: full graphic, no crop, no letterbox gaps */}
              <CmsRemoteImage
                src={url}
                alt={`${service.title} post ${index + 1}`}
                showFull
                className="block"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 grid gap-2">
          {currentList.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="overflow-hidden rounded-lg border border-ocean-100 bg-black/5 p-1.5"
              onContextMenu={(e) => e.preventDefault()}
            >
              <video
                src={url}
                controls
                controlsList="nodownload"
                disablePictureInPicture
                playsInline
                preload="metadata"
                className="max-h-[20rem] w-full rounded-md bg-black"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          ))}
        </div>
      )}

      {zoomUrl && zoomIndex != null ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 sm:p-6"
          onClick={() => setZoomIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Related media image preview"
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-10 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-ocean-900 shadow sm:right-5 sm:top-5"
            onClick={() => setZoomIndex(null)}
          >
            Close
          </button>

          {zoomCount > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-ocean-900 shadow-lg sm:left-4"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  goZoom(-1);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-ocean-900 shadow-lg sm:right-4"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  goZoom(1);
                }}
              >
                ›
              </button>
            </>
          ) : null}

          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchStartX.current = e.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchStartX.current;
              touchStartX.current = null;
              if (start == null || zoomCount <= 1) return;
              const end = e.changedTouches[0]?.clientX;
              if (end == null) return;
              const dx = end - start;
              if (Math.abs(dx) < 50) return;
              goZoom(dx > 0 ? -1 : 1);
            }}
          >
            <div className="relative h-[min(82vh,900px)] w-full overflow-hidden rounded-xl bg-black/40">
              <CmsRemoteImage
                key={zoomUrl}
                src={zoomUrl}
                alt={`${service.title} post ${zoomIndex + 1}`}
                fill
                sizes="95vw"
                className="object-contain"
                loading="eager"
              />
            </div>
            {zoomCount > 1 ? (
              <p className="mt-3 text-sm font-semibold text-white/90">
                {zoomIndex + 1} / {zoomCount}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
