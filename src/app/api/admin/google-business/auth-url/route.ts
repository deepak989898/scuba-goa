import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { SITE_URL } from "@/lib/constants";
import { buildGoogleBusinessAuthUrl } from "@/lib/google-business/auth";
import {
  getGoogleOAuthClientId,
  getGoogleOAuthRedirectUri,
} from "@/lib/google-business/config";
import { createGoogleBusinessOAuthState } from "@/lib/google-business/oauth-state";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const clientId = getGoogleOAuthClientId();
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Set GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET in Vercel env first.",
      },
      { status: 400 },
    );
  }

  const state = await createGoogleBusinessOAuthState(auth.uid);
  const redirectUri = getGoogleOAuthRedirectUri(SITE_URL);
  const url = buildGoogleBusinessAuthUrl({ clientId, redirectUri, state });

  return NextResponse.json({ url, redirectUri });
}
