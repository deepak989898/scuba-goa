import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { rollbackBusinessAgent } from "@/lib/business-agent/action-engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });

  let body: { rollbackId?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const rollbackId = body.rollbackId?.trim();
  if (!rollbackId) return NextResponse.json({ error: "rollbackId required" }, { status: 400 });

  const res = await rollbackBusinessAgent({ rollbackId });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }

  await db.collection("businessAgentRollbackHistory").doc(rollbackId).set(
    { rolledBackAt: new Date().toISOString() },
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}

