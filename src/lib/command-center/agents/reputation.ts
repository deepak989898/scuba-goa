import { getAdminDb } from "@/lib/firebase-admin";
import type { AgentSnapshot } from "@/lib/command-center/types";

export async function runReputationAgent(): Promise<AgentSnapshot> {
  const db = getAdminDb();
  if (!db) {
    return {
      agentId: "reputation",
      status: "error",
      summary: "Firebase not configured",
      data: {},
    };
  }

  const snap = await db.collection("ratings").limit(150).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Record<string, unknown>[];
  const approved = all.filter((r) => r.approved === true);
  const pending = all.filter((r) => r.approved !== true);
  const avg =
    approved.length > 0
      ? approved.reduce((s, r) => s + Number(r.rating ?? 0), 0) / approved.length
      : 0;
  const low = approved.filter((r) => Number(r.rating ?? 5) <= 3);
  const recentNegative = low.slice(0, 5).map((r) => ({
    rating: r.rating,
    comment: String(r.comment ?? "").slice(0, 120),
    city: r.city,
  }));

  const suggestions: string[] = [];
  if (pending.length > 5) suggestions.push(`Approve ${pending.length} pending reviews to build trust`);
  if (avg < 4.2 && approved.length >= 3)
    suggestions.push("Average rating below 4.2 — highlight safety certs and instructor experience on site");
  if (low.length > 0)
    suggestions.push(`Address ${low.length} low ratings — reply on WhatsApp and improve checkout clarity`);
  if (approved.length < 10)
    suggestions.push("Collect more Google/WhatsApp reviews after each dive trip");

  return {
    agentId: "reputation",
    status: "ok",
    summary: `Reputation: ${avg.toFixed(1)}★ avg, ${pending.length} pending moderation`,
    data: {
      avgRating: avg,
      approvedCount: approved.length,
      pendingCount: pending.length,
      lowRatingCount: low.length,
      recentNegative,
      suggestions,
    },
  };
}
