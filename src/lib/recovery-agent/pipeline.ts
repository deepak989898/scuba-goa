import { getAdminDb } from "@/lib/firebase-admin";
import { istDateString } from "@/lib/ai-analytics/ist";
import { getRecoveryAgentSettings } from "@/lib/recovery-agent/settings";
import { generateRecoveryWhatsAppMessage } from "@/lib/recovery-agent/openai-recovery";
import {
  countOutboundWhatsAppLastHour,
  sendRecoveryWhatsApp,
} from "@/lib/recovery-agent/whatsapp";
import { alertHotLead, alertPaymentFailures } from "@/lib/recovery-agent/notify";
import type { RecoveryLeadDoc } from "@/lib/recovery-agent/types";
import { stripUndefinedDeep } from "@/lib/firestore-json";

export async function runRecoveryAgentPipeline(): Promise<{
  ok: boolean;
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const db = getAdminDb();
  if (!db) {
    return { ok: false, sent: 0, skipped: 0, errors: ["Firebase Admin not configured"] };
  }

  const settings = await getRecoveryAgentSettings();
  if (!settings.enabled) {
    return { ok: true, sent: 0, skipped: 0, errors: ["Recovery agent disabled"] };
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const sent: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const snap = await db.collection("recoveryLeads").limit(500).get();
  let failCountToday = 0;

  for (const doc of snap.docs) {
    const lead = doc.data() as RecoveryLeadDoc;
    if (lead.status === "converted" || lead.status === "opted_out") continue;

    const abandoned =
      lead.signals.checkoutDismissed > 0 ||
      lead.signals.paymentFailed > 0 ||
      lead.signals.verifyFailed > 0;
    if (!abandoned) continue;

    failCountToday +=
      lead.signals.paymentFailed + lead.signals.checkoutDismissed + lead.signals.verifyFailed;

    if (lead.score >= settings.hotLeadScoreThreshold && lead.phone) {
      await alertHotLead(lead).catch(() => {});
    }

    if (!lead.phone) {
      skipped.push(`${lead.leadId}:no_phone`);
      continue;
    }

    const attempts = lead.recovery?.attempts ?? 0;
    if (attempts >= settings.maxRecoveryAttempts) {
      skipped.push(`${lead.leadId}:max_attempts`);
      continue;
    }

    const nextEligible = lead.recovery?.nextEligibleAt;
    if (nextEligible && new Date(nextEligible).getTime() > now) {
      skipped.push(`${lead.leadId}:waiting`);
      continue;
    }

    const lastSent = lead.recovery?.lastSentAt;
    const delayMs = settings.recoveryDelayMinutes * 60_000;
    if (lastSent && now - new Date(lastSent).getTime() < delayMs) {
      skipped.push(`${lead.leadId}:delay`);
      continue;
    }

    const rateCount = await countOutboundWhatsAppLastHour(lead.phone);
    if (rateCount >= settings.rateLimitPerPhonePerHour) {
      skipped.push(`${lead.leadId}:rate_limit`);
      continue;
    }

    let message = await generateRecoveryWhatsAppMessage({
      lead,
      urgencyEnabled: settings.urgencyEnabled,
    });

    if (!message) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";
      message = `Hi${lead.name ? ` ${lead.name}` : ""}! Your scuba booking in Goa wasn't completed. Need help with payment or package? Reply here or book: ${site}/booking`;
    }

    const campaignId = `camp_${Date.now()}_${lead.leadId}`;
    await db.collection("recoveryCampaigns").doc(campaignId).set({
      campaignId,
      leadId: lead.leadId,
      phone: lead.phone,
      message,
      status: "queued",
      createdAt: nowIso,
    });

    const result = await sendRecoveryWhatsApp({
      phone: lead.phone,
      message,
      leadId: lead.leadId,
    });

    const nextEligibleAt = new Date(now + delayMs * 2).toISOString();

    if (result.ok) {
      sent.push(lead.leadId);
      await db.collection("recoveryCampaigns").doc(campaignId).set(
        { status: "sent", sentAt: nowIso },
        { merge: true },
      );
      await db.collection("recoveryLeads").doc(lead.leadId).set(
        stripUndefinedDeep({
          recovery: {
            attempts: attempts + 1,
            lastSentAt: nowIso,
            lastMessage: message,
            nextEligibleAt,
          },
          status: "recovered",
          updatedAt: nowIso,
        }),
        { merge: true },
      );
    } else {
      errors.push(`${lead.leadId}: ${result.error}`);
      await db.collection("recoveryCampaigns").doc(campaignId).set(
        { status: "failed", reason: result.error },
        { merge: true },
      );
    }
  }

  await alertPaymentFailures(failCountToday, istDateString());

  return { ok: true, sent: sent.length, skipped: skipped.length, errors };
}
