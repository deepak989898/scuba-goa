"use client";

import { useCallback, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { BlogHeroGallerySlide } from "@/lib/blog-hero-gallery";

type Props = {
  slides: BlogHeroGallerySlide[];
  priority?: boolean;
};

/**
 * Blog hero — main image with related service thumbnails below (reference-style gallery).
 */
export function BlogHeroGallery({ slides, priority }: Props) {
  const list = slides.filter((s) => s.url.trim());
  const [index, setIndex] = useState(0);

  const handleMainError = useCallback(() => {
    if (list.length > 1) {
      setIndex((i) => (i + 1) % list.length);
    }
  }, [list.length]);

  if (!list.length) return null;

  const active = list[Math.min(index, list.length - 1)]!;
  const showThumbs = list.length > 1;

  return (
    <figure className="mt-1.5 w-full">
      <div className="relative overflow-hidden rounded-lg border border-ocean-100 bg-ocean-50">
        <div className="relative aspect-[16/10] w-full max-h-[min(520px,58vh)] sm:aspect-[16/9]">
          <CmsRemoteImage
            src={active.url}
            alt={active.alt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, min(880px, 70vw)"
            priority={priority}
            onError={handleMainError}
          />
          {showThumbs ? (
            <span
              className="absolute bottom-2 right-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
            >
              {index + 1}/{list.length}
            </span>
          ) : null}
        </div>
      </div>

      {showThumbs ? (
        <div
          className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Related service photos"
        >
          {list.map((slide, i) => {
            const selected = i === index;
            return (
              <button
                key={`${slide.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Show photo ${i + 1}: ${slide.alt}`}
                className={`relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:h-16 sm:w-24 ${
                  selected
                    ? "border-cyan-600 ring-2 ring-cyan-200"
                    : "border-ocean-100 opacity-90 hover:border-cyan-300"
                }`}
                onClick={() => setIndex(i)}
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
