import { createHmac, timingSafeEqual } from "crypto";

/** Default link lifetime for guest bill download (WhatsApp / share). */
const SHARE_TTL_SECONDS = 72 * 60 * 60;

type Payload = { pid: string; exp: number };

export function getBookingBillShareSecret(): string | null {
  const dedicated = process.env.BOOKING_BILL_SHARE_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (fallback) return fallback;
  return null;
}

export function createBookingBillShareToken(paymentId: string): string | null {
  const secret = getBookingBillShareSecret();
  if (!secret) return null;

  const exp = Math.floor(Date.now() / 1000) + SHARE_TTL_SECONDS;
  const payloadStr = JSON.stringify({ pid: paymentId, exp } satisfies Payload);
  const payloadB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const sigB64 = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sigB64}`;
}

export function verifyBookingBillShareToken(token: string): string | null {
  const secret = getBookingBillShareSecret();
  if (!secret) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payloadB64 = token.slice(0, lastDot);
  const sigB64 = token.slice(lastDot + 1);
  if (!payloadB64 || !sigB64) return null;

  const expectedSigB64 = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  const a = Buffer.from(expectedSigB64, "utf8");
  const b = Buffer.from(sigB64, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: Payload;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed?.pid || typeof parsed.exp !== "number") return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

  return parsed.pid;
}

export function bookingBillShareTtlHours(): number {
  return SHARE_TTL_SECONDS / 3600;
}
