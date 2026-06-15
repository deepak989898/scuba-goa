import {
  buildAdminEmailHtml,
  buildAdminEmailPlain,
} from "@/lib/ai-analytics/email-report";
import type { AiAnalyticsDailyDoc } from "@/lib/ai-analytics/types";

import { describeMailConfig, isMailConfigured, resolveMailFromAddress, sendMail } from "@/lib/mail-transport";

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
  return res.ok;
}

async function sendEmailReport(opts: {
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const to =
    process.env.AI_ANALYTICS_REPORT_EMAIL?.trim() ||
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (!to) {
    console.error("[daily-report] email skipped: no AI_ANALYTICS_REPORT_EMAIL / BOOKING_ADMIN_NOTIFY_EMAIL");
    return false;
  }
  if (!isMailConfigured()) {
    console.error("[daily-report] email skipped:", describeMailConfig());
    return false;
  }

  const ok = await sendMail({
    from: resolveMailFromAddress(),
    to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (!ok) {
    console.error("[daily-report] email send failed", { to, transport: describeMailConfig() });
  }
  return ok;
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
      subject: `📊 Daily report ${opts.snapshot.dateIst} — ${opts.headline?.slice(0, 60) || "Book Scuba Goa"}`,
      html,
      text: emailText,
    }),
    sendWhatsAppCloud(telegramText),
  ]);

  if (telegram && !email) {
    console.warn("[daily-report] Telegram sent but email did not — check MAIL_SMTP_* on Vercel");
  }

  return { telegram, email, whatsapp };
}
