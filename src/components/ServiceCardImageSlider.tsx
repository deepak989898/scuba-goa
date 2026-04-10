"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";

const AUTO_MS = 4500;

type Props = {
  images: string[];
  alt: string;
  mostBooked?: boolean;
  limitedSlots?: boolean;
  sizes: string;
  /** e.g. aspect-[3/2] (home cards) or aspect-[56/37] (/services grid) */
  aspectClass?: string;
  /**
   * When true, slides are not hit-targets—clicks pass through to a parent overlay link.
   * Prev/next/dot controls keep pointer events so the slider stays usable.
   */
  passthroughClicks?: boolean;
  /** Dot indicators under multi-image sliders (homepage cards often hide these). */
  showDots?: boolean;
};

export function ServiceCardImageSlider({
  images,
  alt,
  mostBooked,
  limitedSlots,
  sizes,
  aspectClass = "aspect-[4/3]",
  passthroughClicks = false,
  showDots = true,
}: Props) {
  const list = useMemo(() => {
    const slides = images.map((u) => u.trim()).filter(Boolean);
    return slides.length ? slides : [""];
  }, [images]);
  const [i, setI] = useState(0);
  const n = list.length;
  const multi = n > 1;
  const fingerprint = useMemo(() => list.join("|"), [list]);

  useEffect(() => {
    setI((x) => (n > 0 ? Math.min(x, n - 1) : 0));
  }, [n, fingerprint]);

  useEffect(() => {
    if (!multi) return;
    const t = window.setInterval(() => {
      setI((x) => (x + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [multi, n]);

  const go = useCallback(
    (dir: -1 | 1) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setI((x) => (x + dir + n) % n);
    },
    [n]
  );

  const dotClick = useCallback((idx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setI(idx);
  }, []);

  return (
    <div
      className={`relative ${aspectClass} overflow-hidden ${
        passthroughClicks
          ? "pointer-events-none [&_*]:pointer-events-none [&_button]:pointer-events-auto"
          : ""
      }`}
    >
      {list.map((src, idx) => (
        <div
          key={`${idx}-${src.slice(0, 32)}`}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            idx === i ? "z-[1] opacity-100" : "z-0 opacity-0"
          }`}
          aria-hidden={idx !== i}
        >
          <CmsRemoteImage
            src={src}
            alt={multi ? `${alt} — ${idx + 1} of ${n}` : alt}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes={sizes}
            loading={idx === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}
      {mostBooked ? (
        <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 rounded-full bg-ocean-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow sm:left-3 sm:top-3 sm:px-2.5 sm:text-xs">
          Most Booked
        </span>
      ) : null}
      {limitedSlots ? (
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-10 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:right-3 sm:top-3 sm:px-2 sm:text-xs">
          Limited Slots
        </span>
      ) : null}
      {multi ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ocean-900/45 p-1 text-white opacity-0 backdrop-blur-sm transition hover:bg-ocean-900/65 group-hover:opacity-100"
            onClick={go(-1)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next photo"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-ocean-900/45 p-1 text-white opacity-0 backdrop-blur-sm transition hover:bg-ocean-900/65 group-hover:opacity-100"
            onClick={go(1)}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
          {showDots ? (
            <div
              className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {list.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Photo ${idx + 1}`}
                  aria-current={idx === i}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === i ? "w-4 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"
                  }`}
                  onClick={dotClick(idx)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
