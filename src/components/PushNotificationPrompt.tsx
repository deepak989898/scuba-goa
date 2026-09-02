"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  completePushSubscription,
  dismissPushPromptForSession,
  hasActivePushSubscription,
  isPushSupported,
  markPushSubscribedLocally,
  prepareWebPush,
  reconcilePushLocalState,
  requestNotificationPermissionAsync,
} from "@/lib/web-push-client";

const MIN_PAGE_MS = 6000;

/**
 * Shows only the browser's native notification permission dialog.
 * Chrome requires a real click/tap — timers alone are blocked.
 */
export function PushNotificationPrompt() {
  const pathname = usePathname() ?? "";
  const askedRef = useRef(false);

  const shouldSkip =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/booking") ||
    !isPushSupported();

  useEffect(() => {
    if (shouldSkip) return;

    reconcilePushLocalState();
    void prepareWebPush();

    let cancelled = false;
    let pageReady = false;
    const pageTimer = window.setTimeout(() => {
      pageReady = true;
    }, MIN_PAGE_MS);

    const finishGranted = async () => {
      const result = await completePushSubscription();
      if (result.ok) {
        markPushSubscribedLocally();
        return;
      }
      if (result.reason === "denied") {
        dismissPushPromptForSession();
      }
    };

    const tryNativePermissionPrompt = () => {
      if (cancelled || askedRef.current || !pageReady) return;
      if (typeof Notification === "undefined") return;

      if (Notification.permission === "denied") return;

      if (Notification.permission === "granted") {
        askedRef.current = true;
        void (async () => {
          const active = await hasActivePushSubscription();
          if (active) {
            markPushSubscribedLocally();
            return;
          }
          await finishGranted();
        })();
        return;
      }

      if (Notification.permission !== "default") return;

      askedRef.current = true;

      // Must be invoked synchronously from the user-gesture handler.
      const permissionPromise = requestNotificationPermissionAsync();
      void permissionPromise.then((permission) => {
        if (permission === "granted") {
          void finishGranted();
        } else if (permission === "denied") {
          dismissPushPromptForSession();
        } else {
          askedRef.current = false;
        }
      });
    };

    const onUserGesture = () => {
      tryNativePermissionPrompt();
    };

    const gestureOpts: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointerdown", onUserGesture, gestureOpts);
    window.addEventListener("keydown", onUserGesture, gestureOpts);

    return () => {
      cancelled = true;
      window.clearTimeout(pageTimer);
      window.removeEventListener("pointerdown", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
    };
  }, [shouldSkip, pathname]);

  return null;
}
