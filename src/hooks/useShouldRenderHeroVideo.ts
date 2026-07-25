"use client";

import { useEffect, useState } from "react";

type Conn = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "5g";
};

/**
 * Keep the hero on an optimized poster image for LCP, then enable video after
 * the browser is idle (or the user interacts). Still skip Save-Data / 2g.
 *
 * SSR always returns `false` so markup matches and there is no hydration flicker.
 */
export function useShouldRenderHeroVideo(): boolean {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navigator as Navigator & { connection?: Conn };

    const tooSlow = () => {
      const conn = nav.connection;
      return (
        conn?.saveData === true ||
        conn?.effectiveType === "slow-2g" ||
        conn?.effectiveType === "2g"
      );
    };

    if (tooSlow()) {
      setRender(false);
      return;
    }

    let cancelled = false;
    let idleHandle: number | undefined;
    let fallbackTimer: number | undefined;

    const enable = () => {
      if (cancelled || tooSlow()) return;
      setRender(true);
    };

    const onInteract = () => enable();
    const interactOpts: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener("pointerdown", onInteract, interactOpts);
    window.addEventListener("touchstart", onInteract, interactOpts);
    window.addEventListener("keydown", onInteract, interactOpts);

    // Prefer idle callback so Lighthouse / slow mobiles paint the poster first.
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof ric === "function") {
      idleHandle = ric(enable, { timeout: 3500 });
    } else {
      fallbackTimer = window.setTimeout(enable, 2500);
    }

    type ConnectionWithListener = Conn & {
      addEventListener?: (type: "change", listener: () => void) => void;
      removeEventListener?: (type: "change", listener: () => void) => void;
    };
    const conn = nav.connection as ConnectionWithListener | undefined;
    const onConnChange = () => {
      if (tooSlow()) setRender(false);
    };
    conn?.addEventListener?.("change", onConnChange);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("keydown", onInteract);
      conn?.removeEventListener?.("change", onConnChange);
      if (idleHandle != null) {
        (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback?.(idleHandle);
      }
      if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return render;
}
