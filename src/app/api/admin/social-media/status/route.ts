import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getGoogleBusinessSettings,
  googleBusinessSettingsPublic,
} from "@/lib/google-business/settings";
import {
  getGoogleOAuthClientId,
  getGoogleOAuthRedirectUri,
} from "@/lib/google-business/config";
import { SITE_URL } from "@/lib/constants";
import { isMetaConfigured } from "@/lib/social-media/meta/config";
import {
  getMetaSettings,
  metaSettingsPublic,
} from "@/lib/social-media/meta/settings";
import {
  getSocialMediaSettings,
} from "@/lib/social-media/settings";
import { isYouTubeConfigured } from "@/lib/social-media/youtube/config";
import {
  getYouTubeSettings,
  youtubeSettingsPublic,
} from "@/lib/social-media/youtube/settings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [social, gbp, meta, youtube] = await Promise.all([
    getSocialMediaSettings(),
    getGoogleBusinessSettings(),
    getMetaSettings(),
    getYouTubeSettings(),
  ]);

  const db = getAdminDb();
  let recentPosts: unknown[] = [];
  if (db) {
    const snap = await db
      .collection("socialMediaPosts")
      .orderBy("createdAt", "desc")
      .limit(15)
      .get()
      .catch(() => null);
    if (snap) {
      recentPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  const clientId = getGoogleOAuthClientId();
  const redirectUri = getGoogleOAuthRedirectUri(SITE_URL);

  return NextResponse.json({
    automation: social.automation,
    updatedAt: social.updatedAt,
    googleBusiness: {
      settings: googleBusinessSettingsPublic(gbp),
      oauth: {
        clientIdConfigured: Boolean(clientId),
        redirectUri,
      },
    },
    meta: {
      settings: metaSettingsPublic(meta),
      configured: isMetaConfigured(),
    },
    youtube: {
      settings: youtubeSettingsPublic(youtube),
      configured: isYouTubeConfigured(),
    },
    recentPosts,
  });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    automation?: Record<string, boolean>;
  };

  if (!body.automation || typeof body.automation !== "object") {
    return NextResponse.json({ error: "automation object required" }, { status: 400 });
  }

  const { saveSocialMediaSettings } = await import("@/lib/social-media/settings");
  const next = await saveSocialMediaSettings({
    automation: {
      googleBusiness: body.automation.googleBusiness === true,
      facebook: body.automation.facebook === true,
      instagram: body.automation.instagram === true,
      youtube: body.automation.youtube === true,
    },
  });

  return NextResponse.json({
    ok: true,
    automation: next.automation,
    updatedAt: next.updatedAt,
  });
}
