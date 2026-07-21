import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  hammingHex,
  similarityFromHamming,
} from "./hash";
import type { VisualCategory } from "./types";

const COL = "blogImageRegistry";

export type ImageRegistryEntry = {
  id: string;
  articleId: string;
  slug: string;
  imageUrl: string;
  sha256: string;
  perceptualHash: string;
  differenceHash: string;
  promptHash: string;
  visualCategory: VisualCategory;
  compositionSignature: string;
  model: string;
  width: number;
  height: number;
  createdAt: string;
};

export async function listRecentImageRegistry(
  limit = 200,
): Promise<ImageRegistryEntry[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(COL).limit(Math.min(500, limit * 2)).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ImageRegistryEntry)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, limit);
}

export async function saveImageRegistryEntry(
  entry: Omit<ImageRegistryEntry, "id"> & { id?: string },
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const id =
    entry.id ||
    `img_${entry.articleId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  await db
    .collection(COL)
    .doc(id)
    .set(stripUndefinedDeep({ ...entry, id }), { merge: true });
}

export type DedupeCheckResult = {
  isDuplicate: boolean;
  uniquenessScore: number;
  reason?: string;
  matchedArticleId?: string;
  matchedUrl?: string;
};

/**
 * Exact SHA + perceptual/dHash + composition signature checks.
 * Thresholds: aHash sim ≥ 92 or dHash sim ≥ 90 or same sha → duplicate.
 */
export function checkImageDuplicate(input: {
  articleId: string;
  sha256: string;
  perceptualHash: string;
  differenceHash: string;
  promptHash: string;
  compositionSignature: string;
  visualCategory: VisualCategory;
  registry: ImageRegistryEntry[];
  /** Same composition signature reuse within category is discouraged */
  compositionReuseLimit?: number;
}): DedupeCheckResult {
  const others = input.registry.filter((r) => r.articleId !== input.articleId);

  for (const r of others) {
    if (r.sha256 && r.sha256 === input.sha256) {
      return {
        isDuplicate: true,
        uniquenessScore: 0,
        reason: "exact_file_hash",
        matchedArticleId: r.articleId,
        matchedUrl: r.imageUrl,
      };
    }
  }

  let bestSim = 0;
  let best: ImageRegistryEntry | null = null;
  for (const r of others) {
    if (r.perceptualHash) {
      const d = hammingHex(input.perceptualHash, r.perceptualHash);
      const sim = similarityFromHamming(d, input.perceptualHash.length);
      if (sim > bestSim) {
        bestSim = sim;
        best = r;
      }
      if (sim >= 92) {
        return {
          isDuplicate: true,
          uniquenessScore: 100 - sim,
          reason: `perceptual_similarity_${sim}`,
          matchedArticleId: r.articleId,
          matchedUrl: r.imageUrl,
        };
      }
    }
    if (r.differenceHash) {
      const d = hammingHex(input.differenceHash, r.differenceHash);
      const sim = similarityFromHamming(d, input.differenceHash.length);
      if (sim > bestSim) {
        bestSim = sim;
        best = r;
      }
      if (sim >= 90) {
        return {
          isDuplicate: true,
          uniquenessScore: 100 - sim,
          reason: `difference_hash_similarity_${sim}`,
          matchedArticleId: r.articleId,
          matchedUrl: r.imageUrl,
        };
      }
    }
      if (r.promptHash && r.promptHash === input.promptHash) {
      // Same prompt text as another article — soft retry signal, not hard duplicate
      if (bestSim < 80) bestSim = 80;
      best = r;
    }
  }

  const sameComp = others.filter(
    (r) =>
      r.visualCategory === input.visualCategory &&
      r.compositionSignature === input.compositionSignature,
  );
  // Soft signal only — do not hard-fail on shared composition labels
  const compositionReuse = sameComp.length >= (input.compositionReuseLimit ?? 1);

  // Soft uniqueness: thematic AI photos often share 40–70% aHash similarity.
  // Only near-duplicates (≥85% similar) should tank the score.
  let uniquenessScore: number;
  if (others.length === 0 || bestSim < 50) {
    uniquenessScore = 100;
  } else if (bestSim < 85) {
    uniquenessScore = Math.max(70, 100 - Math.round((bestSim - 50) * 0.6));
  } else {
    uniquenessScore = Math.max(0, 100 - bestSim);
  }
  if (compositionReuse) {
    uniquenessScore = Math.min(uniquenessScore, 78);
  }

  return {
    isDuplicate: false,
    uniquenessScore,
    reason: compositionReuse
      ? "composition_signature_reuse_soft"
      : bestSim >= 70
        ? `near_theme_similarity_${bestSim}`
        : undefined,
    matchedArticleId: best?.articleId,
    matchedUrl: best?.imageUrl,
  };
}
