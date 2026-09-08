import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";
import { consumeGoogleBusinessOAuthState } from "@/lib/google-business/oauth-state";
import { GoogleBusinessProfileService } from "@/lib/google-business/service";
import {
  getGoogleOAuthRedirectUri,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
} from "@/lib/google-business/config";
import { mapGoogleBusinessError } from "@/lib/google-business/errors";

export const runtime = "nodejs";

/** Google redirects here after OAuth consent (no Bearer token). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const adminPath = "/admin/social-media";

  if (oauthError) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gbp=error&msg=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gbp=error&msg=missing_code`,
    );
  }

  const stateOk = await consumeGoogleBusinessOAuthState(state);
  if (!stateOk) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gbp=error&msg=invalid_state`,
    );
  }

  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  const redirectUri = getGoogleOAuthRedirectUri(SITE_URL);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gbp=error&msg=server_not_configured`,
    );
  }

  try {
    await GoogleBusinessProfileService.connectFromAuthCode(code, redirectUri);
    return NextResponse.redirect(`${SITE_URL}${adminPath}?gbp=connected`);
  } catch (e) {
    const msg = mapGoogleBusinessError(e);
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gbp=error&msg=${encodeURIComponent(msg.slice(0, 120))}`,
    );
  }
}
