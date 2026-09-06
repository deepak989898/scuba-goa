import { countOutboundWhatsAppLastHour, sendRecoveryWhatsApp } from "@/lib/recovery-agent/whatsapp";
import {
  processWhatsAppInboundMessage,
  normalizeWhatsAppPhone,
} from "@/lib/whatsapp-agent/process-message";
import {
  getWhatsAppAgentSettings,
  isWhatsAppCloudConfigured,
} from "@/lib/whatsapp-agent/settings";

function normalizePhone(from: string): string {
  return normalizeWhatsAppPhone(from);
}

type InboundMessage = {  from: string;
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

  const outboundLastHour = await countOutboundWhatsAppLastHour(phone);
  if (outboundLastHour >= settings.maxRepliesPerUserPerHour) {
    return;
  }

  const result = await processWhatsAppInboundMessage({
    phone,
    text: msg.text,
    profileName: msg.profileName,
    source: "cloud_api",
  });

  if (!result.ok || result.skipped || !result.reply?.trim()) return;

  const humanDelayMs = 800 + Math.min(1200, msg.text.length * 20);
  await new Promise((r) => setTimeout(r, humanDelayMs));

  await sendRecoveryWhatsApp({
    phone,
    message: result.reply,
    leadId: `phone_${phone}`,
  });
}
