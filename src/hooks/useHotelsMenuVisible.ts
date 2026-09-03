"use client";

import { useEffect, useState } from "react";

type State = {
  visible: boolean;
  loading: boolean;
};

let cached: State | null = null;
let inflight: Promise<State> | null = null;

async function fetchMenuVisible(): Promise<State> {
  if (cached && !cached.loading) return cached;
  if (inflight) return inflight;

  inflight = fetch("/api/hotels/settings", { cache: "no-store" })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      const visible = Boolean(
        res.ok && (data as { websiteMenuVisible?: boolean }).websiteMenuVisible,
      );
      cached = { visible, loading: false };
      return cached;
    })
    .catch(() => {
      cached = { visible: true, loading: false };
      return cached;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Whether Hotels should appear in public site navigation (header/footer). */
export function useHotelsMenuVisible(): State {
  const [state, setState] = useState<State>(
    cached ?? { visible: true, loading: true },
  );

  useEffect(() => {
    let cancelled = false;
    void fetchMenuVisible().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Call after admin toggles so next navigation fetch picks up the change. */
export function refreshHotelsMenuVisibleCache(): void {
  cached = null;
}
