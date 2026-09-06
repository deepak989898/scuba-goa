import { getAdminDb } from "@/lib/firebase-admin";
import {
  generatePlatformCaptions,
  type PlatformCaptions,
} from "@/lib/social-media/platform-captions";
import {
  postToFacebookPage,
  postToInstagram,
  postVideoToFacebookPage,
  postVideoToInstagram,
} from "@/lib/social-media/meta/client";
import { getMetaSettings, saveMetaSettings } from "@/lib/social-media/meta/settings";
import { postToGoogleBusiness } from "@/lib/social-media/platforms/google-business";
import type {
  SocialContentPayload,
  SocialPlatform,
  SocialPlatformResult,
  SocialPostLogDoc,
} from "@/lib/social-media/types";
import { socialPostLogHasPublished } from "@/lib/social-media/types";
import {
  postVideoToYouTube,
  prepareYouTubeShare,
} from "@/lib/social-media/youtube/client";
import { saveYouTubeSettings } from "@/lib/social-media/youtube/settings";

async function postToFacebook(
  payload: SocialContentPayload,
  captions: PlatformCaptions,
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
    const videoUrl = payload.videoUrl?.trim();
    const id =
      videoUrl && /^https:\/\//i.test(videoUrl)
        ? await postVideoToFacebookPage({
            pageId: meta.pageId,
            pageAccessToken: meta.pageAccessToken,
            videoUrl,
            description: captions.facebook,
          })
        : await postToFacebookPage({
            pageId: meta.pageId,
            pageAccessToken: meta.pageAccessToken,
            message: captions.facebook,
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
      message: videoUrl ? "Posted video to Facebook Page" : "Posted to Facebook Page",
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
  captions: PlatformCaptions,
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
  const videoUrl = payload.videoUrl?.trim();
  const imageUrl = payload.imageUrl?.trim();

  if (videoUrl && /^https:\/\//i.test(videoUrl)) {
    try {
      const id = await postVideoToInstagram({
        instagramBusinessId: meta.instagramBusinessId,
        pageAccessToken: meta.pageAccessToken,
        videoUrl,
        caption: captions.instagram,
        isReel: payload.isReel === true || payload.contentType === "reel",
        coverUrl: imageUrl,
      });
      await saveMetaSettings({
        lastPostAt: new Date().toISOString(),
        lastPostError: null,
      });
      return {
        platform: "instagram",
        ok: true,
        posted: true,
        message: "Posted video to Instagram (Reels + feed)",
        externalId: id,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Instagram video post failed";
      await saveMetaSettings({ lastPostError: message });
      return { platform: "instagram", ok: false, posted: false, message };
    }
  }

  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
    return {
      platform: "instagram",
      ok: false,
      posted: false,
      message: "Instagram requires a public HTTPS video or image on this content",
    };
  }
  try {
    const id = await postToInstagram({
      instagramBusinessId: meta.instagramBusinessId,
      pageAccessToken: meta.pageAccessToken,
      imageUrl,
      caption: captions.instagram,
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
  captions: PlatformCaptions,
): Promise<SocialPlatformResult> {
  const videoUrl = payload.videoUrl?.trim();
  const isShort = payload.isReel === true || payload.contentType === "reel";

  if (videoUrl && /^https:\/\//i.test(videoUrl)) {
    try {
      const id = await postVideoToYouTube({
        title: payload.title,
        description: captions.youtube,
        videoUrl,
        isShort,
      });
      return {
        platform: "youtube",
        ok: true,
        posted: true,
        message: isShort ? "Uploaded to YouTube (Short)" : "Uploaded to YouTube",
        externalId: id,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "YouTube upload failed";
      await saveYouTubeSettings({ lastPostError: message }).catch(() => null);
      return { platform: "youtube", ok: false, posted: false, message };
    }
  }

  try {
    const { message } = await prepareYouTubeShare(payload.title, payload.url);
    if (message.includes("not connected")) {
      return { platform: "youtube", ok: true, posted: false, message };
    }
    return {
      platform: "youtube",
      ok: true,
      posted: false,
      message: `Manual post only (YouTube API cannot publish Community posts). Copy this caption into YouTube Studio → Community:\n\n${captions.youtube}`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "YouTube share failed";
    return { platform: "youtube", ok: false, posted: false, message };
  }
}

const HANDLERS: Record<
  SocialPlatform,
  (
    payload: SocialContentPayload,
    captions: PlatformCaptions,
  ) => Promise<SocialPlatformResult>
> = {
  googleBusiness: (p, c) => postToGoogleBusiness(p, { force: true, summary: c.googleBusiness }),
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
  const captions = await generatePlatformCaptions(payload);
  const results: SocialPlatformResult[] = [];
  for (const platform of unique) {
    const handler = HANDLERS[platform];
    results.push(await handler(payload, captions));
  }

  const log: SocialPostLogDoc = {
    contentType: payload.contentType,
    slug: payload.slug,
    title: payload.title,
    url: payload.url,
    trigger,
    captions,
    results,
    createdAt: new Date().toISOString(),
  };

  const db = getAdminDb();
  if (db && socialPostLogHasPublished(log)) {
    await db.collection("socialMediaPosts").add(log);
  }

  return log;
}
