"use client";

import { useEffect, useRef, useState } from "react";

/** Helps some browsers show a first frame with preload="metadata" only */
export function videoSrcForThumbnailFrame(url: string) {
  const t = url.trim();
  if (!t || t.includes("#")) return t;
  return `${t}#t=0.001`;
}

/**
 * When admin did not set posterUrl, show a frame from the video file.
 * Defers the metadata fetch until the thumbnail scrolls into view so the
 * gallery does not download N video headers on initial page load.
 */
export function AutoVideoThumbnail({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || armed) return;
    if (typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [armed]);

  return (
    <video
      ref={ref}
      src={armed ? videoSrcForThumbnailFrame(src) : undefined}
      muted
      playsInline
      preload={armed ? "metadata" : "none"}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      aria-hidden
      title={label}
    />
  );
}
