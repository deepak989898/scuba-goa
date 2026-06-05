const RESEND_API = "https://api.resend.com/emails";

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

async function sendEmailReport(subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to =
    process.env.AI_ANALYTICS_REPORT_EMAIL?.trim() ||
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (!apiKey || !from || !to) return false;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
    }),
  });
  return res.ok;
}

/** Meta WhatsApp Cloud API — optional automated daily digest. */
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
  dateIst: string;
  summaryPlain: string;
  summaryMarkdown: string;
}): Promise<{ telegram: boolean; email: boolean; whatsapp: boolean }> {
  const header = `📊 Book Scuba Goa — ${opts.dateIst}\n\n`;
  const plain = header + opts.summaryPlain;

  const [telegram, email, whatsapp] = await Promise.all([
    sendTelegram(plain),
    sendEmailReport(
      `Daily analytics — Book Scuba Goa (${opts.dateIst})`,
      opts.summaryMarkdown || opts.summaryPlain,
    ),
    sendWhatsAppCloud(plain),
  ]);

  return { telegram, email, whatsapp };
}
