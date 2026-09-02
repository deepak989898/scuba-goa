"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  dismissPushPromptForSession,
  hasActivePushSubscription,
  hasPushSubscribedLocally,
  isPushPromptDismissedThisSession,
  isPushSupported,
  markPushSubscribedLocally,
  subscribeToWebPush,
} from "@/lib/web-push-client";

const ASK_DELAY_MS = 14000;

/**
 * No custom UI — after a short delay, opens the browser's native
 * "Show notifications" permission dialog only.
 */
export function PushNotificationPrompt() {
  const pathname = usePathname() ?? "";

  const permissionDenied =
    typeof Notification !== "undefined" && Notification.permission === "denied";

  const shouldSkip =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/booking") ||
    !isPushSupported() ||
    permissionDenied ||
    isPushPromptDismissedThisSession() ||
    hasPushSubscribedLocally();

  useEffect(() => {
    if (shouldSkip) return;
    if (
      typeof Notification !== "undefined" &&
      Notification.permission !== "default"
    ) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      if (Notification.permission === "denied") return;

      const active = await hasActivePushSubscription();
      if (active) {
        markPushSubscribedLocally();
        return;
      }
      if (isPushPromptDismissedThisSession()) return;

      const result = await subscribeToWebPush();
      if (result.ok) return;
      if (
        result.reason === "denied" ||
        result.reason === "dismissed"
      ) {
        dismissPushPromptForSession();
      }
    }, ASK_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shouldSkip, pathname]);

  return null;
}
