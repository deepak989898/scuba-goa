import {
  appendConversationMessage,
  loadConversation,
} from "@/lib/recovery-agent/conversations";
import { upsertRecoveryLead } from "@/lib/recovery-agent/lead-tracker";
import { countOutboundWhatsAppLastHour, sendRecoveryWhatsApp } from "@/lib/recovery-agent/whatsapp";
import {
  isHandoffActive,
  loadWhatsAppBookingSession,
  saveWhatsAppBookingSession,
  updateBookingSessionFromMessage,
} from "@/lib/whatsapp-agent/booking-session";
import {
  generateWhatsAppAgentReply,
  handoffReplyMessage,
} from "@/lib/whatsapp-agent/openai-reply";
import {
  getWhatsAppAgentSettings,
  isWhatsAppCloudConfigured,
} from "@/lib/whatsapp-agent/settings";

function normalizePhone(from: string): string {
  const d = from.replace(/\D/g, "");
  if (d.length < 10) return "";
  return d.length > 12 ? d.slice(-12) : d;
}

function sessionIdForPhone(phone: string): string {
  return `wa_${phone}`;
}

type InboundMessage = {
  from: string;
  text: string;
  messageId?: string;
  profileName?: string;
};

export async function processWhatsAppWebhookPayload(body: unknown): Promise<void> {
  if (!isWhatsAppCloudConfigured()) return;

  const settings = await getWhatsAppAgentSettings();
  if (!settings.enabled) return;

  const entries =
    body &&
    typeof body === "object" &&
    "entry" in body &&
    Array.isArray((body as { entry: unknown }).entry)
      ? (body as { entry: Array<{ changes?: Array<{ value?: Record<string, unknown> }> }> })
          .entry
      : [];

  const inbound: InboundMessage[] = [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const profileName =
        contacts.length > 0
          ? String(
              (contacts[0] as { profile?: { name?: string } })?.profile?.name ?? "",
            ).trim()
          : "";

      for (const msg of messages) {
        const m = msg as {
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        };
        if (m.type !== "text" || !m.text?.body?.trim()) continue;
        const from = normalizePhone(String(m.from ?? ""));
        if (!from) continue;
        inbound.push({
          from,
          text: m.text.body.trim(),
          messageId: m.id,
          profileName,
        });
      }
    }
  }

  for (const msg of inbound) {
    await handleInboundWhatsAppMessage(msg, settings).catch((e) => {
      console.error("[whatsapp-agent] inbound:", e);
    });
  }
}

async function handleInboundWhatsAppMessage(
  msg: InboundMessage,
  settings: Awaited<ReturnType<typeof getWhatsAppAgentSettings>>,
): Promise<void> {
  const phone = msg.from;
  const sessionId = sessionIdForPhone(phone);

  const outboundLastHour = await countOutboundWhatsAppLastHour(phone);
  if (outboundLastHour >= settings.maxRepliesPerUserPerHour) {
    return;
  }

  let bookingSession = await loadWhatsAppBookingSession(phone);
  bookingSession = updateBookingSessionFromMessage(
    bookingSession,
    msg.text,
    msg.profileName,
    settings.handoffCooldownHours,
  );
  await saveWhatsAppBookingSession(bookingSession);

  void upsertRecoveryLead({
    sessionId,
    phone,
    name: bookingSession.customerName || msg.profileName,
    event: "session_visit",
    path: "/whatsapp-inbound",
  }).catch(() => {});

  let reply: string;

  if (isHandoffActive(bookingSession)) {
    reply = handoffReplyMessage();
  } else {
    const prev = await loadConversation(sessionId);
    const history =
      prev?.messages.map((m) => ({ role: m.role, text: m.text })) ?? [];

    reply = await generateWhatsAppAgentReply({
      message: msg.text,
      phone,
      history,
      bookingSession,
      settings,
      customerName: bookingSession.customerName || msg.profileName,
    });
  }

  if (!reply.trim()) return;

  await appendConversationMessage({
    sessionId,
    language: "auto",
    role: "user",
    text: msg.text,
    leadId: `phone_${phone}`,
  });
  await appendConversationMessage({
    sessionId,
    language: "auto",
    role: "assistant",
    text: reply,
    leadId: `phone_${phone}`,
  });

  const humanDelayMs = 800 + Math.min(1200, msg.text.length * 20);
  await new Promise((r) => setTimeout(r, humanDelayMs));

  await sendRecoveryWhatsApp({
    phone,
    message: reply,
    leadId: `phone_${phone}`,
  });
}
