"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { BlogHeroGalleryData } from "@/lib/blog-hero-gallery";

type Props = BlogHeroGalleryData & {
  priority?: boolean;
};

type Slide = {
  url: string;
  alt: string;
  href?: string;
};

/**
 * Hero — large image + clickable thumbnails (related service photos only).
 */
export function BlogHeroGallery({
  mainUrl,
  mainFallback,
  mainAlt,
  serviceThumbs,
  priority,
}: Props) {
  const slides = useMemo(() => {
    const out: Slide[] = [];
    for (const s of serviceThumbs) {
      if (!s.url.trim()) continue;
      if (out.some((x) => x.url === s.url)) continue;
      out.push({
        url: s.url,
        alt: s.alt,
        href: s.href,
      });
    }
    if (out.length === 0) {
      const main = mainUrl.trim() || mainFallback.trim();
      if (main) out.push({ url: main, alt: mainAlt });
    }
    return out;
  }, [mainUrl, mainFallback, mainAlt, serviceThumbs]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [failedToFallback, setFailedToFallback] = useState(false);

  const active = slides[Math.min(activeIndex, slides.length - 1)];
  const resolvedMain =
    failedToFallback && mainFallback
      ? mainFallback
      : active?.url || mainUrl || mainFallback;

  if (!resolvedMain) return null;

  const showCounter = slides.length > 1;

  return (
    <figure className="mt-1.5 w-full">
      <div className="relative w-full overflow-hidden rounded-lg border border-ocean-100 bg-ocean-900/5 leading-[0]">
        <CmsRemoteImage
          src={resolvedMain}
          alt={active?.alt || mainAlt}
          showFull
          className="mx-auto block h-auto w-full max-w-none"
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
            {activeIndex + 1}/{slides.length}
          </span>
        ) : null}
      </div>

      {slides.length > 1 ? (
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Related service photos"
        >
          {slides.map((slide, i) => {
            const selected = i === activeIndex;
            const inner = (
              <span
                className={`relative block h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-md border-2 transition sm:h-16 sm:w-24 ${
                  selected
                    ? "border-cyan-600 ring-2 ring-cyan-200"
                    : "border-ocean-100 opacity-90 hover:border-cyan-300"
                }`}
              >
                <CmsRemoteImage
                  src={slide.url}
                  alt={slide.alt}
                  fill
                  className="object-cover"
                  sizes="96px"
                  loading="lazy"
                />
              </span>
            );

            return (
              <button
                key={`${slide.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Show photo ${i + 1}: ${slide.alt}`}
                className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                onClick={() => {
                  setActiveIndex(i);
                  setFailedToFallback(false);
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>
      ) : null}

      {active?.href ? (
        <p className="mt-2 text-xs text-ocean-600">
          <Link
            href={active.href}
            className="font-semibold text-cyan-700 hover:text-cyan-800 hover:underline"
          >
            View {active.alt} →
          </Link>
        </p>
      ) : null}
    </figure>
  );
}
