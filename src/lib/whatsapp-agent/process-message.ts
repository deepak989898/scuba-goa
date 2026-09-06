import {
  appendConversationMessage,
  loadConversation,
} from "@/lib/recovery-agent/conversations";
import { upsertRecoveryLead } from "@/lib/recovery-agent/lead-tracker";
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
import { getWhatsAppAgentSettings } from "@/lib/whatsapp-agent/settings";

export function normalizeWhatsAppPhone(from: string): string {
  const d = from.replace(/\D/g, "");
  if (d.length >= 10) return d.length > 12 ? d.slice(-12) : d;
  const nameKey = from.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
  if (nameKey.length >= 3) return `name_${nameKey}`;
  return "";
}

export function sessionIdForWhatsAppPhone(phone: string): string {
  return `wa_${phone}`;
}

export type WhatsAppInboundInput = {
  phone: string;
  text: string;
  profileName?: string;
  source?: "cloud_api" | "mobile_app";
};

export type WhatsAppProcessResult = {
  ok: boolean;
  reply?: string;
  skipped?: boolean;
  reason?: string;
};

/** Generate AI reply + persist session — does NOT send via Meta Cloud API. */
export async function processWhatsAppInboundMessage(
  input: WhatsAppInboundInput,
): Promise<WhatsAppProcessResult> {
  const settings = await getWhatsAppAgentSettings();
  if (!settings.enabled) {
    return { ok: true, skipped: true, reason: "WhatsApp agent disabled in admin" };
  }

  const phone = normalizeWhatsAppPhone(input.phone);
  const text = input.text.trim();
  if (!phone || !text) {
    return { ok: false, reason: "phone and text required" };
  }

  const sessionId = sessionIdForWhatsAppPhone(phone);

  let bookingSession = await loadWhatsAppBookingSession(phone);
  bookingSession = updateBookingSessionFromMessage(
    bookingSession,
    text,
    input.profileName,
    settings.handoffCooldownHours,
  );
  await saveWhatsAppBookingSession(bookingSession);

  void upsertRecoveryLead({
    sessionId,
    phone,
    name: bookingSession.customerName || input.profileName,
    event: "session_visit",
    path: input.source === "mobile_app" ? "/whatsapp-mobile" : "/whatsapp-inbound",
  }).catch(() => {});

  let reply: string;
  if (isHandoffActive(bookingSession)) {
    reply = handoffReplyMessage();
  } else {
    const prev = await loadConversation(sessionId);
    const history =
      prev?.messages.map((m) => ({ role: m.role, text: m.text })) ?? [];
    reply = await generateWhatsAppAgentReply({
      message: text,
      phone,
      history,
      bookingSession,
      settings,
      customerName: bookingSession.customerName || input.profileName,
    });
  }

  if (!reply.trim()) {
    return { ok: true, skipped: true, reason: "empty reply" };
  }

  await appendConversationMessage({
    sessionId,
    language: "auto",
    role: "user",
    text,
    leadId: `phone_${phone}`,
  });
  await appendConversationMessage({
    sessionId,
    language: "auto",
    role: "assistant",
    text: reply,
    leadId: `phone_${phone}`,
  });

  return { ok: true, reply };
}
