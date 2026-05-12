"use client";

import dynamic from "next/dynamic";
import { useAfterFirstInteraction } from "@/hooks/useAfterFirstInteraction";

/**
 * The custom Firestore analytics tracker attaches document-level listeners and
 * creates a session on first render. Keep it out of the initial Lighthouse
 * trace and start it only after the visitor actually engages.
 */
const LazyAnalyticsTracker = dynamic(
  () => import("@/components/AnalyticsTracker").then((m) => m.AnalyticsTracker),
  { ssr: false, loading: () => null },
);

export function DeferredAnalyticsTracker() {
  const armed = useAfterFirstInteraction();
  if (!armed) return null;
  return <LazyAnalyticsTracker />;
}
