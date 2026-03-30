"use client";

import { useState } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

type Props = {
  title: string;
  path: string;
  className?: string;
  compact?: boolean;
};

export function SocialShareButtons({
  title,
  path,
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
  const text = `${title} | ${SITE_NAME}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function shareToInstagram() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
    setIgHint(true);
    window.setTimeout(() => setIgHint(false), 3000);
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

  const base = "inline-flex items-center gap-1.5 rounded-full font-semibold text-white";
  const size = compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`} role="group" aria-label={`Share ${title}`}>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size} bg-[#25D366] hover:brightness-95`}
        aria-label={`Share ${title} on WhatsApp`}
      >
        <WhatsAppIcon />
        <span>WhatsApp</span>
      </a>
      <a
        href={fb}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size} bg-[#1877F2] hover:brightness-95`}
        aria-label={`Share ${title} on Facebook`}
      >
        <FacebookIcon />
        <span>Facebook</span>
      </a>
      <button
        type="button"
        onClick={shareToInstagram}
        className={`${base} ${size} bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:brightness-95`}
        aria-label={`Copy ${title} link and open Instagram`}
        title="Copies link and opens Instagram."
      >
        <InstagramIcon />
        <span>{copied ? "Copied" : "Instagram"}</span>
      </button>
      {igHint ? (
        <span className="text-[10px] text-ocean-600">
          Link copied. Paste it in your Instagram story/bio/DM.
        </span>
      ) : null}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
      <path d="M20.5 3.5A11 11 0 0 0 3.6 17.1L2 22l5-1.5A11 11 0 1 0 20.5 3.5Zm-8.6 17a9 9 0 0 1-4.6-1.3l-.3-.2-3 .9.9-2.9-.2-.3a9 9 0 1 1 7.2 3.8Zm5-6.8c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a7.6 7.6 0 0 1-3.8-3.3c-.2-.3 0-.5.2-.7l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.5L8.7 6.5c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.2 5.3 5.3 0 0 0 1.1 2.8 12 12 0 0 0 4.7 4.1c2.8 1.2 2.8.8 3.3.8s1.8-.7 2-1.4.2-1.3.2-1.4-.2-.2-.5-.3Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
      <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.3c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5H14v8.4A12 12 0 0 0 24 12Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
      <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.1 0 1.8.2 2.3.4.6.2 1 .5 1.5.9s.7.9.9 1.5c.2.5.4 1.2.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c0 1.1-.2 1.8-.4 2.3-.2.6-.5 1-.9 1.5s-.9.7-1.5.9c-.5.2-1.2.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.1 0-1.8-.2-2.3-.4-.6-.2-1-.5-1.5-.9s-.7-.9-.9-1.5c-.2-.5-.4-1.2-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c0-1.1.2-1.8.4-2.3.2-.6.5-1 .9-1.5s.9-.7 1.5-.9c.5-.2 1.2-.4 2.3-.4 1.2-.1 1.6-.1 4.8-.1Zm0 2.1c-3.2 0-3.5 0-4.7.1-.8 0-1.2.2-1.5.3-.4.2-.7.3-1 .6-.3.3-.4.6-.6 1-.1.3-.3.7-.3 1.5-.1 1.2-.1 1.5-.1 4.7s0 3.5.1 4.7c0 .8.2 1.2.3 1.5.2.4.3.7.6 1 .3.3.6.4 1 .6.3.1.7.3 1.5.3 1.2.1 1.5.1 4.7.1s3.5 0 4.7-.1c.8 0 1.2-.2 1.5-.3.4-.2.7-.3 1-.6.3-.3.4-.6.6-1 .1-.3.3-.7.3-1.5.1-1.2.1-1.5.1-4.7s0-3.5-.1-4.7c0-.8-.2-1.2-.3-1.5-.2-.4-.3-.7-.6-1-.3-.3-.6-.4-1-.6-.3-.1-.7-.3-1.5-.3-1.2-.1-1.5-.1-4.7-.1Zm0 3.6A4.1 4.1 0 1 1 7.9 12 4.1 4.1 0 0 1 12 7.9Zm0 6.8a2.7 2.7 0 1 0-2.7-2.7 2.7 2.7 0 0 0 2.7 2.7Zm5.2-7.9a1 1 0 1 1-1-1 1 1 0 0 1 1 1Z" />
    </svg>
  );
}

