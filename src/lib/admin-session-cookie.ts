/**
 * Signed HttpOnly admin session cookie (Edge-safe verify for middleware).
 * Set via POST /api/admin/session after Firebase ID token + admins/{uid} check.
 */

export const ADMIN_SESSION_COOKIE = "__bsg_admin_session";
const MAX_AGE_SEC = 14 * 24 * 60 * 60;

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""
  );
}

function encodePayload(uid: string, exp: number): string {
  return `${uid}:${exp}`;
}

function decodePayload(raw: string): { uid: string; exp: number } | null {
  const sep = raw.lastIndexOf(":");
  if (sep <= 0) return null;
  const uid = raw.slice(0, sep);
  const exp = Number(raw.slice(sep + 1));
  if (!uid || !Number.isFinite(exp)) return null;
  return { uid, exp };
}

async function hmacSign(payload: string): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET or CRON_SECRET is not set");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return Buffer.from(sig).toString("base64url");
}

async function hmacVerify(payload: string, signature: string): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  try {
    const sigBytes = Buffer.from(signature, "base64url");
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

/** Create signed cookie value (Node / Edge). */
export async function createAdminSessionValue(uid: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = encodePayload(uid, exp);
  const sig = await hmacSign(payload);
  const body = Buffer.from(payload, "utf8").toString("base64url");
  return `${body}.${sig}`;
}

export function adminSessionCookieOptions(): {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
} {
  return {
    maxAge: MAX_AGE_SEC,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

/** Verify signed cookie (middleware / API). */
export async function verifyAdminSessionValue(
  value: string | undefined | null,
): Promise<{ uid: string } | null> {
  if (!value?.trim() || !sessionSecret()) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let payloadRaw: string;
  try {
    payloadRaw = Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const ok = await hmacVerify(payloadRaw, sig);
  if (!ok) return null;

  const parsed = decodePayload(payloadRaw);
  if (!parsed) return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return { uid: parsed.uid };
}
