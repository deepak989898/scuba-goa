import { createSign } from "crypto";
import { tryParseServiceAccountJson } from "@/lib/parse-service-account-json";

type TokenCache = { token: string; expiresAt: number };
type CredentialPurpose = "analytics" | "search-console";
const tokenCache = new Map<string, TokenCache>();

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
  purpose: CredentialPurpose = "analytics",
): Promise<string | null> {
  const raw = getCredentialRaw(purpose);
  if (!raw) return null;

  const parsed = tryParseServiceAccountJson(raw);
  if (!parsed.ok) return null;

  const cacheKey = `${parsed.clientEmail}|${[...scopes].sort().join(" ")}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

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

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  return data.access_token;
}

function getCredentialRaw(purpose: CredentialPurpose): string {
  if (purpose === "search-console") {
    return (
      process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim() ||
      process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON?.trim() ||
      ""
    );
  }

  return (
    process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim() ||
    ""
  );
}

/** Safe diagnostic identity; never returns the private key. */
export function getGoogleServiceAccountEmail(
  purpose: CredentialPurpose,
): string | null {
  const raw = getCredentialRaw(purpose);
  if (!raw) return null;
  const parsed = tryParseServiceAccountJson(raw);
  return parsed.ok ? parsed.clientEmail : null;
}
