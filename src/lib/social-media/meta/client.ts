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
    throw new Error(createData.error?.message ?? "Instagram media create failed");
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
    throw new Error(publishData.error?.message ?? "Instagram publish failed");
  }
  return publishData.id;
}
