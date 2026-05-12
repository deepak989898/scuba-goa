"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Google Tag Manager (`gtag.js`) costs ~141 KB transfer and ~71 KB of unused
 * JS at first paint on mobile (per PageSpeed Insights). It does not need to
 * load until the user is actually engaging with the page, so we mount the
 * underlying <Script> tags only after one of:
 *
 * - 4500 ms of idle time (in case the visitor reads the hero without
 *   scrolling, we still capture them).
 * - The first user input (`scroll`, `pointerdown`, `touchstart`, `keydown`).
 *
 * Whichever happens first wins. After that we hand off to the normal
 * `MarketingScripts` component which still uses `strategy="lazyOnload"` for
 * the actual <Script> tags themselves, so the network request only fires
 * once the browser has had a chance to settle.
 */
const LazyMarketingScripts = dynamic(
  () => import("@/components/MarketingScripts").then((m) => m.MarketingScripts),
  { ssr: false, loading: () => null },
);

const IDLE_DELAY_MS = 4500;

export function DeferredMarketingScripts() {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (armed) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    const arm = () => {
      if (cancelled) return;
      cancelled = true;
      setArmed(true);
    };

    const idleTimer = window.setTimeout(arm, IDLE_DELAY_MS);
    const events: Array<keyof WindowEventMap> = [
      "scroll",
      "pointerdown",
      "touchstart",
      "keydown",
    ];
    const opts: AddEventListenerOptions = { once: true, passive: true };
    events.forEach((ev) => window.addEventListener(ev, arm, opts));

    return () => {
      cancelled = true;
      window.clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, arm));
    };
  }, [armed]);

  if (!armed) return null;
  return <LazyMarketingScripts />;
}
