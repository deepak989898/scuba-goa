import { isBusinessTelHref, isBusinessWhatsAppHref } from "@/lib/constants";

/** Build-time `NEXT_PUBLIC_META_PIXEL_ID` (Meta’s numeric Pixel ID, no spaces). */
export function readMetaPixelIdFromEnv(): string {
  return (process.env.NEXT_PUBLIC_META_PIXEL_ID || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
}

/**
 * Meta (Facebook) Pixel — browser events for Ads + Custom Conversions.
 *
 * In Events Manager → Custom conversions, create rules such as:
 * - Event = Purchase → paid bookings (optimize for this after enough volume).
 * - Custom event name = WhatsAppClick → taps that open your wa.me line.
 * - Custom event name = PhoneCallClick → taps on your business tel: links.
 */

function fbq(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === "undefined") return undefined;
  return typeof window.fbq === "function" ? window.fbq : undefined;
}

export function trackMetaPurchase(payload: {
  valueInr: number;
  numItems: number;
  contentIds: string[];
  contentName?: string;
}): void {
  const f = fbq();
  if (!f) return;
  try {
    f("track", "Purchase", {
      value: payload.valueInr,
      currency: "INR",
      content_ids: payload.contentIds.slice(0, 10),
      content_type: "product",
      num_items: payload.numItems,
      ...(payload.contentName
        ? { content_name: payload.contentName.slice(0, 120) }
        : {}),
    });
  } catch {
    /* blocked / privacy */
  }
}

export function trackMetaWhatsAppClick(extra?: Record<string, string>): void {
  const f = fbq();
  if (!f) return;
  try {
    f("trackCustom", "WhatsAppClick", {
      content_name:
        typeof document !== "undefined" ? document.title.slice(0, 120) : "",
      ...extra,
    });
  } catch {
    /* ignore */
  }
}

export function trackMetaPhoneCallClick(): void {
  const f = fbq();
  if (!f) return;
  try {
    f("trackCustom", "PhoneCallClick", {
      content_name:
        typeof document !== "undefined" ? document.title.slice(0, 120) : "",
    });
  } catch {
    /* ignore */
  }
}

/** Used by document-level click capture (sticky bar, footer, etc.). */
export function classifyMetaOutboundHref(href: string): "whatsapp" | "call" | null {
  if (isBusinessWhatsAppHref(href)) return "whatsapp";
  if (isBusinessTelHref(href)) return "call";
  return null;
}
