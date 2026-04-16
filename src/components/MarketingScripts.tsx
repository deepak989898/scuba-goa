"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Script from "next/script";

/**
 * Google Analytics 4: users, geo, device, traffic sources (standard GA4 reports).
 * Microsoft Clarity: session replay, clicks, heatmaps.
 *
 * GA4 and Clarity both use `afterInteractive` so tracking can start quickly on
 * short sessions and in-app browsers. This improves parity with server-side
 * analytics events shown in /admin/analytics.
 *
 * Skips /admin so staff sessions are not recorded.
 */
function readGaMeasurementId(): string {
  const a =
    typeof process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID === "string"
      ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
      : "";
  const b =
    typeof process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID === "string"
      ? process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
      : "";
  const raw = (a || b).trim().replace(/^['"]+|['"]+$/g, "");
  if (!raw) return "";
  if (process.env.NODE_ENV === "development") {
    const ok = /^G-[A-Z0-9]+$/i.test(raw) || /^UA-\d+-\d+$/i.test(raw);
    if (!ok) {
      console.warn(
        "[MarketingScripts] Measurement ID should be GA4 (G-XXXXXXXX) or legacy UA-XXXX-X. Value:",
        raw,
      );
    }
  }
  return raw;
}

const GA_ID = readGaMeasurementId();
const CLARITY_ID = (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "").trim();

export function MarketingScripts() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith("/admin"));
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || isAdmin) return;
    if (!GA_ID) {
      console.info(
        "[MarketingScripts] GA4 is off — set NEXT_PUBLIC_GA_MEASUREMENT_ID (or NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) in .env.local / Vercel.",
      );
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !GA_ID) return;
    let cancelled = false;
    let pollId: number | undefined;

    const sendPageView = () => {
      if (typeof window.gtag !== "function") return false;
      try {
        window.gtag("config", GA_ID, {
          page_path: pathname || "/",
          page_title: document.title,
        });
      } catch {
        /* GA blocked or unavailable in some in-app browsers */
      }
      return true;
    };

    const tick = () => {
      if (cancelled) return;
      if (sendPageView()) return;
      pollId = window.setTimeout(tick, 50);
    };

    tick();
    let giveUpId: number | undefined;
    giveUpId = window.setTimeout(() => {
      cancelled = true;
      if (pollId !== undefined) window.clearTimeout(pollId);
      if (
        process.env.NODE_ENV === "development" &&
        typeof window.gtag !== "function"
      ) {
        console.warn(
          "[MarketingScripts] gtag.js did not become available within 12s — check ad blockers, CSP, and that NEXT_PUBLIC_GA_MEASUREMENT_ID is set on this build.",
        );
      }
    }, 12_000);

    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearTimeout(pollId);
      if (giveUpId !== undefined) window.clearTimeout(giveUpId);
    };
  }, [pathname, isAdmin]);

  /** Clarity records the real browser host; tags help filter by canonical site in the Clarity UI. */
  useEffect(() => {
    if (isAdmin || !CLARITY_ID) return;
    const expectedSite = (process.env.NEXT_PUBLIC_SITE_URL || "")
      .replace(/\/$/, "")
      .trim();
    const applyTags = () => {
      if (typeof window.clarity !== "function") return false;
      const { protocol, host } = window.location;
      const origin = `${protocol}//${host}`;
      const path = pathname || "/";
      try {
        window.clarity("set", "bsg_origin", origin);
        window.clarity("set", "bsg_path", path);
        if (expectedSite) window.clarity("set", "bsg_expected_site", expectedSite);
      } catch {
        /* ignore */
      }
      return true;
    };
    if (applyTags()) return;
    const interval = window.setInterval(() => {
      if (applyTags()) window.clearInterval(interval);
    }, 200);
    const stop = window.setTimeout(() => window.clearInterval(interval), 8000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [pathname, isAdmin]);

  useEffect(() => {
    if (isAdmin || !CLARITY_ID) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    let cancelled = false;
    let tries = 0;
    let retryId: number | undefined;
    const MAX_TRIES = 5;
    const RETRY_MS = 1500;

    const ensureClarityScript = () => {
      if (cancelled) return;
      if (typeof window.clarity === "function") return;
      const src = `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`;
      const existing = document.querySelector(
        `script[src="${src}"]`,
      ) as HTMLScriptElement | null;
      if (!existing) {
        const s = document.createElement("script");
        s.async = true;
        s.src = src;
        (document.head || document.body).appendChild(s);
      }
      tries += 1;
      if (tries < MAX_TRIES) {
        retryId = window.setTimeout(ensureClarityScript, RETRY_MS);
      }
    };

    ensureClarityScript();
    return () => {
      cancelled = true;
      if (retryId !== undefined) window.clearTimeout(retryId);
    };
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <>
      {GA_ID ? (
        <Script id="ga4-gtag" strategy="afterInteractive">
          {`
(function () {
  var id = ${JSON.stringify(GA_ID)};
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id, { send_page_view: false });
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  (document.head || document.body).appendChild(s);
})();
          `.trim()}
        </Script>
      ) : null}
      {CLARITY_ID ? (
        <Script
          id="microsoft-clarity"
          type="text/javascript"
          strategy="afterInteractive"
        >
          {`
try {
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(CLARITY_ID)});
} catch (e) { /* ignore */ }
          `.trim()}
        </Script>
      ) : null}
    </>
  );
}
