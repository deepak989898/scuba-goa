import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";
import { runSeoHealthAudit } from "@/lib/seo-health/audit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
  }

  const snap = await db.collection("seoHealthReports").get();
  const reports = [...snap.docs]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 14)
    .map((d) => firestoreDocToJson(d.id, d.data()));

  return NextResponse.json({ reports, latest: reports[0] ?? null });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const report = await runSeoHealthAudit();
  return NextResponse.json({ ok: true, report });
}
