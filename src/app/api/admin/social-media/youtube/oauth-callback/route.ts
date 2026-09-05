import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";
import { consumeSocialOAuthState } from "@/lib/social-media/oauth-state";
import { connectYouTubeFromCode } from "@/lib/social-media/youtube/client";
import { getYouTubeOAuthRedirectUri } from "@/lib/social-media/youtube/config";

export const runtime = "nodejs";

const adminPath = "/admin/social-media";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?youtube=error&msg=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?youtube=error&msg=missing_code`,
    );
  }

  const stateOk = await consumeSocialOAuthState("youtube", state);
  if (!stateOk) {
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?youtube=error&msg=invalid_state`,
    );
  }

  try {
    await connectYouTubeFromCode(code, getYouTubeOAuthRedirectUri());
    return NextResponse.redirect(`${SITE_URL}${adminPath}?youtube=connected`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(
      `${SITE_URL}${adminPath}?youtube=error&msg=${encodeURIComponent(msg.slice(0, 120))}`,
    );
  }
}
