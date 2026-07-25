import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { canEncryptSecrets, decryptSecret, encryptSecret } from "./crypto";
import {
  getGscOAuthClientId,
  getGscOAuthClientSecret,
  gscOAuthConfigured,
  refreshGscAccessToken,
} from "./oauth";
import type { GoogleGscConnection } from "./types";
import { getSeoSettings } from "./settings";

const COL = "googleConnections";
const DOC = "gsc";

export function defaultGscConnection(): GoogleGscConnection {
  return {
    id: "gsc",
    connected: false,
    propertyUri: null,
    refreshTokenEnc: null,
    connectedAt: null,
    connectedByUid: null,
    lastError: null,
    lastHealthCheckAt: null,
    healthOk: false,
    scopes: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function getGscConnection(): Promise<GoogleGscConnection> {
  const db = getAdminDb();
  const defaults = defaultGscConnection();
  if (!db) return defaults;
  try {
    const snap = await db.collection(COL).doc(DOC).get();
    if (!snap.exists) return defaults;
    return { ...defaults, ...(snap.data() as Partial<GoogleGscConnection>), id: "gsc" };
  } catch {
    return defaults;
  }
}

/** Public-safe connection status (no tokens). */
export async function getGscConnectionPublic() {
  const conn = await getGscConnection();
  const settings = await getSeoSettings();
  return {
    oauthConfigured: gscOAuthConfigured(),
    encryptionConfigured: canEncryptSecrets(),
    connected: conn.connected && Boolean(conn.refreshTokenEnc),
    propertyUri: conn.propertyUri || settings.propertyUri,
    connectedAt: conn.connectedAt,
    healthOk: conn.healthOk,
    lastError: conn.lastError,
    lastHealthCheckAt: conn.lastHealthCheckAt,
    serviceAccountFallback: Boolean(
      process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON?.trim() ||
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim(),
    ),
  };
}

export async function saveGscConnection(
  patch: Partial<GoogleGscConnection>,
): Promise<GoogleGscConnection> {
  const db = getAdminDb();
  const current = await getGscConnection();
  const next: GoogleGscConnection = {
    ...current,
    ...patch,
    id: "gsc",
    updatedAt: new Date().toISOString(),
  };
  if (db) {
    await db.collection(COL).doc(DOC).set(stripUndefinedDeep(next), { merge: true });
  }
  return next;
}

export async function storeGscRefreshToken(input: {
  refreshToken: string;
  adminUid: string;
  propertyUri?: string;
}): Promise<GoogleGscConnection> {
  if (!canEncryptSecrets()) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY is required (min 16 chars) to store OAuth refresh tokens",
    );
  }
  const enc = encryptSecret(input.refreshToken);
  if (!enc) throw new Error("Failed to encrypt refresh token");
  return saveGscConnection({
    connected: true,
    refreshTokenEnc: enc,
    connectedAt: new Date().toISOString(),
    connectedByUid: input.adminUid,
    propertyUri: input.propertyUri ?? null,
    lastError: null,
    healthOk: true,
    lastHealthCheckAt: new Date().toISOString(),
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/webmasters",
    ],
  });
}

export async function disconnectGsc(): Promise<void> {
  await saveGscConnection({
    connected: false,
    refreshTokenEnc: null,
    healthOk: false,
    lastError: null,
    connectedAt: null,
    connectedByUid: null,
  });
}

/**
 * Prefer OAuth refresh token; fall back to service-account JWT (readonly analytics).
 * Write operations (sitemap submit) require OAuth.
 */
export async function getGscAccessToken(options?: {
  requireWrite?: boolean;
}): Promise<
  | { ok: true; token: string; source: "oauth" | "service_account" }
  | { ok: false; error: string }
> {
  const conn = await getGscConnection();
  if (conn.refreshTokenEnc) {
    const refresh = decryptSecret(conn.refreshTokenEnc);
    const clientId = getGscOAuthClientId();
    const clientSecret = getGscOAuthClientSecret();
    if (refresh && clientId && clientSecret) {
      try {
        const token = await refreshGscAccessToken({
          clientId,
          clientSecret,
          refreshToken: refresh,
        });
        await saveGscConnection({
          healthOk: true,
          lastError: null,
          lastHealthCheckAt: new Date().toISOString(),
        });
        return { ok: true, token, source: "oauth" };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "OAuth refresh failed";
        await saveGscConnection({
          healthOk: false,
          lastError: msg,
          lastHealthCheckAt: new Date().toISOString(),
        });
        if (options?.requireWrite) return { ok: false, error: msg };
      }
    }
  }

  if (options?.requireWrite) {
    return {
      ok: false,
      error:
        "Connect Google Search Console via OAuth in admin to submit sitemaps / inspect URLs with write scopes",
    };
  }

  // Service account fallback (existing project pattern)
  const { getGoogleApiAccessToken } = await import(
    "@/lib/ai-analytics/connectors/google-auth"
  );
  const token = await getGoogleApiAccessToken(
    ["https://www.googleapis.com/auth/webmasters.readonly"],
    "search-console",
  );
  if (!token) {
    return {
      ok: false,
      error:
        "No GSC OAuth connection and service account token unavailable. Connect OAuth or set GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON.",
    };
  }
  return { ok: true, token, source: "service_account" };
}
