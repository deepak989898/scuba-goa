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

export async function sendPricingAgentNotifications(opts: {
  runId: string;
  status: string;
  suggestionsCreated: number;
  pricesUpdated: number;
  failed: number;
  dryRun: boolean;
}): Promise<{ telegram: boolean; email: boolean }> {
  const plain = [
    `💰 Book Scuba Goa — AI Pricing`,
    opts.dryRun ? "(dry run — no live prices changed)" : "",
    `Status: ${opts.status}`,
    `Suggestions: ${opts.suggestionsCreated}`,
    `Prices updated: ${opts.pricesUpdated}`,
    `Failed: ${opts.failed}`,
    `Run: ${opts.runId}`,
    `Admin: /admin/pricing-agent`,
  ]
    .filter(Boolean)
    .join("\n");

  const telegram = await sendTelegram(plain);

  let email = false;
  const to =
    process.env.AI_ANALYTICS_REPORT_EMAIL?.trim() ||
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim();
  if (to && isMailConfigured()) {
    email = await sendMail({
      from: resolveMailFromAddress(),
      to,
      subject: `AI Pricing run ${opts.status}`,
      text: plain,
      html: `<pre>${plain}</pre>`,
    });
  } else if (to && !isMailConfigured()) {
    console.error("[pricing-agent] email skipped:", describeMailConfig());
  }

  return { telegram, email };
}
