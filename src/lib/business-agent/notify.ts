import type { BusinessAgentReportDoc } from "@/lib/business-agent/types";
import { isMailConfigured, resolveMailFromAddress, sendMail } from "@/lib/mail-transport";

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

async function sendWhatsAppCloud(text: string): Promise<boolean> {
  const token = process.env.META_WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  const to = process.env.WHATSAPP_REPORT_RECIPIENT?.trim()?.replace(/\D/g, "");
  if (!token || !phoneId || !to) return false;
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
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
  });
  return res.ok;
}

async function sendEmailReport(opts: {
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const to =
    process.env.AI_ANALYTICS_REPORT_EMAIL?.trim() ||
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (!isMailConfigured() || !to) return false;

  return sendMail({
    from: resolveMailFromAddress(),
    to,
    subject: opts.subject,
    html: opts.html ?? `<pre>${opts.text}</pre>`,
    text: opts.text,
  });
}

export async function sendBusinessAgentNotifications(report: BusinessAgentReportDoc) {
  const plain = `📈 Book Scuba Goa — Daily AI Ops\n${report.dateIst}\n\n${report.summaryPlain}\n\nApplied: ${report.appliedActions.length}, Pending: ${report.pendingActions.length}, Failed: ${report.failedActions.length}`;
  const subject = `📈 AI Ops report ${report.dateIst}`;

  const [telegram, whatsapp, email] = await Promise.all([
    sendTelegram(plain),
    sendWhatsAppCloud(plain),
    sendEmailReport({ subject, text: plain }),
  ]);

  return { telegram, whatsapp, email };
}

