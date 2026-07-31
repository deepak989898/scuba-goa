"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { videoSrcForThumbnailFrame } from "@/components/HomeGalleryMedia";
import type { ServiceItem } from "@/data/services";

type TabType = "posts" | "reels" | "videos";

function normalizeList(raw: string[] | undefined): string[] {
  if (!raw?.length) return [];
  return raw.map((x) => x.trim()).filter(Boolean);
}

/** Compact reel/video thumbnail — portrait or landscape from metadata. */
function MediaVideoThumb({
  url,
  label,
  preferPortrait,
  onPlay,
}: {
  url: string;
  label: string;
  preferPortrait: boolean;
  onPlay: () => void;
}) {
  const [portrait, setPortrait] = useState(preferPortrait);

  return (
    <button
      type="button"
      onClick={onPlay}
      className={`relative shrink-0 overflow-hidden rounded-lg border border-ocean-100 bg-ocean-950 text-left shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
        portrait
          ? "aspect-[9/16] w-[min(100%,9.5rem)] sm:w-[11rem]"
          : "aspect-video w-[min(100%,16rem)] sm:w-[18rem]"
      }`}
      aria-label={`Play ${label}`}
    >
      <video
        src={videoSrcForThumbnailFrame(url)}
        muted
        playsInline
        preload="metadata"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            setPortrait(v.videoHeight >= v.videoWidth);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-hidden
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-ocean-900 shadow-lg">
          ▶
        </span>
      </span>
    </button>
  );
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
  const [playVideo, setPlayVideo] = useState<{
    url: string;
    label: string;
    list: string[];
    index: number;
  } | null>(null);
  const touchStartX = useRef<number | null>(null);
  const playVideoRef = useRef<HTMLVideoElement>(null);

  const zoomUrl =
    zoomIndex != null && zoomIndex >= 0 && zoomIndex < posts.length
      ? posts[zoomIndex]
      : null;
  const zoomCount = posts.length;

  useEffect(() => {
    if (zoomIndex == null && !playVideo) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setZoomIndex(null);
        setPlayVideo(null);
        return;
      }
      if (zoomIndex != null && zoomCount > 1) {
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
      if (playVideo && playVideo.list.length > 1) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPlayVideo((cur) => {
            if (!cur) return cur;
            const next =
              (cur.index - 1 + cur.list.length) % cur.list.length;
            return {
              ...cur,
              index: next,
              url: cur.list[next]!,
              label: `${service.title} ${tab} ${next + 1}`,
            };
          });
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setPlayVideo((cur) => {
            if (!cur) return cur;
            const next = (cur.index + 1) % cur.list.length;
            return {
              ...cur,
              index: next,
              url: cur.list[next]!,
              label: `${service.title} ${tab} ${next + 1}`,
            };
          });
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoomIndex, zoomCount, playVideo, service.title, tab]);

  useEffect(() => {
    const el = playVideoRef.current;
    if (!el || !playVideo) return;
    el.load();
    void el.play().catch(() => {
      /* autoplay may be blocked; controls remain */
    });
  }, [playVideo?.url]);

  if (availableTabs.length === 0) return null;

  function goZoom(delta: number) {
    if (zoomCount <= 1) return;
    setZoomIndex((i) =>
      i == null ? i : (i + delta + zoomCount) % zoomCount
    );
  }

  function openVideo(list: string[], index: number, kind: "reel" | "video") {
    const url = list[index];
    if (!url) return;
    setPlayVideo({
      url,
      label: `${service.title} ${kind} ${index + 1}`,
      list,
      index,
    });
  }

  const videoList = tab === "reels" ? reels : videos;

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
              setPlayVideo(null);
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
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {posts.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setZoomIndex(index)}
              className="block w-[min(100%,9.5rem)] shrink-0 overflow-hidden rounded-lg border border-ocean-100 bg-ocean-950 text-left shadow-sm transition hover:opacity-95 sm:w-[11rem]"
            >
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
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {videoList.map((url, index) => (
            <MediaVideoThumb
              key={`${url}-${index}`}
              url={url}
              label={`${service.title} ${tab} ${index + 1}`}
              preferPortrait={tab === "reels"}
              onPlay={() =>
                openVideo(videoList, index, tab === "reels" ? "reel" : "video")
              }
            />
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

      {playVideo ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 sm:p-6"
          onClick={() => setPlayVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-label={playVideo.label}
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-10 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-ocean-900 shadow sm:right-5 sm:top-5"
            onClick={() => setPlayVideo(null)}
          >
            Close
          </button>

          {playVideo.list.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-ocean-900 shadow-lg sm:left-4"
                aria-label="Previous video"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayVideo((cur) => {
                    if (!cur) return cur;
                    const next =
                      (cur.index - 1 + cur.list.length) % cur.list.length;
                    return {
                      ...cur,
                      index: next,
                      url: cur.list[next]!,
                      label: `${service.title} ${tab} ${next + 1}`,
                    };
                  });
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-white/95 text-2xl font-bold text-ocean-900 shadow-lg sm:right-4"
                aria-label="Next video"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayVideo((cur) => {
                    if (!cur) return cur;
                    const next = (cur.index + 1) % cur.list.length;
                    return {
                      ...cur,
                      index: next,
                      url: cur.list[next]!,
                      label: `${service.title} ${tab} ${next + 1}`,
                    };
                  });
                }}
              >
                ›
              </button>
            </>
          ) : null}

          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex max-h-[min(82vh,900px)] max-w-full overflow-hidden rounded-xl bg-black shadow-2xl">
              <video
                key={playVideo.url}
                ref={playVideoRef}
                src={playVideo.url}
                controls
                controlsList="nodownload"
                disablePictureInPicture
                playsInline
                autoPlay
                className="max-h-[min(82vh,900px)] max-w-[min(100vw-1.5rem,56rem)] bg-black object-contain"
                onContextMenu={(e) => e.preventDefault()}
              >
                {playVideo.label}
              </video>
            </div>
            {playVideo.list.length > 1 ? (
              <p className="mt-3 text-sm font-semibold text-white/90">
                {playVideo.index + 1} / {playVideo.list.length}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
