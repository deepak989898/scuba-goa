import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  buildMetaAuthUrl,
  getMetaAppId,
  getMetaOAuthRedirectUri,
  isMetaConfigured,
} from "@/lib/social-media/meta/config";
import { createSocialOAuthState } from "@/lib/social-media/oauth-state";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isMetaConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set META_APP_ID and META_APP_SECRET in Vercel env, then redeploy.",
      },
      { status: 400 },
    );
  }

  const state = await createSocialOAuthState("meta", auth.uid);
  const url = buildMetaAuthUrl({
    appId: getMetaAppId(),
    redirectUri: getMetaOAuthRedirectUri(),
    state,
  });

  return NextResponse.json({ url, redirectUri: getMetaOAuthRedirectUri() });
}
