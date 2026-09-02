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

    const scheduleRegister = () => {
      const w = window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
      };
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(register, { timeout: 5000 });
      } else {
        window.setTimeout(register, 2000);
      }
    };

    if (document.readyState === "complete") scheduleRegister();
    else window.addEventListener("load", scheduleRegister, { once: true });

    // Install prompt only in production builds.
    if (process.env.NODE_ENV !== "production") return;

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

  // Mobile / tablet only — hide Install prompt on desktop (md+).
  return (
    <div
      className="fixed inset-x-0 bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] z-[57] px-3 md:hidden"
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
