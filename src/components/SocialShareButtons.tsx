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
  const p = path.startsWith("/") ? path : `/${path}`;
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${p}`
      : `${SITE_URL.replace(/\/$/, "")}${p}`;
  const text = `${title} | ${SITE_NAME}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function copyForInstagram() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  const base =
    "rounded-full border border-ocean-200 bg-white font-semibold text-ocean-700 hover:bg-ocean-50 active:bg-ocean-100";
  const size = compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size}`}
        aria-label={`Share ${title} on WhatsApp`}
      >
        WhatsApp
      </a>
      <a
        href={fb}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size}`}
        aria-label={`Share ${title} on Facebook`}
      >
        Facebook
      </a>
      <button
        type="button"
        onClick={copyForInstagram}
        className={`${base} ${size}`}
        aria-label={`Copy ${title} link for Instagram`}
        title="Instagram direct share is limited on web, so this copies the link."
      >
        {copied ? "Copied" : "Instagram"}
      </button>
    </div>
  );
}

