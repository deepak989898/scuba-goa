import { getGoogleBusinessAccessToken } from "@/lib/google-business/auth";
import type { GoogleBusinessRuntimeConfig } from "@/lib/google-business/config";

export type GbpLocation = {
  accountId: string;
  locationId: string;
  title: string;
};

async function gbpFetch<T>(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: T & { error?: { message?: string } };
  try {
    data = JSON.parse(text) as T & { error?: { message?: string } };
  } catch {
    throw new Error(`Google API invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg =
      data?.error?.message ?? text.slice(0, 300) ?? `Google API ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function withGoogleBusinessAccess<T>(
  config: GoogleBusinessRuntimeConfig,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const accessToken = await getGoogleBusinessAccessToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken,
  });
  return fn(accessToken);
}

/** List GBP accounts the signed-in user can manage. */
export async function listGoogleBusinessAccounts(
  config: GoogleBusinessRuntimeConfig,
): Promise<{ accountId: string; accountName: string }[]> {
  return withGoogleBusinessAccess(config, async (token) => {
    const data = await gbpFetch<{
      accounts?: { name?: string; accountName?: string }[];
    }>(
      token,
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    );
    return (data.accounts ?? []).map((a) => {
      const name = String(a.name ?? "");
      const accountId = name.replace(/^accounts\//, "");
      return {
        accountId,
        accountName: String(a.accountName ?? accountId),
      };
    });
  });
}

/** List locations for an account. */
export async function listGoogleBusinessLocations(
  config: GoogleBusinessRuntimeConfig,
  accountId: string,
): Promise<GbpLocation[]> {
  return withGoogleBusinessAccess(config, async (token) => {
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
    );
    url.searchParams.set("readMask", "name,title");
    url.searchParams.set("pageSize", "100");

    const data = await gbpFetch<{
      locations?: { name?: string; title?: string }[];
    }>(token, url.toString());

    return (data.locations ?? []).map((loc) => {
      const name = String(loc.name ?? "");
      const parts = name.split("/");
      const locationId = parts[parts.length - 1] ?? "";
      return {
        accountId,
        locationId,
        title: String(loc.title ?? locationId),
      };
    });
  });
}

export type CreateLocalPostInput = {
  summary: string;
  languageCode?: string;
  callToActionUrl: string;
  imageUrl?: string;
};

export type CreateLocalPostResult = {
  name: string;
  searchUrl?: string;
};

/** Create a standard “Update” post on Google Business Profile. */
export async function createGoogleBusinessLocalPost(
  config: GoogleBusinessRuntimeConfig,
  input: CreateLocalPostInput,
): Promise<CreateLocalPostResult> {
  return withGoogleBusinessAccess(config, async (token) => {
    const parent = `accounts/${config.accountId}/locations/${config.locationId}`;
    const body: Record<string, unknown> = {
      languageCode: input.languageCode ?? "en-IN",
      summary: input.summary.slice(0, 1500),
      topicType: "STANDARD",
      callToAction: {
        actionType: "LEARN_MORE",
        url: input.callToActionUrl,
      },
    };

    const imageUrl = input.imageUrl?.trim();
    if (imageUrl && /^https:\/\//i.test(imageUrl)) {
      body.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];
    }

    const data = await gbpFetch<CreateLocalPostResult & { searchUrl?: string }>(
      token,
      `https://mybusiness.googleapis.com/v4/${parent}/localPosts`,
      { method: "POST", body: JSON.stringify(body) },
    );

    return {
      name: String(data.name ?? ""),
      searchUrl: data.searchUrl,
    };
  });
}
