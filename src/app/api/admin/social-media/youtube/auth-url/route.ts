import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  buildYouTubeAuthUrl,
  getYouTubeClientId,
  getYouTubeOAuthRedirectUri,
  isYouTubeConfigured,
} from "@/lib/social-media/youtube/config";
import { createSocialOAuthState } from "@/lib/social-media/oauth-state";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isYouTubeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set GOOGLE_YOUTUBE_CLIENT_ID and GOOGLE_YOUTUBE_CLIENT_SECRET (or reuse Google Business OAuth credentials).",
      },
      { status: 400 },
    );
  }

  const state = await createSocialOAuthState("youtube", auth.uid);
  const redirectUri = getYouTubeOAuthRedirectUri();
  const url = buildYouTubeAuthUrl({
    clientId: getYouTubeClientId(),
    redirectUri,
    state,
  });

  return NextResponse.json({ url, redirectUri });
}
