"use client";

import { useEffect } from "react";
import { useAnalyticsReady } from "@/hooks/useAnalyticsReady";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { captureAnalyticsFirstTouch } from "@/lib/analytics-first-touch";

/**
 * Start tracking after first interaction or short idle.
 * Uses sync import (not next/dynamic) so click listeners attach immediately
 * after arming — dynamic() was too slow and dropped the first menu clicks.
 *
 * First-touch referrer/UTMs are captured immediately on mount so SPA
 * navigations cannot wipe fbclid / utm_* before the tracker arms.
 */
export function DeferredAnalyticsTracker() {
  const armed = useAnalyticsReady();

  useEffect(() => {
    captureAnalyticsFirstTouch();
  }, []);

  if (!armed) return null;
  return <AnalyticsTracker />;
}
