"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAfterFirstInteraction } from "@/hooks/useAfterFirstInteraction";
import { msUntilChatAutoOpen } from "@/lib/chat-auto-open";

const CART_STORAGE_KEY = "bookscubagoa-cart-v1";

const LazyAiChatbot = dynamic(
  () => import("@/components/AiChatbot").then((m) => m.AiChatbot),
  { ssr: false, loading: () => null },
);
const LazyCartFAB = dynamic(
  () => import("@/components/cart/CartFAB").then((m) => m.CartFAB),
  { ssr: false, loading: () => null },
);
const LazyLeadCapturePopup = dynamic(
  () => import("@/components/LeadCapturePopup").then((m) => m.LeadCapturePopup),
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
 */
export function DeferredSiteWidgets() {
  const pathname = usePathname();
  const interacted = useAfterFirstInteraction();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [hasSavedCart, setHasSavedCart] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [chatAutoOpenReady, setChatAutoOpenReady] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    setHasSavedCart(cartHasSavedLines());
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) {
      setChatAutoOpenReady(true);
      return;
    }
    const delay = msUntilChatAutoOpen();
    const t = window.setTimeout(() => setChatAutoOpenReady(true), delay);
    return () => window.clearTimeout(t);
  }, [isAdmin]);

  if (isAdmin) return null;

  const showChatbot = interacted || isDesktop || chatAutoOpenReady;

  return (
    <>
      {interacted || hasSavedCart ? <LazyCartFAB /> : null}
      {showChatbot ? <LazyAiChatbot /> : null}
      <LazyLeadCapturePopup />
    </>
  );
}
