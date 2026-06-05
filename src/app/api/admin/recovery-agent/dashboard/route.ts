import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";
import { getRecoveryAgentSettings } from "@/lib/recovery-agent/settings";

function latest(docs: QueryDocumentSnapshot[], limit: number) {
  return [...docs]
    .sort((a, b) => String(b.data().updatedAt ?? b.id).localeCompare(String(a.data().updatedAt ?? a.id)))
    .slice(0, limit)
    .map((d) => firestoreDocToJson(d.id, d.data()));
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
  }

  try {
    const [leadsSnap, abandonedSnap, campaignsSnap, convSnap, waSnap, settings] =
      await Promise.all([
        db.collection("recoveryLeads").get(),
        db.collection("recoveryAbandonedBookings").get(),
        db.collection("recoveryCampaigns").get(),
        db.collection("recoveryConversations").get(),
        db.collection("recoveryWhatsappEvents").get(),
        getRecoveryAgentSettings(),
      ]);

    const leads = latest(leadsSnap.docs, 100);
    const hot = leads.filter((l) => l.temperature === "hot");
    const abandoned = latest(abandonedSnap.docs, 50);
    const campaigns = latest(campaignsSnap.docs, 30);
    const sent = campaigns.filter((c) => c.status === "sent").length;
    const converted = leads.filter((l) => l.status === "converted").length;
    const recoveryRate =
      sent > 0 ? Math.round((converted / Math.max(1, sent)) * 100) : 0;

    return NextResponse.json({
      settings,
      stats: {
        activeLeads: leads.filter((l) => l.status === "active" || l.status === "recovered").length,
        hotLeads: hot.length,
        abandonedCount: abandoned.length,
        recoveryMessagesSent: sent,
        recoverySuccessRatePct: recoveryRate,
        paymentFailures: leads.reduce(
          (n, l) =>
            n +
            Number((l.signals as { paymentFailed?: number })?.paymentFailed ?? 0),
          0,
        ),
      },
      leads,
      hotLeads: hot.slice(0, 15),
      abandoned,
      campaigns,
      conversations: latest(convSnap.docs, 20),
      whatsappEvents: latest(waSnap.docs, 30),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
