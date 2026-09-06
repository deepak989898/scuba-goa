import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";
import {
  isWhatsAppMobileAssistantConfigured,
  verifyWhatsAppMobileRequest,
} from "@/lib/whatsapp-agent/mobile-auth";
import { processWhatsAppInboundMessage } from "@/lib/whatsapp-agent/process-message";
import { getWhatsAppAgentSettings } from "@/lib/whatsapp-agent/settings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyWhatsAppMobileRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getWhatsAppAgentSettings();
  return NextResponse.json({
    ok: true,
    siteUrl: SITE_URL.replace(/\/$/, ""),
    agentEnabled: settings.enabled,
    configured: isWhatsAppMobileAssistantConfigured(),
    bookingUrl: `${SITE_URL.replace(/\/$/, "")}/booking`,
  });
}

export async function POST(req: Request) {
  if (!verifyWhatsAppMobileRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppMobileAssistantConfigured()) {
    return NextResponse.json(
      { error: "WHATSAPP_MOBILE_APP_SECRET not configured on server" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    phone?: string;
    senderName?: string;
    message?: string;
    text?: string;
  };

  const message = String(body.message ?? body.text ?? "").trim();
  const senderName = String(body.senderName ?? "").trim();
  const phoneRaw = String(body.phone ?? "").trim();
  const phoneDigits = phoneRaw.replace(/\D/g, "");
  const phone =
    (phoneDigits.length >= 6 ? phoneDigits : "") ||
    phoneRaw ||
    senderName;

  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "phone or senderName required" }, { status: 400 });
  }

  const result = await processWhatsAppInboundMessage({
    phone,
    text: message,
    profileName: senderName || undefined,
    source: "mobile_app",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "Failed" }, { status: 500 });
  }

  if (result.skipped) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: result.reason,
      reply: null,
    });
  }

  const humanDelayMs = 800 + Math.min(1200, message.length * 20);
  await new Promise((r) => setTimeout(r, humanDelayMs));

  return NextResponse.json({
    ok: true,
    reply: result.reply,
    delayMs: humanDelayMs,
  });
}
