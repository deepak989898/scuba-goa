import { SITE_URL } from "@/lib/constants";

export function getYouTubeClientId(): string {
  return (
    process.env.GOOGLE_YOUTUBE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_BUSINESS_CLIENT_ID?.trim() ||
    ""
  );
}

export function getYouTubeClientSecret(): string {
  return (
    process.env.GOOGLE_YOUTUBE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_BUSINESS_CLIENT_SECRET?.trim() ||
    ""
  );
}

export function getYouTubeOAuthRedirectUri(): string {
  return `${SITE_URL.replace(/\/$/, "")}/api/admin/social-media/youtube/oauth-callback`;
}

export function isYouTubeConfigured(): boolean {
  return Boolean(getYouTubeClientId() && getYouTubeClientSecret());
}

export function buildYouTubeAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: input.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
