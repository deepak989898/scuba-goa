export type SocialPlatform =
  | "googleBusiness"
  | "facebook"
  | "instagram"
  | "youtube";

export type SocialContentType = "blog" | "guide" | "video" | "reel";

export type SocialContentPayload = {
  contentType: SocialContentType;
  slug: string;
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string;
  /** Public HTTPS MP4 for gallery video / reel posts. */
  videoUrl?: string;
  isReel?: boolean;
  language?: string;
};

export type SocialPlatformResult = {
  platform: SocialPlatform;
  ok: boolean;
  posted: boolean;
  message: string;
  externalId?: string;
};

export type SocialPostLogDoc = {
  contentType: SocialContentType;
  slug: string;
  title: string;
  url: string;
  trigger: "manual" | "auto";
  /** Platform-optimized captions generated at post time (hashtags, CTAs, etc.). */
  captions?: Partial<Record<SocialPlatform, string>>;
  results: SocialPlatformResult[];
  createdAt: string;
};

/** True when at least one platform actually published (not skipped/failed). */
export function socialPostLogHasPublished(
  log: Pick<SocialPostLogDoc, "results">,
): boolean {
  return log.results.some((r) => r.posted === true);
}
