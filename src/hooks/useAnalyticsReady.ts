"use client";

import { useEffect, useState } from "react";

const INTERACTION_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "touchstart",
  "keydown",
  "scroll",
];

/** Delay before counting a page view without interaction (bounce traffic). */
const IDLE_ARM_MS = 4_000;

/**
 * Arms analytics after first interaction OR a short idle delay so blog view
 * counts are not stuck at zero for visitors who read without scrolling.
 */
export function useAnalyticsReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready || typeof window === "undefined") return;

    let done = false;
    const markReady = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    const opts: AddEventListenerOptions = { once: true, passive: true };
    INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markReady, opts);
    });

    const idleTimer = window.setTimeout(markReady, IDLE_ARM_MS);

    return () => {
      done = true;
      window.clearTimeout(idleTimer);
      INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markReady);
      });
    };
  }, [ready]);

  return ready;
}
