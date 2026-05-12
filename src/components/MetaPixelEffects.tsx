"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  classifyMetaOutboundHref,
  trackMetaPhoneCallClick,
  trackMetaWhatsAppClick,
} from "@/lib/meta-pixel";

/**
 * SPA PageView + outbound WhatsApp / business tel clicks (capture phase so
 * events fire before the browser follows the link).
 */
export function MetaPixelEffects() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith("/admin"));

  useEffect(() => {
    if (isAdmin) return;

    const sendPageView = () => {
      const f = typeof window.fbq === "function" ? window.fbq : undefined;
      if (!f) return false;
      try {
        f("track", "PageView");
      } catch {
        /* ignore */
      }
      return true;
    };

    let cancelled = false;
    let pollId: number | undefined;
    let tries = 0;
    const tick = () => {
      if (cancelled) return;
      if (sendPageView()) return;
      tries += 1;
      if (tries < 8) pollId = window.setTimeout(tick, 400);
    };
    tick();
    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearTimeout(pollId);
    };
  }, [pathname, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;

    const onClickCapture = (ev: MouseEvent) => {
      if (typeof window.fbq !== "function") return;
      const el = (ev.target as Element | null)?.closest?.("a[href]");
      if (!el) return;
      const href = el.getAttribute("href")?.trim() ?? "";
      if (!href || href.startsWith("#")) return;
      const kind = classifyMetaOutboundHref(href);
      if (kind === "whatsapp") trackMetaWhatsAppClick();
      else if (kind === "call") trackMetaPhoneCallClick();
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [isAdmin]);

  return null;
}
