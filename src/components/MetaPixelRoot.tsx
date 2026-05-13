"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Script from "next/script";
import { MetaPixelEffects } from "@/components/MetaPixelEffects";
import { useAfterFirstInteraction } from "@/hooks/useAfterFirstInteraction";
import { readMetaPixelIdFromEnv } from "@/lib/meta-pixel";

const META_PIXEL_ID = readMetaPixelIdFromEnv();

/**
 * Meta Pixel loads after the first scroll/tap/key (same trigger as deferred GTM).
 * That removes Facebook’s legacy polyfill bundle (~30+ KiB) from the critical path
 * and clears the “Legacy JavaScript” audit in Lighthouse for cold loads.
 * Engaged visitors still get `PageView` almost immediately after interacting.
 *
 * `/admin` is excluded so staff traffic is not attributed to ads.
 */
export function MetaPixelRoot() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith("/admin"));
  const engaged = useAfterFirstInteraction();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || isAdmin) return;
    if (!META_PIXEL_ID) {
      console.info(
        "[MetaPixelRoot] Meta Pixel off — set NEXT_PUBLIC_META_PIXEL_ID in .env.local / Vercel, then redeploy.",
      );
      return;
    }
    if (!/^\d{10,20}$/.test(META_PIXEL_ID)) {
      console.warn(
        "[MetaPixelRoot] NEXT_PUBLIC_META_PIXEL_ID should be digits only. Got:",
        META_PIXEL_ID,
      );
    }
  }, [isAdmin]);

  if (isAdmin || !META_PIXEL_ID || !engaged) return null;

  const idJson = JSON.stringify(META_PIXEL_ID);
  const noscriptSrc = `https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`;

  return (
    <>
      <Script id="meta-pixel-fbq" strategy="afterInteractive">
        {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${idJson});
fbq('track', 'PageView');
        `.trim()}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta noscript beacon */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={noscriptSrc}
          alt=""
        />
      </noscript>
      <MetaPixelEffects />
    </>
  );
}
