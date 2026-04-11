"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Script from "next/script";

/**
 * Google Analytics 4: users, geo, device, traffic sources (standard GA4 reports).
 * Microsoft Clarity: session replay, clicks, heatmaps.
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
    if (isAdmin || !GA_ID || typeof window.gtag !== "function") return;
    window.gtag("config", GA_ID, {
      page_path: pathname || "/",
    });
  }, [pathname, isAdmin]);

  if (isAdmin) return null;

  return (
    <>
      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-config" strategy="afterInteractive">
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
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");
          `.trim()}
        </Script>
      ) : null}
    </>
  );
}
