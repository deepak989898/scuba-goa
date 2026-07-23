import type { getAdminDb } from "@/lib/firebase-admin";

export type ContentTraffic = { views: number; visitors: number };

export const PAGE_VIEWS_BACKFILL_LIMIT = 5000;

export function mergeContentTraffic(
  target: Record<string, ContentTraffic>,
  slug: string,
  views: number,
  visitors: number,
) {
  const key = slug.trim().toLowerCase();
  if (!key) return;
  const cur = target[key];
  if (!cur) {
    target[key] = { views, visitors };
    return;
  }
  target[key] = {
    views: Math.max(cur.views, views),
    visitors: Math.max(cur.visitors, visitors),
  };
}

export function normalizeAnalyticsPath(pathRaw: string): string {
  const trimmed = pathRaw.trim();
  if (!trimmed) return "";
  let p = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/** Lookup traffic by slug with case-insensitive key matching. */
export function getContentTrafficForSlug(
  bySlug: Record<string, ContentTraffic>,
  slug: string | null | undefined,
): ContentTraffic | undefined {
  const key = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (!key) return undefined;
  return bySlug[key] ?? bySlug[slug!.trim()];
}

type BackfillConfig = {
  pathPrefix: string;
  indexPath: string;
  slugPattern: RegExp;
};

/** Rebuild counts from raw pageViews when aggregated Firestore docs failed or are empty. */
export async function backfillContentTrafficFromPageViews(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  config: BackfillConfig,
): Promise<{ bySlug: Record<string, ContentTraffic>; index: ContentTraffic }> {
  const bySlug: Record<string, ContentTraffic> = {};
  const indexVisitors = new Set<string>();
  let indexViews = 0;
  const slugVisitors = new Map<string, Set<string>>();

  const snap = await db
    .collection("pageViews")
    .orderBy("createdAt", "desc")
    .limit(PAGE_VIEWS_BACKFILL_LIMIT)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.eventType !== "view") continue;
    // Bots are stored for evidence but must not inflate public view counts.
    if (data.isBot === true || data.visitorType === "bot") continue;
    const pathRaw = String(data.path ?? "").trim();
    if (!pathRaw.startsWith(config.pathPrefix)) continue;

    const path = normalizeAnalyticsPath(pathRaw);
    const sessionId = String(data.sessionId ?? "anon").trim() || "anon";

    if (path === config.indexPath) {
      indexViews += 1;
      indexVisitors.add(sessionId);
      continue;
    }

    const m = config.slugPattern.exec(path);
    if (!m) continue;
    const slug = m[1].toLowerCase();
    if (!slugVisitors.has(slug)) slugVisitors.set(slug, new Set());
    slugVisitors.get(slug)!.add(sessionId);
    const row = bySlug[slug] ?? { views: 0, visitors: 0 };
    row.views += 1;
    bySlug[slug] = row;
  }

  for (const [slug, sessions] of slugVisitors) {
    const row = bySlug[slug] ?? { views: 0, visitors: 0 };
    row.visitors = sessions.size;
    bySlug[slug] = row;
  }

  return {
    bySlug,
    index: { views: indexViews, visitors: indexVisitors.size },
  };
}

export async function loadContentTrafficWithBackfill(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  options: {
    collection: "analyticsBlogTraffic" | "analyticsGuideTraffic";
    indexDocId: string;
    backfill: BackfillConfig;
    /**
     * `aggregated` = fast path from analytics*Traffic only (recommended for admin tables).
     * `full` = also scan recent pageViews when needed (slower; recovery / empty collections).
     */
    mode?: "aggregated" | "full";
  },
): Promise<{
  bySlug: Record<string, ContentTraffic>;
  index: ContentTraffic;
  aggregatedDocs: number;
  backfilled: boolean;
}> {
  const bySlug: Record<string, ContentTraffic> = {};
  let index: ContentTraffic = { views: 0, visitors: 0 };

  const snap = await db.collection(options.collection).get();
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const views = Math.max(0, Math.round(Number(data.views ?? 0)));
    const visitors = Math.max(0, Math.round(Number(data.visitors ?? 0)));
    const traffic = { views, visitors };
    if (doc.id === options.indexDocId) {
      index = traffic;
      continue;
    }
    const slug = String(data.slug ?? doc.id)
      .trim()
      .toLowerCase();
    if (slug && slug !== options.indexDocId) {
      mergeContentTraffic(bySlug, slug, views, visitors);
    }
  }

  const mode = options.mode ?? "full";
  const aggregatedEmpty =
    snap.size === 0 ||
    (Object.keys(bySlug).length === 0 && index.views === 0);
  const shouldBackfill = mode === "full" || aggregatedEmpty;

  let backfilled = false;
  if (shouldBackfill) {
    try {
      const backfill = await backfillContentTrafficFromPageViews(
        db,
        options.backfill,
      );
      backfilled = true;
      for (const [slug, t] of Object.entries(backfill.bySlug)) {
        mergeContentTraffic(bySlug, slug, t.views, t.visitors);
      }
      index = {
        views: Math.max(index.views, backfill.index.views),
        visitors: Math.max(index.visitors, backfill.index.visitors),
      };
    } catch (e) {
      console.error(
        `[analytics-content-traffic] pageViews backfill failed for ${options.collection}`,
        e,
      );
    }
  }

  return { bySlug, index, aggregatedDocs: snap.size, backfilled };
}
