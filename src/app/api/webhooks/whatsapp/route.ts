import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { processWhatsAppWebhookPayload } from "@/lib/whatsapp-agent/inbound";

export const dynamic = "force-dynamic";

/**
 * Meta WhatsApp Cloud API webhook.
 * GET — hub verification (Callback URL setup in Meta dashboard).
 * POST — inbound messages & delivery status updates.
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const expected = process.env.META_WHATSAPP_VERIFY_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "META_WHATSAPP_VERIFY_TOKEN is not set on the server" },
      { status: 500 }
    );
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getAdminDb();
  const now = new Date().toISOString();

  if (db) {
    try {
      const entries =
        body &&
        typeof body === "object" &&
        "entry" in body &&
        Array.isArray((body as { entry: unknown }).entry)
          ? (body as { entry: Array<{ changes?: Array<{ value?: Record<string, unknown> }> }> })
              .entry
          : [];

      for (const entry of entries) {
        for (const change of entry.changes ?? []) {
          const value = change.value ?? {};
          const messages = Array.isArray(value.messages) ? value.messages : [];
          const statuses = Array.isArray(value.statuses) ? value.statuses : [];

          for (const msg of messages) {
            const from = String((msg as { from?: string }).from ?? "");
            const text =
              (msg as { text?: { body?: string } }).text?.body ??
              (msg as { type?: string }).type ??
              "";
            await db.collection("recoveryWhatsappEvents").add({
              direction: "inbound",
              phone: from.replace(/\D/g, ""),
              message: String(text).slice(0, 2000),
              status: "received",
              raw: JSON.stringify(msg).slice(0, 4000),
              createdAt: now,
            });
          }

          for (const status of statuses) {
            const recipient = String((status as { recipient_id?: string }).recipient_id ?? "");
            await db.collection("recoveryWhatsappEvents").add({
              direction: "status",
              phone: recipient.replace(/\D/g, ""),
              message: String((status as { status?: string }).status ?? "unknown"),
              status: "delivery_update",
              raw: JSON.stringify(status).slice(0, 2000),
              createdAt: now,
            });
          }
        }
      }
    } catch {
      // Always return 200 so Meta does not retry endlessly.
    }
  }

  void processWhatsAppWebhookPayload(body).catch((e) => {
    console.error("[whatsapp webhook] agent:", e);
  });

  return NextResponse.json({ ok: true });
}
