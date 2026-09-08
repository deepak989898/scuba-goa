"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images: string[];
  title: string;
};

/** Hotel CDN images load reliably as direct URLs (Safar Sathi / TripJack travelapi). */
function HotelGalleryImage({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const trimmed = src.trim();
  if (!trimmed) {
    return <div className={`bg-ocean-100 ${className}`.trim()} aria-hidden />;
  }

  return (
    <img
      src={trimmed}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export function HotelGallery({ images, title }: Props) {
  const list = useMemo(
    () => images.map((u) => u.trim()).filter(Boolean),
    [images],
  );
  const [index, setIndex] = useState(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const n = list.length;

  useEffect(() => {
    setIndex((x) => (n > 0 ? Math.min(x, n - 1) : 0));
  }, [n]);

  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [index]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((x) => (x + dir + n) % n);
    },
    [n],
  );

  if (n === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm">
      <div className="relative aspect-[16/10] w-full min-h-[220px] max-h-[min(520px,58vh)] bg-ocean-100 sm:min-h-[300px]">
        <HotelGalleryImage
          src={list[index]}
          alt={n > 1 ? `${title} — photo ${index + 1} of ${n}` : title}
          priority={index === 0}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {n > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-ocean-900 shadow-md transition hover:bg-white"
              onClick={() => go(-1)}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-ocean-900 shadow-md transition hover:bg-white"
              onClick={() => go(1)}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </button>
            <span
              className="absolute bottom-3 right-3 z-20 rounded-md bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              aria-live="polite"
            >
              {index + 1}/{n}
            </span>
          </>
        ) : null}
      </div>

      {n > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto border-t border-ocean-100 bg-ocean-50/40 p-3"
          role="tablist"
          aria-label="Hotel photos"
        >
          {list.map((src, idx) => {
            const active = idx === index;
            return (
              <button
                key={`${idx}-${src.slice(-24)}`}
                ref={(el) => {
                  thumbRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Show photo ${idx + 1}`}
                onClick={() => setIndex(idx)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  active
                    ? "border-cyan-600 ring-2 ring-cyan-200"
                    : "border-transparent opacity-80 hover:border-ocean-200 hover:opacity-100"
                }`}
              >
                <HotelGalleryImage
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
