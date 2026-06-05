import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";

function latestDocs(docs: QueryDocumentSnapshot[], limit: number): Record<string, unknown>[] {
  return [...docs]
    .sort((a, b) => String(b.id).localeCompare(String(a.id)))
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
    const [reportsSnap, actionsSnap, rollbacksSnap] = await Promise.all([
      db.collection("businessAgentReports").get(),
      db.collection("businessAgentActions").get(),
      db.collection("businessAgentRollbackHistory").get(),
    ]);

    return NextResponse.json({
      reports: latestDocs(reportsSnap.docs, 14),
      actions: [...actionsSnap.docs]
        .sort((a, b) => String(b.data()?.createdAt ?? "").localeCompare(String(a.data()?.createdAt ?? "")))
        .slice(0, 50)
        .map((d) => firestoreDocToJson(d.id, d.data())),
      rollbacks: latestDocs(rollbacksSnap.docs, 20),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[business-agent dashboard]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

