import { createHash } from "crypto";

export const ANALYTICS_DATA_VERSION = 2;

export function hashIp(ip: string, secret: string): string {
  if (!ip || !secret) return "";
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex").slice(0, 32);
}

/** Best-effort client IP from trusted platform headers only. */
export function clientIpFromHeaders(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  // Last resort: first hop of x-forwarded-for (Vercel sets this)
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || "";
}

export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
