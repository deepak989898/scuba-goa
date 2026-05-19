import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getGoogleOAuthClientId,
  getGoogleOAuthRedirectUri,
} from "@/lib/google-business/config";
import { SITE_URL } from "@/lib/constants";
import {
  getGoogleBusinessSettings,
  googleBusinessSettingsPublic,
} from "@/lib/google-business/settings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const settings = await getGoogleBusinessSettings();
  const clientId = getGoogleOAuthClientId();
  const redirectUri = getGoogleOAuthRedirectUri(SITE_URL);

  return NextResponse.json({
    settings: googleBusinessSettingsPublic(settings),
    oauth: {
      clientIdConfigured: Boolean(clientId),
      redirectUri,
    },
  });
}
