/**
 * GoogleBusinessProfileService — server-only Business Profile operations.
 *
 * Uses Google's current Business Profile API split (2026):
 * - Account Management API for accounts
 * - Business Information API for locations
 * - Google My Business API (v4 localPosts) for Update posts
 */
import {
  exchangeGoogleAuthCode,
  buildGoogleBusinessAuthUrl,
  getGoogleBusinessAccessToken,
} from "@/lib/google-business/auth";
import {
  GBP_API,
  buildAccountResourceName,
  buildLocationResourceName,
} from "@/lib/google-business/apis";
import {
  getGoogleBusinessOAuthConfig,
  getGoogleBusinessRuntimeConfig,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  type GoogleBusinessOAuthConfig,
  type GoogleBusinessRuntimeConfig,
} from "@/lib/google-business/config";
import { mapGoogleBusinessError, GoogleBusinessProfileError } from "@/lib/google-business/errors";
import {
  getGoogleBusinessSettings,
  saveGoogleBusinessSettings,
  type GoogleBusinessSettings,
} from "@/lib/google-business/settings";

export type GbpAccount = {
  accountId: string;
  accountName: string;
  /** Full resource name, e.g. accounts/123456789 */
  accountResourceName: string;
};

export type GbpLocation = {
  accountId: string;
  locationId: string;
  title: string;
  /** Full resource name, e.g. accounts/123/locations/456 */
  locationResourceName: string;
};

export type CreateLocalPostInput = {
  summary: string;
  languageCode?: string;
  callToActionUrl: string;
  imageUrl?: string;
  callToActionType?: "LEARN_MORE" | "BOOK" | "ORDER" | "SIGN_UP" | "CALL";
};

export type CreateLocalPostResult = {
  name: string;
  searchUrl?: string;
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
  let data: T & { error?: { message?: string; status?: string } };
  try {
    data = JSON.parse(text) as T & { error?: { message?: string; status?: string } };
  } catch {
    throw new GoogleBusinessProfileError(
      "invalid_response",
      mapGoogleBusinessError(`Google API invalid JSON (${res.status}): ${text.slice(0, 120)}`),
    );
  }
  if (!res.ok) {
    const msg = data?.error?.message ?? text.slice(0, 300) ?? `Google API ${res.status}`;
    throw new GoogleBusinessProfileError("api_error", mapGoogleBusinessError(msg));
  }
  return data;
}

async function withAccess<T>(
  config: GoogleBusinessOAuthConfig,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  try {
    const accessToken = await getGoogleBusinessAccessToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    });
    return await fn(accessToken);
  } catch (e) {
    throw new GoogleBusinessProfileError(
      "auth_error",
      mapGoogleBusinessError(e),
    );
  }
}

