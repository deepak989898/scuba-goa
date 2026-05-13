"use client";

import { useEffect, useRef, useState } from "react";
import { OFFICE_MAP_EMBED_SRC } from "@/lib/constants";

type Props = {
  className?: string;
  /** Pixel height or CSS length, e.g. 220 or "min(55vw, 320px)" */
  height?: number | string;
  title?: string;
  /** `dark` for footer; `light` for marketing pages */
  surface?: "dark" | "light";
};

/**
 * Google Maps embed pulls `maps.googleapis.com` assets with short cache TTL.
 * Mounting the iframe only when the block is near the viewport avoids that
 * cost on the initial home/contact paint (Lighthouse often never scrolls).
 */
export function OfficeMapEmbed({
  className = "",
  height = 220,
  title = "Map — Scuba Diving with Island Trip, Baga, Goa",
  surface = "dark",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mountIframe, setMountIframe] = useState(false);
  const styleHeight = typeof height === "number" ? `${height}px` : height;

  const shell =
    surface === "light"
      ? "border border-ocean-200 bg-white shadow-md"
      : "border border-slate-700 bg-slate-900 shadow-sm";

  useEffect(() => {
    const el = rootRef.current;
    if (!el || mountIframe) return;
    if (typeof IntersectionObserver === "undefined") {
      setMountIframe(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMountIframe(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mountIframe]);

  return (
    <div
      ref={rootRef}
      className={`overflow-hidden rounded-2xl ${shell} ${className}`.trim()}
    >
      {mountIframe ? (
        <iframe
          title={title}
          src={OFFICE_MAP_EMBED_SRC}
          width="100%"
          className="block w-full max-w-full"
          style={{ border: 0, height: styleHeight }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div
          className={
            surface === "light"
              ? "flex items-center justify-center bg-ocean-50 text-xs text-ocean-600"
              : "flex items-center justify-center bg-slate-800/80 text-xs text-slate-400"
          }
          style={{ height: styleHeight }}
          role="status"
          aria-live="polite"
        >
          Map loads when in view…
        </div>
      )}
    </div>
  );
}
