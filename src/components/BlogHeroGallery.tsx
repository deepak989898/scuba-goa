"use client";

import { useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import {
  AutoVideoThumbnail,
} from "@/components/HomeGalleryMedia";
import type { BlogHeroGalleryData, BlogHeroGallerySlide } from "@/lib/blog-hero-gallery";

type Props = BlogHeroGalleryData & {
  priority?: boolean;
  /**
   * `intrinsic` — full uncropped height (legacy).
   * `bounded` — full-width hero with max height cap (blog + guide pages).
   */
  layout?: "intrinsic" | "bounded";
};

function isVideoSlide(slide?: BlogHeroGallerySlide): boolean {
  return slide?.kind === "reel" || slide?.kind === "video";
}

/**
 * Blog / guide hero — main image + thumbnails for linked services.
 */
export function BlogHeroGallery({
  mainUrl,
  mainFallback,
  mainAlt,
  serviceThumbs,
  priority,
  layout = "intrinsic",
}: Props) {
  const thumbs = serviceThumbs.filter((s) => s.url.trim());
  const [useBlogMain, setUseBlogMain] = useState(true);
  const [thumbIndex, setThumbIndex] = useState(0);
  const [failedToFallback, setFailedToFallback] = useState(false);

  const activeThumb = thumbs[Math.min(thumbIndex, thumbs.length - 1)];

  const displayUrl = useBlogMain
    ? mainUrl || mainFallback
    : activeThumb?.url || mainUrl || mainFallback;
  const displayAlt = useBlogMain ? mainAlt : activeThumb?.alt || mainAlt;
  const showVideoMain = !useBlogMain && isVideoSlide(activeThumb);

  const resolvedMain =
    failedToFallback && mainFallback ? mainFallback : displayUrl;

  if (!resolvedMain && !showVideoMain) return null;

  const showCounter = thumbs.length > 0 && !useBlogMain;

  const mainWrapClass =
    layout === "bounded"
      ? "relative w-full overflow-hidden rounded-lg border border-ocean-100 bg-ocean-950 hero-gallery-bounded"
      : "relative w-full overflow-hidden rounded-lg border border-ocean-100 bg-ocean-900/5 leading-[0]";

  return (
    <figure className="mt-1.5 w-full">
      <div className={mainWrapClass}>
        {showVideoMain && activeThumb ? (
          <video
            key={activeThumb.url}
            src={activeThumb.url}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full bg-black object-contain"
            aria-label={activeThumb.alt}
          />
        ) : layout === "bounded" ? (
          <CmsRemoteImage
            src={resolvedMain}
            alt={displayAlt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px"
            priority={priority}
            onError={() => {
              if (!failedToFallback && mainFallback) {
                setFailedToFallback(true);
              }
            }}
          />
        ) : (
          <CmsRemoteImage
            src={resolvedMain}
            alt={displayAlt}
            showFull
            className="mx-auto block h-auto w-full max-w-none"
            priority={priority}
            onError={() => {
              if (!failedToFallback && mainFallback) {
                setFailedToFallback(true);
              }
            }}
          />
        )}
        {showCounter ? (
          <span
            className="absolute bottom-2 right-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
          >
            {thumbIndex + 1}/{thumbs.length}
          </span>
        ) : null}
      </div>

      {thumbs.length > 0 ? (
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Service photos and videos"
        >
          {thumbs.map((slide, i) => {
            const selected = !useBlogMain && i === thumbIndex;
            const isVideo = isVideoSlide(slide);
            const mediaLabel =
              slide.kind === "reel"
                ? "reel"
                : slide.kind === "video"
                  ? "video"
                  : "photo";

            return (
              <button
                key={`${slide.kind ?? "image"}-${slide.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Show service ${mediaLabel} ${i + 1}: ${slide.alt}`}
                className={`relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:h-16 sm:w-24 ${
                  selected
                    ? "border-cyan-600 ring-2 ring-cyan-200"
                    : "border-ocean-100 opacity-90 hover:border-cyan-300"
                }`}
                onClick={() => {
                  setUseBlogMain(false);
                  setThumbIndex(i);
                  setFailedToFallback(false);
                }}
              >
                {isVideo ? (
                  <>
                    <AutoVideoThumbnail src={slide.url} label={slide.alt} />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-ocean-900 shadow">
                        ▶
                      </span>
                    </span>
                    {slide.kind === "reel" ? (
                      <span className="pointer-events-none absolute left-1 top-1 rounded bg-violet-700/90 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                        Reel
                      </span>
                    ) : (
                      <span className="pointer-events-none absolute left-1 top-1 rounded bg-ocean-800/90 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                        Video
                      </span>
                    )}
                  </>
                ) : (
                  <CmsRemoteImage
                    src={slide.url}
                    alt={slide.alt}
                    fill
                    className="object-cover"
                    sizes="96px"
                    loading="lazy"
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </figure>
  );
}