export const GoogleBusinessProfileService = {
  isOAuthConfigured(): boolean {
    return Boolean(getGoogleOAuthClientId() && getGoogleOAuthClientSecret());
  },

  buildConnectUrl(redirectUri: string, state: string): string {
    const clientId = getGoogleOAuthClientId();
    if (!clientId) {
      throw new GoogleBusinessProfileError(
        "not_configured",
        "Google Business Profile OAuth is not configured. Set GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET on Vercel.",
      );
    }
    return buildGoogleBusinessAuthUrl({ clientId, redirectUri, state });
  },

  async connectFromAuthCode(code: string, redirectUri: string): Promise<void> {
    const clientId = getGoogleOAuthClientId();
    const clientSecret = getGoogleOAuthClientSecret();
    if (!clientId || !clientSecret) {
      throw new GoogleBusinessProfileError("not_configured", "Google OAuth not configured.");
    }
    const tokens = await exchangeGoogleAuthCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
    await saveGoogleBusinessSettings({
      refreshToken: tokens.refreshToken,
      connectedAt: new Date().toISOString(),
      lastPostError: null,
    });
  },

  async disconnect(): Promise<void> {
    await saveGoogleBusinessSettings({
      refreshToken: "",
      accountId: "",
      locationId: "",
      accountResourceName: "",
      locationResourceName: "",
      locationTitle: "",
      connectedAt: null,
      enabled: false,
      lastPostError: null,
    });
  },

  async getSettings(): Promise<GoogleBusinessSettings> {
    return getGoogleBusinessSettings();
  },

  async getRuntimeConfig(): Promise<GoogleBusinessRuntimeConfig | null> {
    return getGoogleBusinessRuntimeConfig();
  },

  async getOAuthConfig(): Promise<GoogleBusinessOAuthConfig | null> {
    return getGoogleBusinessOAuthConfig();
  },

  async listAccounts(
    config: GoogleBusinessOAuthConfig,
  ): Promise<GbpAccount[]> {
    return withAccess(config, async (token) => {
      const data = await gbpFetch<{
        accounts?: { name?: string; accountName?: string }[];
      }>(token, GBP_API.accounts);

      const accounts = (data.accounts ?? []).map((a) => {
        const accountResourceName = String(a.name ?? "").trim();
        const accountId = accountResourceName.replace(/^accounts\//, "");
        return {
          accountId,
          accountName: String(a.accountName ?? accountId),
          accountResourceName: accountResourceName || buildAccountResourceName(accountId),
        };
      });

      if (accounts.length === 0) {
        throw new GoogleBusinessProfileError(
          "no_accounts",
          "Your Google account does not have access to any Business Profile accounts.",
        );
      }
      return accounts;
    });
  },

  async listLocations(
    config: GoogleBusinessOAuthConfig,
    accountId: string,
  ): Promise<GbpLocation[]> {
    return withAccess(config, async (token) => {
      const url = new URL(GBP_API.locations(accountId.replace(/^accounts\//, "")));
      url.searchParams.set("readMask", "name,title");
      url.searchParams.set("pageSize", "100");

      const data = await gbpFetch<{
        locations?: { name?: string; title?: string }[];
      }>(token, url.toString());

      const locations = (data.locations ?? []).map((loc) => {
        const locationResourceName = String(loc.name ?? "").trim();
        const parts = locationResourceName.split("/");
        const locationId = parts[parts.length - 1] ?? "";
        const accountFromResource = parts[1] ?? accountId.replace(/^accounts\//, "");
        return {
          accountId: accountFromResource,
          locationId,
          title: String(loc.title ?? locationId),
          locationResourceName:
            locationResourceName ||
            buildLocationResourceName(accountFromResource, locationId),
        };
      });

      if (locations.length === 0) {
        throw new GoogleBusinessProfileError(
          "no_locations",
          "No Business Profile locations found for this account.",
        );
      }
      return locations;
    });
  },

  async selectLocation(input: {
    accountId: string;
    locationId: string;
    locationTitle?: string;
    accountResourceName?: string;
    locationResourceName?: string;
  }): Promise<GoogleBusinessSettings> {
    const accountId = input.accountId.replace(/^accounts\//, "").trim();
    const locationId = input.locationId.replace(/^locations\//, "").split("/").pop() ?? "";
    if (!accountId || !locationId) {
      throw new GoogleBusinessProfileError(
        "invalid_location",
        "Account ID and Location ID are required.",
      );
    }
    return saveGoogleBusinessSettings({
      accountId,
      locationId,
      accountResourceName:
        input.accountResourceName?.trim() ||
        buildAccountResourceName(accountId),
      locationResourceName:
        input.locationResourceName?.trim() ||
        buildLocationResourceName(accountId, locationId),
      locationTitle: input.locationTitle?.trim() ?? "",
      lastPostError: null,
    });
  },

  /** Create a standard Update post on Google Business Profile. */
  async createPost(
    config: GoogleBusinessRuntimeConfig,
    input: CreateLocalPostInput,
  ): Promise<CreateLocalPostResult> {
    const summary = input.summary.trim();
    if (!summary) {
      throw new GoogleBusinessProfileError("invalid_post", "Post content is required.");
    }
    const ctaUrl = input.callToActionUrl.trim();
    if (!/^https:\/\//i.test(ctaUrl)) {
      throw new GoogleBusinessProfileError(
        "invalid_post",
        "Call-to-action URL must be a valid HTTPS link.",
      );
    }

    return withAccess(config, async (token) => {
      const body: Record<string, unknown> = {
        languageCode: input.languageCode ?? "en-IN",
        summary: summary.slice(0, 1500),
        topicType: "STANDARD",
        callToAction: {
          actionType: input.callToActionType ?? "LEARN_MORE",
          url: ctaUrl,
        },
      };

      const imageUrl = input.imageUrl?.trim();
      if (imageUrl && /^https:\/\//i.test(imageUrl)) {
        body.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];
      }

      const data = await gbpFetch<CreateLocalPostResult & { searchUrl?: string }>(
        token,
        GBP_API.localPosts(config.accountId, config.locationId),
        { method: "POST", body: JSON.stringify(body) },
      );

      return {
        name: String(data.name ?? ""),
        searchUrl: data.searchUrl,
      };
    });
  },

  async refreshAccessToken(
    config: GoogleBusinessOAuthConfig,
  ): Promise<string> {
    return getGoogleBusinessAccessToken(config);
  },
};
