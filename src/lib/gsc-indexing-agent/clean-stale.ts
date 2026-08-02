import { getAdminDb } from "@/lib/firebase-admin";
import { collectLiveDiscoveredUrls } from "./inventory";
import { logAction, SEO_URLS } from "./store";
import type { SeoUrlRecord } from "./types";

export type StaleSeoUrlSample = {
  id: string;
  path: string;
  pageType: string;
  indexStatus: string;
};

export type CleanStaleSeoUrlsResult = {
  dryRun: boolean;
  tracked: number;
  live: number;
  stale: number;
  deleted: number;
  sample: StaleSeoUrlSample[];
};

function pathOf(u: SeoUrlRecord): string {
  try {
    return new URL(u.normalizedUrl || u.url).pathname;
  } catch {
    return u.normalizedUrl || u.url || u.id;
  }
}

/**
 * Remove seoUrls docs that are no longer on the live site inventory.
 * Does not touch Google Search Console — only the agent Firestore list.
 * Live URLs (including admin-uploaded blogs still published) are never deleted.
 */
export async function cleanStaleSeoUrls(options?: {
  dryRun?: boolean;
  sampleLimit?: number;
}): Promise<CleanStaleSeoUrlsResult> {
  const dryRun = options?.dryRun !== false;
  const sampleLimit = Math.min(40, Math.max(5, options?.sampleLimit ?? 20));

  const db = getAdminDb();
  if (!db) {
    return {
      dryRun,
      tracked: 0,
      live: 0,
      stale: 0,
      deleted: 0,
      sample: [],
    };
  }

  const { liveIds } = await collectLiveDiscoveredUrls();
  const snap = await db.collection(SEO_URLS).limit(2000).get();
  const tracked = snap.docs.length;

  const staleDocs = snap.docs.filter((d) => !liveIds.has(d.id));
  const sample: StaleSeoUrlSample[] = staleDocs.slice(0, sampleLimit).map((d) => {
    const u = { id: d.id, ...d.data() } as SeoUrlRecord;
    return {
      id: d.id,
      path: pathOf(u),
      pageType: String(u.pageType || "other"),
      indexStatus: String(u.indexStatus || "UNKNOWN"),
    };
  });

  let deleted = 0;
  if (!dryRun && staleDocs.length > 0) {
    // Firestore batch max 500
    const BATCH = 400;
    for (let i = 0; i < staleDocs.length; i += BATCH) {
      const chunk = staleDocs.slice(i, i + BATCH);
      const batch = db.batch();
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
      deleted += chunk.length;
    }
  }

  await logAction({
    action: dryRun ? "clean_stale_seo_urls_preview" : "clean_stale_seo_urls",
    detail: dryRun
      ? `Preview: ${staleDocs.length} stale of ${tracked} tracked (live=${liveIds.size})`
      : `Deleted ${deleted} stale seoUrls of ${tracked} tracked (live=${liveIds.size})`,
    ok: true,
  });

  return {
    dryRun,
    tracked,
    live: liveIds.size,
    stale: staleDocs.length,
    deleted,
    sample,
  };
}
