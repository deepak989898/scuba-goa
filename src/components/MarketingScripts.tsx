"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Script from "next/script";
import { MetaPixelEffects } from "@/components/MetaPixelEffects";

/**
 * Google Analytics 4: users, geo, device, traffic sources (standard GA4 reports).
 * Microsoft Clarity: session replay, clicks, heatmaps.
 * Meta (Facebook) Pixel: ads attribution, remarketing, Purchase + custom events.
 *
 * GA4, Clarity, and Meta all use `lazyOnload` so tracking does not compete with the
 * first render/hydration work on mobile. It is better to miss a few milliseconds
 * of heatmap timing than to make the booking page feel slow.
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

function readMetaPixelId(): string {
  const raw = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
  if (!raw) return "";
  if (process.env.NODE_ENV === "development") {
    const ok = /^\d{10,20}$/.test(raw);
    if (!ok) {
      console.warn(
        "[MarketingScripts] NEXT_PUBLIC_META_PIXEL_ID should be numeric (Meta Pixel ID). Value:",
        raw,
      );
    }
  }
  return raw;
}

const META_PIXEL_ID = readMetaPixelId();

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
    if (!META_PIXEL_ID) {
      console.info(
        "[MarketingScripts] Meta Pixel off — set NEXT_PUBLIC_META_PIXEL_ID for Facebook / Instagram ads tracking.",
      );
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !GA_ID) return;
    let cancelled = false;
    let pollId: number | undefined;
    let tries = 0;

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
      tries += 1;
      if (tries < 5) pollId = window.setTimeout(tick, 1000);
    };

    tick();
    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearTimeout(pollId);
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
        <Script id="ga4-gtag" strategy="lazyOnload">
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
          strategy="lazyOnload"
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
      {META_PIXEL_ID ? (
        <>
          <Script id="meta-pixel-fbq" strategy="lazyOnload">
            {`
(function () {
  var id = ${JSON.stringify(META_PIXEL_ID)};
  if (!id) return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', id);
})();
            `.trim()}
          </Script>
          <MetaPixelEffects />
        </>
      ) : null}
    </>
  );
}
