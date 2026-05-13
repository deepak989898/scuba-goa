"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  classifyMetaOutboundHref,
  trackMetaPhoneCallClick,
  trackMetaWhatsAppClick,
} from "@/lib/meta-pixel";

/**
 * Client-side route changes only: {@link MetaPixelRoot} sends the first `PageView`
 * once the user has engaged (scroll/tap/key). Next.js App Router navigations need an extra
 * `PageView` so funnels stay accurate.
 *
 * Also: outbound WhatsApp / business tel clicks (capture phase so events fire
 * before the browser follows the link).
 */
export function MetaPixelEffects() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith("/admin"));
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    const path = pathname || "/";

    if (lastTrackedPathRef.current === null) {
      lastTrackedPathRef.current = path;
      return;
    }
    if (lastTrackedPathRef.current === path) return;
    lastTrackedPathRef.current = path;

    const f = typeof window.fbq === "function" ? window.fbq : undefined;
    if (!f) return;
    try {
      f("track", "PageView");
    } catch {
      /* ignore */
    }
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
