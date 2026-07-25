"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const DISMISS_KEY = "bsg_pwa_install_dismissed";

/**
 * Registers the service worker and shows an Install App button on Android/Chrome
 * when the browser fires `beforeinstallprompt`.
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Local Next.js HMR + SW = stale chunks; Vercel production/preview only.
    if (process.env.NODE_ENV !== "production") return;

    // Prefer canonical host so SW scope matches the installed app URL.
    // Apex often 308→www; registering on the final URL avoids install failures.
    const host = window.location.hostname.replace(/^www\./, "");
    if (
      host === "bookscubagoa.com" &&
      !window.location.hostname.startsWith("www.")
    ) {
      // Soft nudge: stay on www for PWA (do not force redirect here — Vercel DNS should).
      console.info("[pwa] Open https://www.bookscubagoa.com for Install app");
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          reg.update().catch(() => undefined);
        })
        .catch((err) => {
          console.warn("[pwa] service worker registration failed", err);
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (standalone) {
      setInstalled(true);
      return;
    }

    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const onBip = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (installed || !visible || !deferred) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] z-[57] px-3 md:bottom-6 md:left-auto md:right-6 md:max-w-sm md:px-0"
      role="dialog"
      aria-label="Install Book Scuba Goa app"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-ocean-200 bg-white p-3 shadow-xl shadow-ocean-900/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ocean-900">
            Install Book Scuba Goa
          </p>
          <p className="text-xs text-ocean-700">
            Add to your home screen — faster booking offline-ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void install()}
          className="shrink-0 rounded-full bg-ocean-800 px-3.5 py-2 text-xs font-bold text-white"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full px-2 py-2 text-lg leading-none text-ocean-500"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
