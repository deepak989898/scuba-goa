import {
  buildAdminEmailHtml,
  buildAdminEmailPlain,
} from "@/lib/ai-analytics/email-report";
import type { AiAnalyticsDailyDoc } from "@/lib/ai-analytics/types";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/constants";
import {
  describeMailConfig,
  isMailConfigured,
  resolveMailFromAddress,
  sendMailDetailed,
} from "@/lib/mail-transport";

/** Always include support inbox; env can add extras (comma-separated). */
function resolveDailyReportRecipients(): string[] {
  const set = new Set<string>();
  const push = (raw?: string) => {
    if (!raw) return;
    for (const part of raw.split(/[,;]/)) {
      const e = part.trim().toLowerCase();
      if (e.includes("@")) set.add(e);
    }
  };

  push(process.env.AI_ANALYTICS_REPORT_EMAIL);
  push(process.env.BOOKING_ADMIN_NOTIFY_EMAIL);
  push(process.env.NEXT_PUBLIC_CONTACT_EMAIL);
  push(CONTACT_EMAIL);
  // Hard guarantee for this business inbox
  push("support@bookscubagoa.com");

  return [...set];
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.error(
      "[daily-report] Telegram skipped: set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID on Vercel",
    );
    return false;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[daily-report] Telegram send failed", {
      status: res.status,
      body: body.slice(0, 300),
    });
    return false;
  }
  return true;
}

async function sendEmailReport(opts: {
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const to = resolveDailyReportRecipients();
  if (!to.length) {
    console.error("[daily-report] email skipped: no recipients");
    return false;
  }
  if (!isMailConfigured()) {
    console.error("[daily-report] email skipped:", describeMailConfig());
    return false;
  }

  const from = resolveMailFromAddress(
    process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.MAIL_FROM?.trim() ||
      "support@bookscubagoa.com",
  );

  const result = await sendMailDetailed({
    from,
    to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (!result.ok) {
    console.error("[daily-report] email send failed", {
      to,
      from,
      transport: result.transport,
      error: result.error,
      config: describeMailConfig(),
    });
  } else {
    console.info("[daily-report] email sent", {
      to,
      from,
      transport: result.transport,
    });
  }
  return result.ok;
}

async function sendWhatsAppCloud(text: string): Promise<boolean> {
  const token = process.env.META_WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  const to = process.env.WHATSAPP_REPORT_RECIPIENT?.trim()?.replace(/\D/g, "");
  if (!token || !phoneId || !to) return false;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text.slice(0, 4000) },
      }),
    },
  );
  return res.ok;
}

export async function sendDailyReportNotifications(opts: {
  snapshot: AiAnalyticsDailyDoc;
  headline?: string;
  actions?: string[];
  summaryPlain?: string;
}): Promise<{ telegram: boolean; email: boolean; whatsapp: boolean }> {
  const plain = buildAdminEmailPlain(opts.snapshot, opts.headline);
  const telegramText = opts.summaryPlain?.trim()
    ? `📊 Book Scuba Goa — ${opts.snapshot.dateIst}\n\n${opts.summaryPlain}`
    : plain;

  const html = buildAdminEmailHtml(
    opts.snapshot,
    opts.headline,
    opts.actions,
  );
  const emailText = plain;

  const [telegram, email, whatsapp] = await Promise.all([
    sendTelegram(telegramText),
    sendEmailReport({
      subject: `Daily report ${opts.snapshot.dateIst} — ${SITE_NAME}`,
      html,
      text: emailText,
    }),
    sendWhatsAppCloud(telegramText),
  ]);

  if (telegram && !email) {
    console.warn(
      "[daily-report] Telegram sent but email did not — set RESEND_API_KEY + RESEND_FROM_EMAIL=support@bookscubagoa.com on Vercel (domain must be Verified in Resend).",
    );
  }

  return { telegram, email, whatsapp };
}
