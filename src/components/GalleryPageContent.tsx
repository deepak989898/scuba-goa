"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { videoSrcForThumbnailFrame } from "@/components/HomeGalleryMedia";
import { useHomeGallery } from "@/hooks/useHomeGallery";
import {
  galleryCategoryLabel,
} from "@/lib/gallery-categories";
import type { HomeGalleryItem } from "@/lib/home-gallery-default";
import Link from "next/link";

type MediaFilter = "all" | "image" | "video";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition sm:text-sm ${
        active
          ? "bg-ocean-800 text-white shadow-sm"
          : "border border-ocean-200 bg-white text-ocean-800 hover:border-ocean-400 hover:bg-ocean-50"
      }`}
    >
      {children}
    </button>
  );
}

function GalleryLightbox({
  items,
  index,
  onClose,
  onGo,
}: {
  items: HomeGalleryItem[];
  index: number;
  onClose: () => void;
  onGo: (next: number) => void;
}) {
  const item = items[index];
  const count = items.length;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && count > 1) onGo((index + 1) % count);
      if (e.key === "ArrowLeft" && count > 1) onGo((index - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [count, index, onClose, onGo]);

  if (!item) return null;
  const isVideo = item.type === "video";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Gallery zoom preview"
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-10 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-ocean-900 shadow sm:right-5 sm:top-5"
        onClick={onClose}
      >
        Close
      </button>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-ocean-900 shadow sm:left-4"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              onGo((index - 1 + count) % count);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-ocean-900 shadow sm:right-4"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              onGo((index + 1) % count);
            }}
          >
            ›
          </button>
        </>
      ) : null}

      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex max-h-[min(82vh,900px)] w-full items-center justify-center overflow-hidden rounded-xl bg-black/40">
          {isVideo ? (
            <video
              className="max-h-[min(82vh,900px)] max-w-full object-contain"
              src={item.mediaUrl}
              poster={item.posterUrl?.trim() || undefined}
              controls
              controlsList="nodownload"
              playsInline
              autoPlay
            >
              {item.alt}
            </video>
          ) : (
            <div className="relative h-[min(82vh,900px)] w-full">
              <CmsRemoteImage
                src={item.mediaUrl}
                alt={item.alt}
                fill
                sizes="95vw"
                className="object-contain"
                priority
              />
            </div>
          )}
        </div>
        <p className="mt-3 max-w-2xl px-2 text-center text-sm text-white/90">
          {item.alt}
          {count > 1 ? (
            <span className="ml-2 text-white/60">
              ({index + 1}/{count})
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function GalleryGridCard({
  item,
  index,
  onOpen,
}: {
  item: HomeGalleryItem;
  index: number;
  onOpen: () => void;
}) {
  const isVideo = item.type === "video";
  const poster = isVideo ? item.posterUrl?.trim() : "";
  const mainVideoSrc = isVideo
    ? poster
      ? item.mediaUrl.trim()
      : videoSrcForThumbnailFrame(item.mediaUrl)
    : "";

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm"
      aria-label={isVideo ? `Reel: ${item.alt}` : item.alt}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-[4/3] w-full cursor-zoom-in bg-ocean-50 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500"
        aria-label={`Zoom ${item.alt}`}
      >
        {isVideo ? (
          <div
            className="absolute inset-0"
            onContextMenu={(e) => e.preventDefault()}
          >
            <video
              className="h-full w-full object-contain"
              src={mainVideoSrc}
              poster={poster || undefined}
              muted
              playsInline
              preload="metadata"
              onContextMenu={(e) => e.preventDefault()}
            >
              {item.alt}
            </video>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white">
                Play / zoom
              </span>
            </span>
          </div>
        ) : (
          <CmsRemoteImage
            src={item.mediaUrl}
            alt={item.alt}
            fill
            className="object-contain transition duration-300 group-hover:scale-[1.02]"
            sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
            loading={index < 8 ? "eager" : "lazy"}
          />
        )}
        {isVideo ? (
          <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Reel
          </span>
        ) : null}
        {item.category ? (
          <span className="pointer-events-none absolute left-1.5 top-1.5 max-w-[80%] truncate rounded bg-ocean-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {galleryCategoryLabel(item.category)}
          </span>
        ) : null}
        {!isVideo ? (
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
            Click to zoom
          </span>
        ) : null}
      </button>
      <p className="line-clamp-2 px-2.5 py-2 text-xs font-medium text-ocean-800 sm:text-sm">
        {item.alt}
      </p>
    </article>
  );
}

export function GalleryPageContent() {
  const { items, loading } = useHomeGallery();
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (mediaFilter !== "all" && item.type !== mediaFilter) return false;
      return true;
    });
  }, [items, mediaFilter]);

  const counts = useMemo(() => {
    const images = items.filter((i) => i.type === "image").length;
    const videos = items.filter((i) => i.type === "video").length;
    return { images, videos, total: items.length };
  }, [items]);

  const closeZoom = useCallback(() => setZoomIndex(null), []);
  const goZoom = useCallback((next: number) => setZoomIndex(next), []);

  return (
    <div className="bg-gradient-to-b from-ocean-50 via-white to-sand/30">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ocean-700">
            Gallery
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ocean-900 sm:text-3xl">
            Photos & reels
          </h1>
        </header>

        {!loading && items.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ocean-600">
              Media type
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={mediaFilter === "all"}
                onClick={() => setMediaFilter("all")}
              >
                All ({counts.total})
              </FilterChip>
              <FilterChip
                active={mediaFilter === "image"}
                onClick={() => setMediaFilter("image")}
              >
                Photos ({counts.images})
              </FilterChip>
              <FilterChip
                active={mediaFilter === "video"}
                onClick={() => setMediaFilter("video")}
              >
                Videos & reels ({counts.videos})
              </FilterChip>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm font-medium text-ocean-700">Loading gallery…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-sm font-medium text-ocean-700">
            {items.length === 0
              ? "No gallery items yet."
              : "No items match this media type. Try Photos or Videos & reels."}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item, i) => (
              <GalleryGridCard
                key={`${item.mediaUrl}-${i}`}
                item={item}
                index={i}
                onOpen={() => setZoomIndex(i)}
              />
            ))}
          </div>
        )}

        <p className="mx-auto mt-8 max-w-xl text-center text-sm text-ocean-700">
          Want this on your dive?{" "}
          <Link
            href="/booking"
            className="font-semibold text-ocean-800 underline-offset-2 hover:underline"
          >
            Book online
          </Link>{" "}
          or{" "}
          <Link
            href="/services"
            className="font-semibold text-ocean-800 underline-offset-2 hover:underline"
          >
            browse services
          </Link>
          .
        </p>
      </div>

      {zoomIndex != null && filtered[zoomIndex] ? (
        <GalleryLightbox
          items={filtered}
          index={zoomIndex}
          onClose={closeZoom}
          onGo={goZoom}
        />
      ) : null}
    </div>
  );
}
