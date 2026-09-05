import { SITE_URL } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  createGoogleBusinessLocalPost,
} from "@/lib/google-business/client";
import {
  getGoogleBusinessRuntimeConfig,
  isGoogleBusinessPostingEnabled,
} from "@/lib/google-business/config";
import {
  getGoogleBusinessSettings,
  saveGoogleBusinessSettings,
} from "@/lib/google-business/settings";
import type { SocialContentPayload, SocialPlatformResult } from "@/lib/social-media/types";

function buildSummary(title: string, excerpt: string): string {
  const t = title.trim();
  const e = excerpt.trim().replace(/\s+/g, " ");
  const combined = e ? `${t}\n\n${e}` : t;
  if (combined.length <= 1500) return combined;
  return `${combined.slice(0, 1497)}…`;
}

export async function postToGoogleBusiness(
  payload: SocialContentPayload,
  options?: { force?: boolean },
): Promise<SocialPlatformResult> {
  const settings = await getGoogleBusinessSettings();
  const runtime = await getGoogleBusinessRuntimeConfig();

  if (
    !options?.force &&
    !isGoogleBusinessPostingEnabled(settings, runtime)
  ) {
    return {
      platform: "googleBusiness",
      ok: true,
      posted: false,
      message: "Google Business not connected or auto-post disabled",
    };
  }

  try {
    const result = await createGoogleBusinessLocalPost(runtime!, {
      summary: buildSummary(payload.title, payload.excerpt),
      languageCode: "en-IN",
      callToActionUrl: payload.url,
      imageUrl: payload.imageUrl,
    });

    const now = new Date().toISOString();
    await saveGoogleBusinessSettings({
      lastPostAt: now,
      lastPostSlug: payload.slug,
      lastPostError: null,
    });

    const db = getAdminDb();
    if (db) {
      const field =
        payload.contentType === "blog"
          ? "googleBusinessPostName"
          : "googleBusinessPostName";
      await db
        .collection(payload.contentType === "blog" ? "blogPosts" : "seoPages")
        .doc(payload.slug)
        .set(
          {
            [field]: result.name,
            googleBusinessPostedAt: now,
          },
          { merge: true },
        );
    }

    return {
      platform: "googleBusiness",
      ok: true,
      posted: true,
      message: "Posted to Google Business Profile",
      externalId: result.name,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Business post failed";
    await saveGoogleBusinessSettings({ lastPostError: message });
    return {
      platform: "googleBusiness",
      ok: false,
      posted: false,
      message,
    };
  }
}

export function googleBusinessOAuthRedirectUri(): string {
  return `${SITE_URL.replace(/\/$/, "")}/api/admin/google-business/oauth-callback`;
}
