import type { SeoUrlRecord } from "./types";
import { saveApproval } from "./store";
import { siteId } from "./normalize-url";
import { createHash } from "crypto";

/**
 * Heuristic content / ranking opportunity proposals.
 * Never invents facts — only flags review needs for admin approval.
 */
export async function proposeContentImprovements(
  urls: SeoUrlRecord[],
  max = 15,
): Promise<number> {
  let created = 0;
  const now = new Date().toISOString();

  const candidates = urls
    .filter((u) => u.pageType === "blog" || u.pageType === "guide")
    .filter((u) =>
      [
        "CRAWLED_NOT_INDEXED",
        "DISCOVERED_NOT_INDEXED",
        "LOW_CTR",
        "POSITION_11_TO_20",
        "IMPRESSIONS_NO_CLICKS",
        "INDEXED_NO_IMPRESSIONS",
      ].includes(u.indexStatus) ||
      ["LOW_CTR", "POSITION_11_TO_20", "IMPRESSIONS_NO_CLICKS"].includes(
        u.rankingStatus,
      ),
    )
    .slice(0, max);

  for (const u of candidates) {
    const id = createHash("sha256")
      .update(`content:${u.id}:${u.indexStatus}:${u.rankingStatus}`)
      .digest("hex")
      .slice(0, 28);

    await saveApproval({
      id,
      urlId: u.id,
      url: u.url,
      actionType: "content_improvement",
      riskLevel: "HIGH",
      reason: `Status ${u.indexStatus} / ranking ${u.rankingStatus}. Review search intent, uniqueness, and internal links. Do not fabricate facts or prices.`,
      expectedImpact:
        "Possible improvement in impressions/CTR after human-approved edits; indexing never guaranteed.",
      beforeJson: JSON.stringify({
        indexStatus: u.indexStatus,
        rankingStatus: u.rankingStatus,
        impressions: u.impressions,
        clicks: u.clicks,
        averagePosition: u.averagePosition,
      }),
      afterJson: JSON.stringify({
        checklist: [
          "Confirm page answers the query intent",
          "Add original useful details (real packages, pickup, safety)",
          "Add 2–5 relevant internal links",
          "Improve title/description only with accurate claims",
          "Reinspect after publish (status read only)",
        ],
      }),
      status: "pending",
      decidedByUid: null,
      decidedAt: null,
      siteId: siteId(),
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }

  return created;
}
