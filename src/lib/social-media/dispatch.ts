import { getAdminDb } from "@/lib/firebase-admin";
import { buildSocialCaption } from "@/lib/social-media/build-content";
import {
  postToFacebookPage,
  postToInstagram,
} from "@/lib/social-media/meta/client";
import { getMetaSettings, saveMetaSettings } from "@/lib/social-media/meta/settings";
import { postToGoogleBusiness } from "@/lib/social-media/platforms/google-business";
import type {
  SocialContentPayload,
  SocialPlatform,
  SocialPlatformResult,
  SocialPostLogDoc,
} from "@/lib/social-media/types";
import { prepareYouTubeShare } from "@/lib/social-media/youtube/client";

async function postToFacebook(
  payload: SocialContentPayload,
): Promise<SocialPlatformResult> {
  const meta = await getMetaSettings();
  if (!meta.pageId || !meta.pageAccessToken) {
    return {
      platform: "facebook",
      ok: true,
      posted: false,
      message: "Facebook Page not connected",
    };
  }
  try {
    const id = await postToFacebookPage({
      pageId: meta.pageId,
      pageAccessToken: meta.pageAccessToken,
      message: buildSocialCaption(payload),
      link: payload.url,
    });
    await saveMetaSettings({
      lastPostAt: new Date().toISOString(),
      lastPostError: null,
    });
    return {
      platform: "facebook",
      ok: true,
      posted: true,
      message: "Posted to Facebook Page",
      externalId: id,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Facebook post failed";
    await saveMetaSettings({ lastPostError: message });
    return { platform: "facebook", ok: false, posted: false, message };
  }
}

async function postToInstagramPlatform(
  payload: SocialContentPayload,
): Promise<SocialPlatformResult> {
  const meta = await getMetaSettings();
  if (!meta.instagramBusinessId || !meta.pageAccessToken) {
    return {
      platform: "instagram",
      ok: true,
      posted: false,
      message: "Instagram Business not linked to your Facebook Page",
    };
  }
  const imageUrl = payload.imageUrl?.trim();
  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
    return {
      platform: "instagram",
      ok: false,
      posted: false,
      message: "Instagram requires a public HTTPS image on this content",
    };
  }
  try {
    const id = await postToInstagram({
      instagramBusinessId: meta.instagramBusinessId,
      pageAccessToken: meta.pageAccessToken,
      imageUrl,
      caption: buildSocialCaption(payload),
    });
    await saveMetaSettings({
      lastPostAt: new Date().toISOString(),
      lastPostError: null,
    });
    return {
      platform: "instagram",
      ok: true,
      posted: true,
      message: "Posted to Instagram",
      externalId: id,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Instagram post failed";
    await saveMetaSettings({ lastPostError: message });
    return { platform: "instagram", ok: false, posted: false, message };
  }
}

async function postToYouTubePlatform(
  payload: SocialContentPayload,
): Promise<SocialPlatformResult> {
  try {
    const { message } = await prepareYouTubeShare(payload.title, payload.url);
    if (message.includes("not connected")) {
      return { platform: "youtube", ok: true, posted: false, message };
    }
    const caption = buildSocialCaption(payload);
    return {
      platform: "youtube",
      ok: true,
      posted: false,
      message: `Manual post only (YouTube API cannot publish Community posts). Copy this caption into YouTube Studio → Community:\n\n${caption}`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "YouTube share failed";
    return { platform: "youtube", ok: false, posted: false, message };
  }
}

const HANDLERS: Record<
  SocialPlatform,
  (payload: SocialContentPayload) => Promise<SocialPlatformResult>
> = {
  googleBusiness: (p) => postToGoogleBusiness(p, { force: true }),
  facebook: postToFacebook,
  instagram: postToInstagramPlatform,
  youtube: postToYouTubePlatform,
};

export async function dispatchSocialPost(
  payload: SocialContentPayload,
  platforms: SocialPlatform[],
  trigger: "manual" | "auto",
): Promise<SocialPostLogDoc> {
  const unique = [...new Set(platforms)];
  const results: SocialPlatformResult[] = [];
  for (const platform of unique) {
    const handler = HANDLERS[platform];
    results.push(await handler(payload));
  }

  const log: SocialPostLogDoc = {
    contentType: payload.contentType,
    slug: payload.slug,
    title: payload.title,
    url: payload.url,
    trigger,
    results,
    createdAt: new Date().toISOString(),
  };

  const db = getAdminDb();
  if (db) {
    await db.collection("socialMediaPosts").add(log);
  }

  return log;
}
