import { createSign } from "crypto";
import { tryParseServiceAccountJson } from "@/lib/parse-service-account-json";

type TokenCache = { token: string; expiresAt: number };
let cache: TokenCache | null = null;

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(
  clientEmail: string,
  privateKey: string,
  scopes: string[],
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const segments = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(segments);
  signer.end();
  const sig = signer.sign(privateKey.replace(/\\n/g, "\n"));
  return `${segments}.${base64url(sig)}`;
}

/** Service account access token for GA4 + Search Console APIs. */
export async function getGoogleApiAccessToken(
  scopes: string[],
): Promise<string | null> {
  if (cache && cache.expiresAt > Date.now() + 60_000) {
    return cache.token;
  }

  const raw =
    process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;

  const parsed = tryParseServiceAccountJson(raw);
  if (!parsed.ok) return null;

  const jwt = signJwt(parsed.clientEmail, parsed.privateKey, scopes);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) return null;

  cache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}
