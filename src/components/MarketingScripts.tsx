"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Script from "next/script";

/**
 * Google Analytics 4: users, geo, device, traffic sources (standard GA4 reports).
 * Microsoft Clarity: session replay, clicks, heatmaps.
 *
 * Scripts use `lazyOnload` so they run after first paint — fewer collisions with React
 * hydration and in-app browsers (Facebook/Instagram), which Clarity often reports as
 * generic "Script error." when third-party code throws early.
 *
 * Skips /admin so staff sessions are not recorded.
 */
const GA_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  "";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "";

export function MarketingScripts() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith("/admin"));

  useEffect(() => {
    if (isAdmin || !GA_ID) return;
    let cancelled = false;
    let pollId: number | undefined;

    const tick = () => {
      if (cancelled) return;
      if (typeof window.gtag === "function") {
        try {
          window.gtag("config", GA_ID, {
            page_path: pathname || "/",
          });
        } catch {
          /* GA blocked or unavailable in some in-app browsers */
        }
        return;
      }
      pollId = window.setTimeout(tick, 80);
    };

    tick();
    let giveUpId: number | undefined;
    giveUpId = window.setTimeout(() => {
      cancelled = true;
      if (pollId !== undefined) window.clearTimeout(pollId);
    }, 20_000);

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

  if (isAdmin) return null;

  return (
    <>
      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-config" strategy="lazyOnload">
            {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });
            `.trim()}
          </Script>
        </>
      ) : null}
      {CLARITY_ID ? (
        <Script id="microsoft-clarity" type="text/javascript" strategy="lazyOnload">
          {`
try {
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");
} catch (e) { /* ignore */ }
          `.trim()}
        </Script>
      ) : null}
    </>
  );
}
