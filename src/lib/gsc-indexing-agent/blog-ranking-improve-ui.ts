import type { BlogPostFirestore } from "@/lib/blog-firestore";
import type { BlogGscRow } from "@/lib/admin-content-overview";

/** Days after improve before Generate is shown again (unless impressions threshold met). */
export const BLOG_RANKING_IMPROVE_COOLDOWN_DAYS = 15;

/** New GSC impressions since last improve required to re-enable Generate early. */
export const BLOG_RANKING_IMPROVE_MIN_NEW_IMPRESSIONS = 10;

/** Max blogs per bulk SEO improve API request. */
export const MAX_BULK_SEO_IMPROVE_PER_REQUEST = 100;

/** Default batch size for bulk SEO improve (admin UI + API). */
export const DEFAULT_BULK_SEO_IMPROVE_BATCH = 50;

export type BlogRankingImproveSnapshot = {
  at: string;
  estimatedPct: number;
  summary: string;
  targetBand?: string;
  impressionsAtImprove?: number;
  clicksAtImprove?: number;
  rankingStatus?: string;
};

export function getBlogRankingImproveSnapshot(
  post: BlogPostFirestore,
  gsc: BlogGscRow | null,
): BlogRankingImproveSnapshot | null {
  if (gsc?.lastRankingImprove?.at) return gsc.lastRankingImprove;
  if (post.lastSeoRankingImprove?.at) return post.lastSeoRankingImprove;
  return null;
}

export function formatBlogImproveDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function canShowBlogRankingGenerate(
  post: BlogPostFirestore,
  gsc: BlogGscRow | null,
  nowMs = Date.now(),
): { allowed: boolean; reason?: string } {
  if (!post.published) {
    return { allowed: false, reason: "Publish first" };
  }

  const meta = getBlogRankingImproveSnapshot(post, gsc);
  if (!meta?.at) return { allowed: true };

  const elapsedMs = nowMs - new Date(meta.at).getTime();
  if (elapsedMs < 0) return { allowed: true };

  const elapsedDays = elapsedMs / 86400000;
  if (elapsedDays >= BLOG_RANKING_IMPROVE_COOLDOWN_DAYS) {
    return { allowed: true };
  }

  const baseline = meta.impressionsAtImprove ?? 0;
  const currentImpressions = gsc?.impressions ?? 0;
  const newImpressions = currentImpressions - baseline;
  if (newImpressions >= BLOG_RANKING_IMPROVE_MIN_NEW_IMPRESSIONS) {
    return { allowed: true };
  }

  const daysLeft = Math.max(1, Math.ceil(BLOG_RANKING_IMPROVE_COOLDOWN_DAYS - elapsedDays));
  const impNeeded = Math.max(
    1,
    BLOG_RANKING_IMPROVE_MIN_NEW_IMPRESSIONS - newImpressions,
  );
  return {
    allowed: false,
    reason: `Improved ${formatBlogImproveDate(meta.at)} — wait ${daysLeft}d or +${impNeeded} GSC impressions`,
  };
}
