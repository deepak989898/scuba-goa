"use client";

import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { videoSrcForThumbnailFrame } from "@/components/HomeGalleryMedia";
import { useHomeGallery } from "@/hooks/useHomeGallery";
import type { HomeGalleryItem } from "@/lib/home-gallery-default";
import Link from "next/link";

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
      </div>
      <p className="line-clamp-2 px-3 py-2.5 text-xs font-medium text-ocean-800 sm:text-sm">
        {item.alt}
      </p>
    </article>
  );
}

export function GalleryPageContent() {
  const { items, loading } = useHomeGallery();

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
            Every frame here is curated in the admin panel—underwater highlights, boats,
            and short reels from real trips.
          </p>
        </header>

        {loading ? (
          <p className="mt-12 text-sm font-medium text-ocean-700">Loading gallery…</p>
        ) : items.length === 0 ? (
          <p className="mt-12 text-sm font-medium text-ocean-700">No gallery items yet.</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, i) => (
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
