"use client";

import dynamic from "next/dynamic";
import { useAnalyticsReady } from "@/hooks/useAnalyticsReady";

/**
 * The custom Firestore analytics tracker attaches document-level listeners and
 * creates a session on first render. Keep it out of the initial Lighthouse
 * trace; start after first interaction or a short idle delay so views are counted.
 */
const LazyAnalyticsTracker = dynamic(
  () => import("@/components/AnalyticsTracker").then((m) => m.AnalyticsTracker),
  { ssr: false, loading: () => null },
);

export function DeferredAnalyticsTracker() {
  const armed = useAnalyticsReady();
  if (!armed) return null;
  return <LazyAnalyticsTracker />;
}
