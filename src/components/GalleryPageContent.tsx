"use client";

import { useMemo, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { videoSrcForThumbnailFrame } from "@/components/HomeGalleryMedia";
import { useHomeGallery } from "@/hooks/useHomeGallery";
import {
  GALLERY_CATEGORIES,
  galleryCategoryLabel,
  type GalleryCategoryId,
} from "@/lib/gallery-categories";
import type { HomeGalleryItem } from "@/lib/home-gallery-default";
import Link from "next/link";

type MediaFilter = "all" | "image" | "video";

function GalleryGridCard({ item, index }: { item: HomeGalleryItem; index: number }) {
  const isVideo = item.type === "video";
  const poster = isVideo ? item.posterUrl?.trim() : "";
  const mainVideoSrc = isVideo
    ? poster
      ? item.mediaUrl.trim()
      : videoSrcForThumbnailFrame(item.mediaUrl)
    : "";

  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm"
      aria-label={isVideo ? `Reel: ${item.alt}` : item.alt}
    >
      <div className="relative aspect-[3/4] w-full bg-ocean-100">
        {isVideo ? (
          <div
            className="absolute inset-0"
            onContextMenu={(e) => e.preventDefault()}
          >
            <video
              className="h-full w-full object-cover"
              src={mainVideoSrc}
              poster={poster || undefined}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              playsInline
              preload="metadata"
              onContextMenu={(e) => e.preventDefault()}
            >
              {item.alt}
            </video>
          </div>
        ) : (
          <CmsRemoteImage
            src={item.mediaUrl}
            alt={item.alt}
            fill
            className="object-cover"
            sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
            loading={index < 6 ? "eager" : "lazy"}
          />
        )}
        {isVideo ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Reel
          </span>
        ) : null}
        {item.category ? (
          <span className="pointer-events-none absolute left-2 top-2 max-w-[85%] truncate rounded bg-ocean-900/75 px-2 py-0.5 text-[10px] font-semibold text-white">
            {galleryCategoryLabel(item.category)}
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 px-3 py-2.5 text-xs font-medium text-ocean-800 sm:text-sm">
        {item.alt}
      </p>
    </article>
  );
}

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
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
        active
          ? "bg-ocean-800 text-white shadow-sm"
          : "border border-ocean-200 bg-white text-ocean-800 hover:border-ocean-400 hover:bg-ocean-50"
      }`}
    >
      {children}
    </button>
  );
}

export function GalleryPageContent() {
  const { items, loading } = useHomeGallery();
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<GalleryCategoryId | "all">(
    "all",
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (mediaFilter !== "all" && item.type !== mediaFilter) return false;
      if (categoryFilter !== "all") {
        if (!item.category || item.category !== categoryFilter) return false;
      }
      return true;
    });
  }, [items, mediaFilter, categoryFilter]);

  const counts = useMemo(() => {
    const byCategory: Partial<Record<GalleryCategoryId, number>> = {};
    const images = items.filter((i) => i.type === "image").length;
    const videos = items.filter((i) => i.type === "video").length;
    for (const item of items) {
      if (item.category) {
        byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
      }
    }
    return { images, videos, byCategory, total: items.length };
  }, [items]);

  return (
    <div className="bg-gradient-to-b from-ocean-50 via-white to-sand/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ocean-700 sm:text-sm">
            Gallery
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ocean-900 sm:text-4xl">
            Photos & reels from the water
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ocean-800 sm:text-lg">
            Underwater highlights, customer videos, package photos, pricing shots,
            and blog images from real trips—filter by type or category below.
          </p>
        </header>

        {!loading && items.length > 0 ? (
          <div className="mt-8 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-600">
                Media type
              </p>
              <div className="flex flex-wrap gap-2">
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
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-600">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={categoryFilter === "all"}
                  onClick={() => setCategoryFilter("all")}
                >
                  All categories
                </FilterChip>
                {GALLERY_CATEGORIES.map((cat) => {
                  const n = counts.byCategory[cat.id] ?? 0;
                  if (n === 0 && categoryFilter !== cat.id) return null;
                  return (
                    <FilterChip
                      key={cat.id}
                      active={categoryFilter === cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                    >
                      {cat.label}
                      {n > 0 ? ` (${n})` : ""}
                    </FilterChip>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-12 text-sm font-medium text-ocean-700">Loading gallery…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-12 text-sm font-medium text-ocean-700">
            {items.length === 0
              ? "No gallery items yet."
              : "No items match these filters. Try another category or media type."}
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item, i) => (
              <GalleryGridCard key={`${item.mediaUrl}-${i}`} item={item} index={i} />
            ))}
          </div>
        )}

        <p className="mx-auto mt-14 max-w-xl text-center text-sm text-ocean-700">
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
    </div>
  );
}
