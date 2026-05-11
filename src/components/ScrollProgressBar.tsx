"use client";

import { useEffect, useState } from "react";

/**
 * Thin gradient bar pinned to the very top of the viewport that grows as the
 * user scrolls down and shrinks back as they scroll up. Helps visitors gauge
 * how much of the page they have left.
 *
 * Implementation notes
 * - Listens to `scroll` + `resize` with a `requestAnimationFrame` throttle so
 *   the handler runs at most once per frame even on long blog/guide pages.
 * - Pinned with `position: fixed; top: 0` and a high z-index so it sits above
 *   the sticky header (which is already at `top-0`). On mobile the bar
 *   visually overlaps the top 3 px of the header — a common UX pattern.
 * - Only renders when the document is actually scrollable (>1 viewport tall);
 *   short pages like the empty `/contact` form do not need a progress strip.
 * - Respects `prefers-reduced-motion`: the bar still updates instantly but the
 *   CSS transition is removed so it never adds animation work.
 */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    let ticking = false;

    const compute = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) {
        setScrollable(false);
        setProgress(0);
        return;
      }
      setScrollable(true);
      const ratio = Math.min(1, Math.max(0, window.scrollY / max));
      setProgress(ratio);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!scrollable) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] bg-transparent sm:h-1"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.55)] transition-[transform] duration-150 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${progress})`, width: "100%" }}
        role="progressbar"
        aria-label="Page scroll progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      />
    </div>
  );
}
