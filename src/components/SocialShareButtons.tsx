"use client";

import { useState } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { buildShareCaption } from "@/lib/og-metadata";

type Props = {
  title: string;
  path: string;
  /** Price in INR shown in WhatsApp / Instagram copy and share caption. */
  priceInr?: number;
  /** `from` = “Starting at ₹…” (services). `exact` = “₹…” (packages). */
  priceMode?: "from" | "exact";
  className?: string;
  compact?: boolean;
};

export function SocialShareButtons({
  title,
  path,
  priceInr,
  priceMode = "from",
  className,
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [igHint, setIgHint] = useState(false);
  const p = path.startsWith("/") ? path : `/${path}`;
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${p}`
      : `${SITE_URL.replace(/\/$/, "")}${p}`;
  const text = buildShareCaption({
    title,
    priceInr,
    mode: priceMode,
    siteName: SITE_NAME,
  });
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;

  async function shareToInstagram() {
    const clip = `${text}\n${url}`;
    try {
      await navigator.clipboard.writeText(clip);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
    setIgHint(true);
    window.setTimeout(() => setIgHint(false), 4000);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (isMobile) {
      window.location.href = "instagram://app";
      window.setTimeout(() => {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      }, 500);
      return;
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  }

  const base =
    "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-1 ring-black/5";
  const size = "h-11 w-11";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}
      role="group"
      aria-label={`Share ${title}`}
    >
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size} bg-[#25D366] hover:brightness-95`}
        aria-label={`Share ${title} on WhatsApp`}
        title="Share on WhatsApp (includes price)"
      >
        <WhatsAppIcon />
      </a>
      <a
        href={fb}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size} bg-[#1877F2] hover:brightness-95`}
        aria-label={`Share ${title} on Facebook`}
        title="Share on Facebook (price in link preview)"
      >
        <FacebookIcon />
      </a>
      <button
        type="button"
        onClick={shareToInstagram}
        className={`${base} ${size} bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:brightness-95`}
        aria-label={`Copy ${title} link with price and open Instagram`}
        title="Copies price + link, then opens Instagram."
      >
        <InstagramIcon />
      </button>
      {igHint ? (
        <span className="text-[10px] text-ocean-700">
          {copied
            ? "Price + link copied. Paste in your Instagram story, bio, or DM."
            : "Paste the copied price + link in Instagram."}
        </span>
      ) : null}
    </div>
  );
}

function WhatsAppIcon() {
  // Official-style glyph scaled to fill the circle like FB / IG (old path looked tiny).
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5 fill-current"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2zm0 1.82c4.46 0 8.09 3.63 8.09 8.09 0 4.46-3.63 8.09-8.09 8.09-1.42 0-2.81-.37-4.03-1.07l-.29-.17-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.22-4.32c0-4.46 3.63-8.09 8.02-8.09zm4.52 10.52c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74 2.49 1.07 2.49.71 2.94.69.45-.03 1.45-.59 1.65-1.16.21-.57.21-1.06.14-1.16-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M24 12.07C24 5.41 18.63.04 11.97.04S0 5.41 0 12.07C0 18.08 4.39 23.05 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.56-4.7 1.32 0 2.7.24 2.7.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.26h3.34l-.53 3.49h-2.81V24C19.61 23.05 24 18.08 24 12.07z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.05.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.05.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.05-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.05-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.71-2.13 1.38S.93 3.35.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13s1.34 1.08 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.71 2.13-1.38s1.08-1.34 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.71-1.46-1.38-2.13S20.65.93 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
    </svg>
  );
}
