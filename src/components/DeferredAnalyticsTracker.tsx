"use client";

import { useEffect } from "react";
import { useAnalyticsReady } from "@/hooks/useAnalyticsReady";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

/**
 * Start tracking after first interaction or short idle.
 * Uses sync import (not next/dynamic) so click listeners attach immediately
 * after arming — dynamic() was too slow and dropped the first menu clicks.
 */
export function DeferredAnalyticsTracker() {
  const armed = useAnalyticsReady();

  useEffect(() => {
    // Warm nothing — tracker mounts as soon as armed.
  }, [armed]);

  if (!armed) return null;
  return <AnalyticsTracker />;
}
