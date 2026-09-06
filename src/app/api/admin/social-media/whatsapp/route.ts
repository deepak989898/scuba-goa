import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { SITE_URL } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getWhatsAppAgentSettings,
  isWhatsAppCloudConfigured,
  saveWhatsAppAgentSettings,
} from "@/lib/whatsapp-agent/settings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const settings = await getWhatsAppAgentSettings();
  const site = SITE_URL.replace(/\/$/, "");
  const webhookUrl = `${site}/api/webhooks/whatsapp`;

  const db = getAdminDb();
  let recentChats: unknown[] = [];
  if (db) {
    const snap = await db
      .collection("recoveryWhatsappEvents")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get()
      .catch(() => null);
    if (snap) {
      recentChats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  return NextResponse.json({
    settings,
    configured: isWhatsAppCloudConfigured(),
    webhookUrl,
    verifyTokenSet: Boolean(process.env.META_WHATSAPP_VERIFY_TOKEN?.trim()),
    openAiSet: Boolean(process.env.OPENAI_API_KEY?.trim()),
    recentChats,
  });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    maxRepliesPerUserPerHour?: number;
    handoffCooldownHours?: number;
    businessIntro?: string;
  };

  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.maxRepliesPerUserPerHour != null) {
    patch.maxRepliesPerUserPerHour = body.maxRepliesPerUserPerHour;
  }
  if (body.handoffCooldownHours != null) {
    patch.handoffCooldownHours = body.handoffCooldownHours;
  }
  if (body.businessIntro != null) {
    patch.businessIntro = String(body.businessIntro).slice(0, 500);
  }

  const next = await saveWhatsAppAgentSettings(patch);
  return NextResponse.json({ ok: true, settings: next });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as {
    phone?: string;
    message?: string;
  };

  const phone = String(body.phone ?? "").replace(/\D/g, "");
  const message = String(body.message ?? "").trim();
  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message required" }, { status: 400 });
  }

  const { sendRecoveryWhatsApp } = await import("@/lib/recovery-agent/whatsapp");
  const result = await sendRecoveryWhatsApp({ phone, message });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
