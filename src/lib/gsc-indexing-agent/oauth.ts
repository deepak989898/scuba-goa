import { SITE_URL } from "@/lib/constants";

const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/webmasters",
].join(" ");

export function getGscOAuthClientId(): string {
  return (
    process.env.GOOGLE_GSC_CLIENT_ID?.trim() ||
    process.env.GOOGLE_BUSINESS_CLIENT_ID?.trim() ||
    ""
  );
}

export function getGscOAuthClientSecret(): string {
  return (
    process.env.GOOGLE_GSC_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_BUSINESS_CLIENT_SECRET?.trim() ||
    ""
  );
}

export function getGscOAuthRedirectUri(siteUrl = SITE_URL): string {
  const override = process.env.GOOGLE_GSC_REDIRECT_URI?.trim();
  if (override) return override;
  return `${siteUrl.replace(/\/$/, "")}/api/admin/gsc-agent/oauth-callback`;
}

export function gscOAuthConfigured(): boolean {
  return Boolean(getGscOAuthClientId() && getGscOAuthClientSecret());
}

export function buildGscAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GSC_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: input.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGscAuthCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ refreshToken: string; accessToken: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as {
    refresh_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.refresh_token) {
    throw new Error(
      data.error_description ?? data.error ?? `OAuth exchange failed (${res.status})`,
    );
  }
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token ?? "",
  };
}

export async function refreshGscAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? `Token refresh failed (${res.status})`,
    );
  }
  return data.access_token;
}
