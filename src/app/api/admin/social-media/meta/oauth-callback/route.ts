import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";
import { exchangeMetaCode, saveMetaUserToken } from "@/lib/social-media/meta/client";
import { consumeSocialOAuthState } from "@/lib/social-media/oauth-state";

export const runtime = "nodejs";

const adminPath = "/admin/social-media";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?meta=error&msg=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?meta=error&msg=missing_code`,
    );
  }

  const stateOk = await consumeSocialOAuthState("meta", state);
  if (!stateOk) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?meta=error&msg=invalid_state`,
    );
  }

  try {
    const tokens = await exchangeMetaCode(code);
    await saveMetaUserToken(tokens.accessToken);
    return NextResponse.redirect(`${SITE_URL}${adminPath}?meta=connected`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?meta=error&msg=${encodeURIComponent(msg.slice(0, 120))}`,
    );
  }
}
