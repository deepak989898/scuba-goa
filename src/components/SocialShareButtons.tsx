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
  // Circle vs glyph: keep icons ~70% of button so they don’t look tiny in a large disc.
  const size = compact ? "h-10 w-10" : "h-11 w-11";
  const iconClass = compact ? "h-7 w-7" : "h-8 w-8";

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
        <WhatsAppIcon className={iconClass} />
      </a>
      <a
        href={fb}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size} bg-[#1877F2] hover:brightness-95`}
        aria-label={`Share ${title} on Facebook`}
        title="Share on Facebook (price in link preview)"
      >
        <FacebookIcon className={iconClass} />
      </a>
      <button
        type="button"
        onClick={shareToInstagram}
        className={`${base} ${size} bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:brightness-95`}
        aria-label={`Copy ${title} link with price and open Instagram`}
        title="Copies price + link, then opens Instagram."
      >
        <InstagramIcon className={iconClass} />
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

function WhatsAppIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`${className} fill-current`}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`${className} fill-current`}
    >
      <path d="M24 12.07C24 5.41 18.63.04 11.97.04S0 5.41 0 12.07C0 18.08 4.39 23.05 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.56-4.7 1.32 0 2.7.24 2.7.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.26h3.34l-.53 3.49h-2.81V24C19.61 23.05 24 18.08 24 12.07z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`${className} fill-current`}
    >
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.05.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.05.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.05-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.05-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.71-2.13 1.38S.93 3.35.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13s1.34 1.08 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.71 2.13-1.38s1.08-1.34 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.71-1.46-1.38-2.13S20.65.93 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
    </svg>
  );
}
