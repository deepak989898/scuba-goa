import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaOAuthRedirectUri,
} from "@/lib/social-media/meta/config";
import { saveMetaSettings } from "@/lib/social-media/meta/settings";

type TokenJson = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
};

export async function exchangeMetaCode(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  const redirectUri = getMetaOAuthRedirectUri();
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString());
  const data = (await res.json()) as TokenJson;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Meta OAuth exchange failed");
  }
  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in ?? 3600),
  };
}

export async function exchangeMetaLongLivedToken(
  shortToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as TokenJson;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Meta long-lived token failed");
  }
  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in ?? 5184000),
  };
}

export type MetaPageOption = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessId: string;
  instagramUsername: string;
};

export async function listMetaPages(
  userAccessToken: string,
): Promise<MetaPageOption[]> {
  const url = new URL("https://graph.facebook.com/v21.0/me/accounts");
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}",
  );
  url.searchParams.set("access_token", userAccessToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: { id?: string; username?: string };
    }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? "Could not list Facebook pages");
  }

  return (data.data ?? []).map((p) => ({
    pageId: String(p.id ?? ""),
    pageName: String(p.name ?? ""),
    pageAccessToken: String(p.access_token ?? ""),
    instagramBusinessId: String(p.instagram_business_account?.id ?? ""),
    instagramUsername: String(p.instagram_business_account?.username ?? ""),
  }));
}

export async function saveMetaUserToken(shortToken: string): Promise<void> {
  const long = await exchangeMetaLongLivedToken(shortToken);
  const expiresAt = new Date(
    Date.now() + long.expiresIn * 1000,
  ).toISOString();
  await saveMetaSettings({
    userAccessToken: long.accessToken,
    tokenExpiresAt: expiresAt,
    connectedAt: new Date().toISOString(),
    lastPostError: null,
  });
}

export async function postToFacebookPage(input: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  link: string;
}): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${input.pageId}/feed`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      link: input.link,
      access_token: input.pageAccessToken,
    }),
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message ?? "Facebook post failed");
  }
  return data.id;
}

export async function postVideoToFacebookPage(input: {
  pageId: string;
  pageAccessToken: string;
  videoUrl: string;
  description: string;
}): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${input.pageId}/videos`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_url: input.videoUrl,
      description: input.description.slice(0, 5000),
      access_token: input.pageAccessToken,
    }),
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message ?? "Facebook video post failed");
  }
  return data.id;
}

type MetaApiError = {
  message?: string;
  error_user_msg?: string;
  error_subcode?: number;
  code?: number;
};

function formatMetaError(data: { error?: MetaApiError }): string {
  const e = data.error;
  if (!e) return "Meta API error";
  const msg = e.error_user_msg || e.message || "Meta API error";
  if (e.error_subcode) return `${msg} (subcode ${e.error_subcode})`;
  return msg;
}

async function waitForInstagramMediaReady(
  containerId: string,
  pageAccessToken: string,
  maxWaitMs = 120_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const statusUrl = new URL(`https://graph.facebook.com/v21.0/${containerId}`);
    statusUrl.searchParams.set("fields", "status_code,status");
    statusUrl.searchParams.set("access_token", pageAccessToken);

    const res = await fetch(statusUrl.toString());
    const data = (await res.json()) as {
      status_code?: string;
      status?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(formatMetaError(data));
    }
    const code = String(data.status_code ?? "").toUpperCase();
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(data.status ?? "Instagram video processing failed");
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Instagram video processing timed out — try again in a minute");
}

export async function postToInstagram(input: {
  instagramBusinessId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<string> {
  const createUrl = `https://graph.facebook.com/v21.0/${input.instagramBusinessId}/media`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: input.imageUrl,
      caption: input.caption.slice(0, 2200),
      access_token: input.pageAccessToken,
    }),
  });
  const createData = (await createRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!createRes.ok || !createData.id) {
    throw new Error(formatMetaError(createData));
  }

  const publishUrl = `https://graph.facebook.com/v21.0/${input.instagramBusinessId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: createData.id,
      access_token: input.pageAccessToken,
    }),
  });
  const publishData = (await publishRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!publishRes.ok || !publishData.id) {
    throw new Error(formatMetaError(publishData));
  }
  return publishData.id;
}

export async function postVideoToInstagram(input: {
  instagramBusinessId: string;
  pageAccessToken: string;
  videoUrl: string;
  caption: string;
  /** @deprecated Instagram API requires REELS for all video — kept for callers */
  isReel?: boolean;
  coverUrl?: string;
}): Promise<string> {
  const createUrl = `https://graph.facebook.com/v21.0/${input.instagramBusinessId}/media`;

  // Instagram no longer accepts media_type=VIDEO for standalone posts — use REELS + share_to_feed.
  const createBody: Record<string, string | boolean> = {
    media_type: "REELS",
    video_url: input.videoUrl,
    caption: input.caption.slice(0, 2200),
    share_to_feed: true,
    access_token: input.pageAccessToken,
  };
  const cover = input.coverUrl?.trim();
  if (cover && /^https:\/\//i.test(cover)) {
    createBody.cover_url = cover;
  }

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });
  const createData = (await createRes.json()) as {
    id?: string;
    error?: MetaApiError;
  };
  if (!createRes.ok || !createData.id) {
    throw new Error(formatMetaError(createData));
  }

  await waitForInstagramMediaReady(createData.id, input.pageAccessToken);

  const publishUrl = `https://graph.facebook.com/v21.0/${input.instagramBusinessId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: createData.id,
      access_token: input.pageAccessToken,
    }),
  });
  const publishData = (await publishRes.json()) as {
    id?: string;
    error?: MetaApiError;
  };
  if (!publishRes.ok || !publishData.id) {
    throw new Error(formatMetaError(publishData));
  }
  return publishData.id;
}
