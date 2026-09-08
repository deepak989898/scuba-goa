import { GBP_REQUIRED_CLOUD_APIS } from "@/lib/google-business/apis";

/** Map raw Google API / OAuth errors to admin-safe messages (no tokens). */
export function mapGoogleBusinessError(raw: unknown): string {
  const message =
    raw instanceof Error ? raw.message : String(raw ?? "Unknown error");

  if (/invalid_client|client secret is invalid/i.test(message)) {
    return "Google OAuth client secret is invalid. Copy a fresh Client secret from Google Cloud → Credentials and update GOOGLE_BUSINESS_CLIENT_SECRET on Vercel, then redeploy.";
  }

  if (/redirect_uri_mismatch/i.test(message)) {
    return "OAuth redirect URI mismatch. Add https://bookscubagoa.com/api/admin/google-business/oauth-callback to your Google OAuth client's Authorized redirect URIs.";
  }

  if (/access_denied|consent/i.test(message)) {
    return "Google authorization was denied. Sign in with the Google account that manages your Business Profile and approve all permissions.";
  }

  if (/invalid_grant|revoked|expired/i.test(message)) {
    return "Google authorization has expired or was revoked. Disconnect and connect your Google account again in Admin.";
  }

  if (/mybusiness\.googleapis\.com.*not been used|mybusiness\.googleapis\.com.*disabled/i.test(message)) {
    return `Required API "${GBP_REQUIRED_CLOUD_APIS[2].consoleName}" is not enabled. Open Google Cloud Console → APIs & Services → Library → enable "${GBP_REQUIRED_CLOUD_APIS[2].consoleName}", wait 2–5 minutes, then retry posting.`;
  }

  if (/mybusinessaccountmanagement\.googleapis\.com.*not been used|mybusinessaccountmanagement\.googleapis\.com.*disabled/i.test(message)) {
    return `Required API "${GBP_REQUIRED_CLOUD_APIS[0].consoleName}" is not enabled in your Google Cloud project.`;
  }

  if (/mybusinessbusinessinformation\.googleapis\.com.*not been used|mybusinessbusinessinformation\.googleapis\.com.*disabled/i.test(message)) {
    return `Required API "${GBP_REQUIRED_CLOUD_APIS[1].consoleName}" is not enabled in your Google Cloud project.`;
  }

  if (/insufficient.*permission|403|PERMISSION_DENIED/i.test(message)) {
    return "Your Google account does not have permission to manage this Business Profile location. Use an owner/manager account, or reconnect OAuth.";
  }

  if (/429|quota|rate limit/i.test(message)) {
    return "Google API rate limit reached. Wait a few minutes before listing accounts/locations again, or enter Account/Location IDs manually.";
  }

  if (/no.*account|accounts.*empty/i.test(message)) {
    return "Your Google account does not have access to any Business Profile accounts.";
  }

  if (/no.*location|locations.*empty/i.test(message)) {
    return "No Business Profile locations found for this account.";
  }

  if (/accountId|locationId|not connected|not configured/i.test(message)) {
    return message;
  }

  return message.slice(0, 500);
}

export class GoogleBusinessProfileError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GoogleBusinessProfileError";
    this.code = code;
  }
}
