"use client";

import { useEffect, useState } from "react";

type Conn = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "5g";
};

/**
 * The hero <video> renders on every viewport, including phones — owners want
 * the cinematic loop to be visible everywhere. We still skip it when:
 *
 *  - `navigator.connection.saveData` is on (user opted into reduced data), or
 *  - `effectiveType` is `slow-2g` / `2g` (cell network is too weak to stream).
 *
 * `3g` is intentionally allowed so that typical Indian 4G/LTE phones — which
 * sometimes downgrade to 3g briefly — still get the video. We always return
 * `false` on the server so SSR markup is identical for everyone and there is
 * no hydration mismatch; the effect flips it on after mount.
 */
export function useShouldRenderHeroVideo(): boolean {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navigator as Navigator & { connection?: Conn };

    const evaluate = () => {
      const conn = nav.connection;
      const tooSlow =
        conn?.saveData === true ||
        conn?.effectiveType === "slow-2g" ||
        conn?.effectiveType === "2g";
      setRender(!tooSlow);
    };

    evaluate();

    type ConnectionWithListener = Conn & {
      addEventListener?: (type: "change", listener: () => void) => void;
      removeEventListener?: (type: "change", listener: () => void) => void;
    };
    const conn = nav.connection as ConnectionWithListener | undefined;
    conn?.addEventListener?.("change", evaluate);
    return () => conn?.removeEventListener?.("change", evaluate);
  }, []);

  return render;
}
