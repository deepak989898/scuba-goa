import { getGoogleBusinessAccessToken } from "@/lib/google-business/auth";
import {
  getYouTubeClientId,
  getYouTubeClientSecret,
} from "@/lib/social-media/youtube/config";
import {
  getYouTubeSettings,
  saveYouTubeSettings,
} from "@/lib/social-media/youtube/settings";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB — reels/shorts are usually much smaller

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getYouTubeClientId(),
      client_secret: getYouTubeClientSecret(),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as {
    refresh_token?: string;
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !data.refresh_token) {
    throw new Error(
      data.error_description ?? data.error ?? "YouTube OAuth exchange failed",
    );
  }
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token ?? "",
  };
}

async function getYouTubeAccessToken(refreshToken: string): Promise<string> {
  return getGoogleBusinessAccessToken({
    clientId: getYouTubeClientId(),
    clientSecret: getYouTubeClientSecret(),
    refreshToken,
  });
}

export async function fetchYouTubeChannel(refreshToken: string) {
  const accessToken = await getYouTubeAccessToken(refreshToken);
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    items?: Array<{ id?: string; snippet?: { title?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok || !data.items?.[0]?.id) {
    throw new Error(data.error?.message ?? "No YouTube channel found on this account");
  }
  const item = data.items[0]!;
  return {
    channelId: String(item.id ?? ""),
    channelTitle: String(item.snippet?.title ?? ""),
  };
}

export async function connectYouTubeFromCode(
  code: string,
  redirectUri: string,
): Promise<void> {
  const tokens = await exchangeYouTubeCode(code, redirectUri);
  const channel = await fetchYouTubeChannel(tokens.refreshToken);
  await saveYouTubeSettings({
    refreshToken: tokens.refreshToken,
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    connectedAt: new Date().toISOString(),
    lastPostError: null,
  });
}

function extractYouTubeTags(description: string): string[] {
  const tags = new Set<string>();
  for (const match of description.matchAll(/#([\w\u0900-\u097F]+)/g)) {
    const tag = match[1]?.trim();
    if (tag) tags.add(tag.slice(0, 30));
    if (tags.size >= 15) break;
  }
  return [...tags];
}

function buildYouTubeTitle(title: string, isShort: boolean): string {
  let t = title.trim();
  if (isShort && !/#shorts/i.test(t)) {
    t = `${t} #Shorts`;
  }
  return t.slice(0, 100);
}

function buildYouTubeDescription(description: string, isShort: boolean): string {
  let text = description.trim();
  if (isShort && !/#shorts/i.test(text)) {
    text = `${text}\n\n#Shorts`;
  }
  return text.slice(0, 5000);
}

async function downloadPublicVideo(
  videoUrl: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(videoUrl, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to download video (${res.status})`);
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video too large (${Math.round(contentLength / (1024 * 1024))}MB). Max ${MAX_VIDEO_BYTES / (1024 * 1024)}MB for auto-upload.`,
    );
  }

  const mimeType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video too large (${Math.round(buffer.length / (1024 * 1024))}MB). Max ${MAX_VIDEO_BYTES / (1024 * 1024)}MB for auto-upload.`,
    );
  }
  if (buffer.length === 0) {
    throw new Error("Video file is empty");
  }
  return { buffer, mimeType };
}

async function resumableUploadToYouTube(
  accessToken: string,
  metadata: Record<string, unknown>,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(buffer.length),
      },
      body: JSON.stringify(metadata),
    },
  );

  const initData = (await initRes.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  if (!initRes.ok) {
    const msg = initData.error?.message ?? `YouTube upload init failed (${initRes.status})`;
    if (/insufficient/i.test(msg) || /scope/i.test(msg)) {
      throw new Error(
        `${msg} — Disconnect YouTube in admin and connect again to grant upload permission.`,
      );
    }
    throw new Error(msg);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("YouTube did not return an upload URL");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
    },
    body: new Uint8Array(buffer),
  });

  const uploadData = (await uploadRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!uploadRes.ok || !uploadData.id) {
    throw new Error(
      uploadData.error?.message ?? `YouTube upload failed (${uploadRes.status})`,
    );
  }
  return uploadData.id;
}

/** Upload gallery video/reel to YouTube (Shorts when vertical reel). */
export async function postVideoToYouTube(input: {
  title: string;
  description: string;
  videoUrl: string;
  isShort?: boolean;
}): Promise<string> {
  const settings = await getYouTubeSettings();
  if (!settings.refreshToken) {
    throw new Error("YouTube channel not connected");
  }

  const accessToken = await getYouTubeAccessToken(settings.refreshToken);
  const { buffer, mimeType } = await downloadPublicVideo(input.videoUrl);
  const isShort = input.isShort === true;
  const title = buildYouTubeTitle(input.title, isShort);
  const description = buildYouTubeDescription(input.description, isShort);
  const tags = extractYouTubeTags(description);

  const videoId = await resumableUploadToYouTube(
    accessToken,
    {
      snippet: {
        title,
        description,
        tags,
        categoryId: "19", // Travel & Events
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    buffer,
    mimeType,
  );

  await saveYouTubeSettings({
    lastPostAt: new Date().toISOString(),
    lastPostError: null,
  });
  return videoId;
}

/** YouTube Community posts are not available via public API — manual caption for blogs/guides. */
export async function prepareYouTubeShare(
  title: string,
  url: string,
): Promise<{ message: string }> {
  const settings = await getYouTubeSettings();
  if (!settings.refreshToken || !settings.channelId) {
    return { message: "YouTube channel not connected" };
  }
  const now = new Date().toISOString();
  await saveYouTubeSettings({
    lastPostAt: now,
    lastPostError: null,
  });
  return {
    message: `Share on YouTube Community (manual): ${title} — ${url}`,
  };
}
