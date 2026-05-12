"use client";

import dynamic from "next/dynamic";
import { useAfterFirstInteraction } from "@/hooks/useAfterFirstInteraction";

/**
 * Google Tag Manager (`gtag.js`) costs ~141 KB transfer and ~71 KB of unused
 * JS at first paint on mobile (per PageSpeed Insights). It does not need to
 * load until the user is actually engaging with the page, so we mount the
 * underlying <Script> tags only after one of:
 *
 * - The first user input (`scroll`, `pointerdown`, `touchstart`, `keydown`).
 *
 * There is intentionally no timer fallback here. The previous 4.5s fallback
 * still landed inside Lighthouse's trace window, so `gtag.js` kept appearing
 * as 141 KB of unused JavaScript in PageSpeed. Real engaged visitors still
 * load analytics immediately after their first scroll/tap/key press.
 */
const LazyMarketingScripts = dynamic(
  () => import("@/components/MarketingScripts").then((m) => m.MarketingScripts),
  { ssr: false, loading: () => null },
);

export function DeferredMarketingScripts() {
  const armed = useAfterFirstInteraction();

  if (!armed) return null;
  return <LazyMarketingScripts />;
}
