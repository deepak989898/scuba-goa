import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";
import {
  consumeGscOAuthState,
  exchangeGscAuthCode,
  getGscOAuthClientId,
  getGscOAuthClientSecret,
  getGscOAuthRedirectUri,
  storeGscRefreshToken,
  saveSeoSettings,
} from "@/lib/gsc-indexing-agent";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const adminPath = "/admin/gsc-agent";

  if (oauthError) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gsc=error&msg=${encodeURIComponent(oauthError)}`,
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gsc=error&msg=missing_code`,
    );
  }

  const stateOk = await consumeGscOAuthState(state);
  if (!stateOk) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gsc=error&msg=invalid_state`,
    );
  }

  const clientId = getGscOAuthClientId();
  const clientSecret = getGscOAuthClientSecret();
  const redirectUri = getGscOAuthRedirectUri(SITE_URL);
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gsc=error&msg=server_not_configured`,
    );
  }

  try {
    const tokens = await exchangeGscAuthCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
    await storeGscRefreshToken({
      refreshToken: tokens.refreshToken,
      adminUid: stateOk.adminUid,
    });
    // Keep property from env until admin selects one
    await saveSeoSettings({});
    return NextResponse.redirect(`${SITE_URL}${adminPath}?gsc=connected`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?gsc=error&msg=${encodeURIComponent(msg.slice(0, 160))}`,
    );
  }
}
