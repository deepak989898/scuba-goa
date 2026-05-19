"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAfterFirstInteraction } from "@/hooks/useAfterFirstInteraction";
import {
  hasVisitedNonHome,
  isHomePath,
  markVisitedNonHome,
} from "@/lib/visit-session";

const CART_STORAGE_KEY = "bookscubagoa-cart-v1";
/** After return-home, wait before loading popup code (keeps first homepage light). */
const RETURNING_POPUP_IMPORT_DELAY_MS = 8_000;

const LazyAiChatbot = dynamic(
  () => import("@/components/AiChatbot").then((m) => m.AiChatbot),
  { ssr: false, loading: () => null },
);
const LazyCartFAB = dynamic(
  () => import("@/components/cart/CartFAB").then((m) => m.CartFAB),
  { ssr: false, loading: () => null },
);
const LazyLeadOfferPopup = dynamic(
  () => import("@/components/LeadOfferPopup").then((m) => m.LeadOfferPopup),
  { ssr: false, loading: () => null },
);

function cartHasSavedLines(): boolean {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * Heavy optional widgets used to be dynamically imported but still mounted
 * immediately, which made their chunks eligible for Lighthouse's unused-JS
 * audit. This wrapper keeps those chunks out of first paint:
 *
 * - Cart drawer: import only after a real interaction, or if a returning user
 *   already has cart lines saved in localStorage.
 * - Chatbot: import only after interaction.
 * - Offer popup: import only for returning-home visitors and only after the
 *   original "wait a bit" delay.
 */
export function DeferredSiteWidgets() {
  const pathname = usePathname();
  const interacted = useAfterFirstInteraction();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const isHome = isHomePath(pathname);
  const [hasSavedCart, setHasSavedCart] = useState(false);
  const [loadLeadPopup, setLoadLeadPopup] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    setHasSavedCart(cartHasSavedLines());
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;

    if (!isHome) {
      markVisitedNonHome();
      setLoadLeadPopup(false);
      return;
    }

    if (!hasVisitedNonHome()) {
      setLoadLeadPopup(false);
      return;
    }

    const timer = window.setTimeout(
      () => setLoadLeadPopup(true),
      RETURNING_POPUP_IMPORT_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isAdmin, isHome, pathname]);

  if (isAdmin) return null;

  return (
    <>
      {interacted || hasSavedCart ? <LazyCartFAB /> : null}
      {interacted ? <LazyAiChatbot /> : null}
      {loadLeadPopup ? <LazyLeadOfferPopup /> : null}
    </>
  );
}
