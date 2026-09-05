import { getGoogleBusinessAccessToken } from "@/lib/google-business/auth";
import {
  getYouTubeClientId,
  getYouTubeClientSecret,
} from "@/lib/social-media/youtube/config";
import {
  getYouTubeSettings,
  saveYouTubeSettings,
} from "@/lib/social-media/youtube/settings";

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getYouTubeClientId(),
      client_secret: getYouTubeClientSecret(),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as {
    refresh_token?: string;
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !data.refresh_token) {
    throw new Error(
      data.error_description ?? data.error ?? "YouTube OAuth exchange failed",
    );
  }
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token ?? "",
  };
}

export async function fetchYouTubeChannel(refreshToken: string) {
  const accessToken = await getGoogleBusinessAccessToken({
    clientId: getYouTubeClientId(),
    clientSecret: getYouTubeClientSecret(),
    refreshToken,
  });
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    items?: Array<{ id?: string; snippet?: { title?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok || !data.items?.[0]?.id) {
    throw new Error(data.error?.message ?? "No YouTube channel found on this account");
  }
  const item = data.items[0]!;
  return {
    channelId: String(item.id ?? ""),
    channelTitle: String(item.snippet?.title ?? ""),
  };
}

export async function connectYouTubeFromCode(
  code: string,
  redirectUri: string,
): Promise<void> {
  const tokens = await exchangeYouTubeCode(code, redirectUri);
  const channel = await fetchYouTubeChannel(tokens.refreshToken);
  await saveYouTubeSettings({
    refreshToken: tokens.refreshToken,
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    connectedAt: new Date().toISOString(),
    lastPostError: null,
  });
}

/** YouTube Community posts are not available via public API — log share kit for admin. */
export async function prepareYouTubeShare(
  title: string,
  url: string,
): Promise<{ message: string }> {
  const settings = await getYouTubeSettings();
  if (!settings.refreshToken || !settings.channelId) {
    return { message: "YouTube channel not connected" };
  }
  const now = new Date().toISOString();
  await saveYouTubeSettings({
    lastPostAt: now,
    lastPostError: null,
  });
  return {
    message: `Share on YouTube Community (manual): ${title} — ${url}`,
  };
}
