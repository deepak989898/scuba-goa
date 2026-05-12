"use client";

import { useEffect, useState } from "react";

/**
 * Below this viewport width the hero <video> is never mounted. Mobile users
 * were downloading the full 3–5 MB clip on first paint — `preload="metadata"`
 * isn't enough because autoplay forces the full fetch. The poster image
 * (AVIF/WebP via next/image) keeps the hero visually rich on small screens.
 */
export const HERO_VIDEO_MIN_VIEWPORT_PX = 768;

type Conn = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "5g";
};

/**
 * Returns `true` only when the viewport is wide enough AND the connection
 * isn't reporting Save-Data or a slow effective type. Always `false` on the
 * server so SSR markup is identical for everyone (no hydration mismatch).
 */
export function useShouldRenderHeroVideo(): boolean {
  const [render, setRender] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${HERO_VIDEO_MIN_VIEWPORT_PX}px)`);
    const nav = navigator as Navigator & { connection?: Conn };
    const evaluate = () => {
      const conn = nav.connection;
      const slowNetwork =
        conn?.saveData === true ||
        conn?.effectiveType === "slow-2g" ||
        conn?.effectiveType === "2g" ||
        conn?.effectiveType === "3g";
      setRender(mq.matches && !slowNetwork);
    };
    evaluate();
    mq.addEventListener("change", evaluate);
    return () => mq.removeEventListener("change", evaluate);
  }, []);
  return render;
}
