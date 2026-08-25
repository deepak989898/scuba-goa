"use client";

import { useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { BlogHeroGalleryData } from "@/lib/blog-hero-gallery";

type Props = BlogHeroGalleryData & {
  priority?: boolean;
};

/**
 * Blog hero — full uncropped main image + thumbnails for the linked service only.
 */
export function BlogHeroGallery({
  mainUrl,
  mainFallback,
  mainAlt,
  serviceThumbs,
  priority,
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

  const resolvedMain =
    failedToFallback && mainFallback ? mainFallback : displayUrl;

  if (!resolvedMain) return null;

  const showCounter = thumbs.length > 0 && !useBlogMain;

  return (
    <figure className="mt-1.5 w-full">
      <div className="relative w-full overflow-hidden rounded-lg border border-ocean-100">
        <CmsRemoteImage
          src={resolvedMain}
          alt={displayAlt}
          showFull
          className="block h-auto w-full max-h-[min(36vh,280px)] object-contain object-top sm:max-h-[min(38vh,340px)] lg:max-h-[min(40vh,400px)]"
          priority={priority}
          onError={() => {
            if (!failedToFallback && mainFallback) {
              setFailedToFallback(true);
            }
          }}
        />
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
          aria-label="Service photos"
        >
          {thumbs.map((slide, i) => {
            const selected = !useBlogMain && i === thumbIndex;
            return (
              <button
                key={`${slide.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Show service photo ${i + 1}: ${slide.alt}`}
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
                <CmsRemoteImage
                  src={slide.url}
                  alt={slide.alt}
                  fill
                  className="object-cover"
                  sizes="96px"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </figure>
  );
}
