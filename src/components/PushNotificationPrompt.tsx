"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  dismissPushPromptForSession,
  hasActivePushSubscription,
  hasPushSubscribedLocally,
  isPushPromptDismissedThisSession,
  isPushSupported,
  markPushSubscribedLocally,
  subscribeToWebPush,
} from "@/lib/web-push-client";

const SHOW_DELAY_MS = 14000;

export function PushNotificationPrompt() {
  const pathname = usePathname() ?? "";
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldSkip =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/booking") ||
    !isPushSupported() ||
    isPushPromptDismissedThisSession() ||
    hasPushSubscribedLocally();

  useEffect(() => {
    if (shouldSkip) return;
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        return;
      }
      const active = await hasActivePushSubscription();
      if (active) {
        markPushSubscribedLocally();
        return;
      }
      if (isPushPromptDismissedThisSession()) return;
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shouldSkip, pathname]);

  const dismiss = useCallback(() => {
    dismissPushPromptForSession();
    setVisible(false);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await subscribeToWebPush();
    setBusy(false);
    if (result.ok) {
      setDone(true);
      setVisible(false);
      return;
    }
    if (result.reason === "denied") {
      dismiss();
      return;
    }
    setError("Could not enable notifications. Try again in browser settings.");
  }, [dismiss]);

  if (!visible || done) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-[56] px-3 md:bottom-6 md:max-w-md md:left-4 md:right-auto"
      role="dialog"
      aria-label="Enable notifications"
    >
      <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-xl shadow-ocean-900/15">
        <p className="text-sm font-bold text-ocean-900">
          Get Goa deals &amp; offers
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ocean-700">
          Allow notifications for flash discounts on scuba, water sports, and
          party packages — works in Chrome, Safari, and the installed app.
        </p>
        {error ? (
          <p className="mt-2 text-xs text-red-700">{error}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void enable()}
            className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {busy ? "Enabling…" : "Allow notifications"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-ocean-200 px-4 py-2 text-xs font-semibold text-ocean-700"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
