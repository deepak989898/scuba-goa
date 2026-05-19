import {
  getGoogleBusinessSettings,
  type GoogleBusinessSettings,
} from "@/lib/google-business/settings";

/** OAuth only — enough to list accounts/locations. */
export type GoogleBusinessOAuthConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

/** Full config — required to create posts. */
export type GoogleBusinessRuntimeConfig = GoogleBusinessOAuthConfig & {
  accountId: string;
  locationId: string;
  enabled: boolean;
};

export function getGoogleOAuthClientId(): string {
  return process.env.GOOGLE_BUSINESS_CLIENT_ID?.trim() ?? "";
}

export function getGoogleOAuthClientSecret(): string {
  return process.env.GOOGLE_BUSINESS_CLIENT_SECRET?.trim() ?? "";
}

export function getGoogleOAuthRedirectUri(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/admin/google-business/oauth-callback`;
}

/** Client credentials + refresh token (no location required). */
export async function getGoogleBusinessOAuthConfig(): Promise<GoogleBusinessOAuthConfig | null> {
  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) return null;

  const settings = await getGoogleBusinessSettings();
  const refreshToken =
    process.env.GOOGLE_BUSINESS_REFRESH_TOKEN?.trim() ||
    settings.refreshToken;

  if (!refreshToken) return null;

  return { clientId, clientSecret, refreshToken };
}

/** Merges env vars with Firestore settings — needs account + location for posting. */
export async function getGoogleBusinessRuntimeConfig(): Promise<GoogleBusinessRuntimeConfig | null> {
  const oauth = await getGoogleBusinessOAuthConfig();
  if (!oauth) return null;

  const settings = await getGoogleBusinessSettings();
  const accountId =
    process.env.GOOGLE_BUSINESS_ACCOUNT_ID?.trim() || settings.accountId;
  const locationId =
    process.env.GOOGLE_BUSINESS_LOCATION_ID?.trim() || settings.locationId;

  if (!accountId || !locationId) return null;

  return {
    ...oauth,
    accountId,
    locationId,
    enabled: settings.enabled,
  };
}

export function describeGoogleBusinessOAuthGap(): string {
  if (!getGoogleOAuthClientId() || !getGoogleOAuthClientSecret()) {
    return "Add GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET in Vercel, then redeploy.";
  }
  return "Click Connect Google account again (refresh token missing). Use the same Gmail you added as a Test user.";
}

export function isGoogleBusinessPostingEnabled(
  settings: GoogleBusinessSettings,
  runtime: GoogleBusinessRuntimeConfig | null,
): boolean {
  if (!runtime) return false;
  return settings.enabled === true;
}
