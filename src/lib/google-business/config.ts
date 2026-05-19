import {
  getGoogleBusinessSettings,
  type GoogleBusinessSettings,
} from "@/lib/google-business/settings";

export type GoogleBusinessRuntimeConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
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

/** Merges env vars with Firestore settings (env refresh token overrides). */
export async function getGoogleBusinessRuntimeConfig(): Promise<GoogleBusinessRuntimeConfig | null> {
  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) return null;

  const settings = await getGoogleBusinessSettings();
  const refreshToken =
    process.env.GOOGLE_BUSINESS_REFRESH_TOKEN?.trim() ||
    settings.refreshToken;
  const accountId =
    process.env.GOOGLE_BUSINESS_ACCOUNT_ID?.trim() || settings.accountId;
  const locationId =
    process.env.GOOGLE_BUSINESS_LOCATION_ID?.trim() || settings.locationId;

  if (!refreshToken || !accountId || !locationId) return null;

  return {
    clientId,
    clientSecret,
    refreshToken,
    accountId,
    locationId,
    enabled: settings.enabled,
  };
}

export function isGoogleBusinessPostingEnabled(
  settings: GoogleBusinessSettings,
  runtime: GoogleBusinessRuntimeConfig | null,
): boolean {
  if (!runtime) return false;
  return settings.enabled === true;
}
