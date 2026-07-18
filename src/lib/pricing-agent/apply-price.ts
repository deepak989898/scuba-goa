import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseTargetId, savePriceHistory } from "@/lib/pricing-agent/store";
import type { PackagePriceHistory, PricingTargetKind } from "@/lib/pricing-agent/types";

export async function applyLiveCatalogPrice(opts: {
  targetId: string;
  newPrice: number;
  oldPrice: number;
  changeSource: PackagePriceHistory["changeSource"];
  suggestionId?: string | null;
  runId?: string | null;
  approvedBy: string;
  reason: string;
  rollbackOf?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseTargetId(opts.targetId);
  if (!parsed) return { ok: false, error: "Invalid target id" };
  if (!Number.isFinite(opts.newPrice) || opts.newPrice <= 0) {
    return { ok: false, error: "Invalid price" };
  }

  const db = getAdminDb();
  if (!db) return { ok: false, error: "Firebase Admin not configured" };

  const price = Math.round(opts.newPrice);

  try {
    if (parsed.kind === "package") {
      await db.collection("packages").doc(parsed.refId).set({ price }, { merge: true });
    } else {
      await db
        .collection("services")
        .doc(parsed.refId)
        .set({ priceFrom: price }, { merge: true });
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update catalog price",
    };
  }

  const historyId = db.collection("packagePriceHistory").doc().id;
  const diff = price - opts.oldPrice;
  const pct = opts.oldPrice > 0 ? (diff / opts.oldPrice) * 100 : 0;
  await savePriceHistory({
    id: historyId,
    targetId: opts.targetId,
    kind: parsed.kind,
    oldPrice: opts.oldPrice,
    newPrice: price,
    differenceAmount: diff,
    differencePercent: Math.round(pct * 100) / 100,
    changeSource: opts.changeSource,
    suggestionId: opts.suggestionId ?? null,
    runId: opts.runId ?? null,
    approvedBy: opts.approvedBy,
    rollbackOf: opts.rollbackOf ?? null,
    reason: opts.reason.slice(0, 500),
    createdAt: new Date().toISOString(),
  });

  try {
    revalidatePath("/");
    revalidatePath("/services");
    revalidatePath("/booking");
    revalidatePath("/offers");
    if (parsed.kind === "service") {
      revalidatePath(`/services/${parsed.refId}`);
    }
  } catch {
    // revalidate may fail outside Next request context
  }

  return { ok: true };
}

export function kindLabel(kind: PricingTargetKind): string {
  return kind === "package" ? "Package" : "Service";
}
