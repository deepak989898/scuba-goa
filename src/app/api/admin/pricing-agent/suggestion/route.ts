import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { applyLiveCatalogPrice } from "@/lib/pricing-agent/apply-price";
import {
  getSuggestion,
  listHistoryForTarget,
  listSnapshotsForSuggestion,
  savePricingSuggestion,
} from "@/lib/pricing-agent/store";

export const runtime = "nodejs";

type ActionBody = {
  suggestionId: string;
  action: "approve" | "reject" | "keep" | "edit_approve" | "rollback";
  customPrice?: number;
  rejectionReason?: string;
  historyId?: string;
};

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const suggestion = await getSuggestion(id);
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [snapshots, history] = await Promise.all([
    listSnapshotsForSuggestion(id),
    listHistoryForTarget(suggestion.targetId, 15),
  ]);
  return NextResponse.json({ suggestion, snapshots, history });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const suggestion = await getSuggestion(String(body.suggestionId ?? ""));
  if (!suggestion) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (body.action === "reject") {
    await savePricingSuggestion({
      ...suggestion,
      status: "rejected",
      reviewedBy: auth.uid,
      reviewedAt: now,
      rejectionReason: String(body.rejectionReason ?? "").slice(0, 500) || null,
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (body.action === "keep") {
    await savePricingSuggestion({
      ...suggestion,
      status: "kept",
      reviewedBy: auth.uid,
      reviewedAt: now,
    });
    return NextResponse.json({ ok: true, status: "kept" });
  }

  if (body.action === "approve" || body.action === "edit_approve") {
    if (suggestion.status === "approved" || suggestion.status === "auto_approved") {
      return NextResponse.json({ error: "Already approved" }, { status: 409 });
    }
    const price =
      body.action === "edit_approve" && body.customPrice != null
        ? Number(body.customPrice)
        : suggestion.suggestedPrice;
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const applied = await applyLiveCatalogPrice({
      targetId: suggestion.targetId,
      newPrice: price,
      oldPrice: suggestion.currentPrice,
      changeSource: "ai_approve",
      suggestionId: suggestion.id,
      runId: suggestion.runId,
      approvedBy: auth.uid,
      reason: suggestion.reason,
    });
    if (!applied.ok) {
      return NextResponse.json({ error: applied.error }, { status: 500 });
    }

    await savePricingSuggestion({
      ...suggestion,
      suggestedPrice: Math.round(price),
      differenceAmount: Math.round(price) - suggestion.currentPrice,
      differencePercent:
        suggestion.currentPrice > 0
          ? Math.round(
              ((Math.round(price) - suggestion.currentPrice) /
                suggestion.currentPrice) *
                10000,
            ) / 100
          : 0,
      status: "approved",
      reviewedBy: auth.uid,
      reviewedAt: now,
    });
    return NextResponse.json({ ok: true, status: "approved", price: Math.round(price) });
  }

  if (body.action === "rollback") {
    const history = await listHistoryForTarget(suggestion.targetId, 30);
    const entry = body.historyId
      ? history.find((h) => h.id === body.historyId)
      : history[0];
    if (!entry) {
      return NextResponse.json({ error: "No history to rollback" }, { status: 404 });
    }
    const applied = await applyLiveCatalogPrice({
      targetId: suggestion.targetId,
      newPrice: entry.oldPrice,
      oldPrice: entry.newPrice,
      changeSource: "rollback",
      suggestionId: suggestion.id,
      runId: suggestion.runId,
      approvedBy: auth.uid,
      reason: `Rollback of ${entry.id}`,
      rollbackOf: entry.id,
    });
    if (!applied.ok) {
      return NextResponse.json({ error: applied.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: "rolled_back", price: entry.oldPrice });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
