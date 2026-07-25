import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  buildGscAuthUrl,
  createGscOAuthState,
  getGscOAuthClientId,
  getGscOAuthRedirectUri,
  gscOAuthConfigured,
  canEncryptSecrets,
} from "@/lib/gsc-indexing-agent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!gscOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set GOOGLE_GSC_CLIENT_ID and GOOGLE_GSC_CLIENT_SECRET (or reuse GOOGLE_BUSINESS_* client credentials)",
      },
      { status: 400 },
    );
  }
  if (!canEncryptSecrets()) {
    return NextResponse.json(
      {
        error:
          "Set GOOGLE_TOKEN_ENCRYPTION_KEY (16+ characters) before connecting OAuth",
      },
      { status: 400 },
    );
  }

  const state = await createGscOAuthState(auth.uid);
  const url = buildGscAuthUrl({
    clientId: getGscOAuthClientId(),
    redirectUri: getGscOAuthRedirectUri(SITE_URL),
    state,
  });
  return NextResponse.json({ url, redirectUri: getGscOAuthRedirectUri(SITE_URL) });
}
