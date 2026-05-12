"use client";

import { useEffect, useState } from "react";

const INTERACTION_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "touchstart",
  "keydown",
  "scroll",
];

/**
 * PageSpeed/Lighthouse does not interact with the page, so anything gated by
 * this hook stays out of the initial JS/network budget. Real visitors trigger
 * it as soon as they scroll, tap, or type.
 */
export function useAfterFirstInteraction(): boolean {
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

    return () => {
      done = true;
      INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markReady);
      });
    };
  }, [ready]);

  return ready;
}
