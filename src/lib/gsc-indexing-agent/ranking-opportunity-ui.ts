import type { SeoUrlRecord } from "@/lib/gsc-indexing-agent/types";

/** Hide from ranking opportunities after a recent AI/manual content improve. */
export const RANKING_IMPROVE_HIDE_MS = 45 * 24 * 60 * 60 * 1000;

export function hasRecentRankingContentImprove(
  u: SeoUrlRecord,
  nowMs = Date.now(),
): boolean {
  const at = u.lastRankingImprove?.at;
  if (!at) return false;
  const codes = u.recommendationCodes ?? [];
  if (!codes.includes("RANKING_CONTENT_IMPROVED")) return false;
  const age = nowMs - new Date(at).getTime();
  return age >= 0 && age < RANKING_IMPROVE_HIDE_MS;
}
