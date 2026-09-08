/**
 * Google Business Profile API surface (2026).
 *
 * Google splits Business Profile into multiple products in Cloud Console:
 *
 * | Operation              | GCP API name                         | Host |
 * |------------------------|--------------------------------------|------|
 * | List accounts          | My Business Account Management API   | mybusinessaccountmanagement.googleapis.com |
 * | List/read locations    | My Business Business Information API | mybusinessbusinessinformation.googleapis.com |
 * | Create local posts     | Google My Business API               | mybusiness.googleapis.com |
 *
 * Local posts are still created via the v4 `localPosts` resource on
 * `mybusiness.googleapis.com`. That is the current supported posts API —
 * not a deprecated tutorial endpoint. It must be enabled separately from
 * Account Management and Business Information.
 *
 * @see https://developers.google.com/my-business/content/overview
 */

export const GBP_OAUTH_SCOPE = "https://www.googleapis.com/auth/business.manage";

export const GBP_API = {
  accounts: "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
  locations: (accountId: string) =>
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
  localPosts: (accountId: string, locationId: string) =>
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`,
} as const;

export const GBP_REQUIRED_CLOUD_APIS = [
  {
    id: "mybusinessaccountmanagement.googleapis.com",
    consoleName: "My Business Account Management API",
    usedFor: "List Business Profile accounts after OAuth",
  },
  {
    id: "mybusinessbusinessinformation.googleapis.com",
    consoleName: "My Business Business Information API",
    usedFor: "List locations for an account",
  },
  {
    id: "mybusiness.googleapis.com",
    consoleName: "Google My Business API",
    usedFor: "Create Update / local posts (required for auto-posting)",
  },
] as const;

export function buildAccountResourceName(accountId: string): string {
  const id = accountId.replace(/^accounts\//, "").trim();
  return `accounts/${id}`;
}

export function buildLocationResourceName(
  accountId: string,
  locationId: string,
): string {
  const a = accountId.replace(/^accounts\//, "").trim();
  const l = locationId.replace(/^locations\//, "").split("/").pop() ?? locationId;
  return `accounts/${a}/locations/${l}`;
}
