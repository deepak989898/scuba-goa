"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";

const AUTO_MS = 5000;

type Props = {
  images: string[];
  /** Used for image alt text only (no on-image caption). */
  title: string;
};

export function ServiceDetailGallery({ images, title }: Props) {
  const list = useMemo(() => {
    const slides = images.filter((u) => u.trim().length > 0);
    return slides.length ? slides : [""];
  }, [images]);
  const [i, setI] = useState(0);
  const n = list.length;
  const listFingerprint = useMemo(() => list.join("|"), [list]);

  useEffect(() => {
    setI((x) => (n > 0 ? Math.min(x, n - 1) : 0));
  }, [n, listFingerprint]);

  useEffect(() => {
    if (n <= 1) return;
    const t = window.setInterval(() => {
      setI((x) => (x + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [n]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setI((x) => (x + dir + n) % n);
    },
    [n]
  );

  return (
    <div className="relative aspect-[21/9] max-h-[min(420px,55vh)] w-full sm:max-h-[420px]">
      {list.map((src, idx) => (
        <div
          key={`${idx}-${src.slice(0, 40)}`}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            idx === i ? "z-10 opacity-100" : "z-0 opacity-0"
          }`}
          aria-hidden={idx !== i}
        >
          <CmsRemoteImage
            src={src}
            alt={n > 1 ? `${title} — photo ${idx + 1} of ${n}` : title}
            fill
            className="object-cover"
            sizes="100vw"
            priority={idx === 0}
            loading={idx === 0 ? undefined : "lazy"}
          />
        </div>
      ))}
      <div
        className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/25 to-transparent"
        aria-hidden
      />

      {n > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 z-30 -translate-y-1/2 rounded-full bg-ocean-900/50 p-2 text-white backdrop-blur-sm transition hover:bg-ocean-900/70"
            onClick={() => go(-1)}
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next photo"
            className="absolute right-3 top-1/2 z-30 -translate-y-1/2 rounded-full bg-ocean-900/50 p-2 text-white backdrop-blur-sm transition hover:bg-ocean-900/70"
            onClick={() => go(1)}
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
          <div
            className="absolute bottom-4 left-0 right-0 z-30 flex justify-center gap-1.5"
            role="tablist"
            aria-label="Gallery slides"
          >
            {list.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === i}
                aria-label={`Show photo ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === i ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                }`}
                onClick={() => setI(idx)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
