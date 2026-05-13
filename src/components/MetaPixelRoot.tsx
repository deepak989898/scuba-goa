"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Script from "next/script";
import { MetaPixelEffects } from "@/components/MetaPixelEffects";
import { readMetaPixelIdFromEnv } from "@/lib/meta-pixel";

const META_PIXEL_ID = readMetaPixelIdFromEnv();

/**
 * Meta Pixel loads here (not inside {@link DeferredMarketingScripts}) so:
 * - Meta’s “set up events” / URL scanner finds `fbq` without requiring a scroll or tap first.
 * - `lazyOnload` keeps Facebook JS off the critical path so LCP is not competing
 *   with short-TTL `fbevents.js` (PageSpeed). Real users still get attribution
 *   after the window load event.
 *
 * `/admin` is excluded so staff traffic is not attributed to ads.
 */
export function MetaPixelRoot() {
  const pathname = usePathname();
  const isAdmin = Boolean(pathname?.startsWith("/admin"));

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

  if (isAdmin || !META_PIXEL_ID) return null;

  const idJson = JSON.stringify(META_PIXEL_ID);
  const noscriptSrc = `https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`;

  return (
    <>
      <Script id="meta-pixel-fbq" strategy="lazyOnload">
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
