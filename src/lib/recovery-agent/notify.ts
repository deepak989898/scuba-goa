import type { RecoveryLeadDoc } from "@/lib/recovery-agent/types";

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

export async function alertHotLead(lead: RecoveryLeadDoc): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";
  const msg = `🔥 Hot lead — Book Scuba Goa
Score: ${lead.score} (${lead.temperature})
Phone: ${lead.phone || "unknown"}
Name: ${lead.name || "—"}
Last: ${lead.lastPath || "—"}
Checkout attempts: ${lead.signals.checkoutStarted}
Failed/dismissed: ${lead.signals.paymentFailed + lead.signals.checkoutDismissed}
Book: ${site}/booking`;

  await sendTelegram(msg);
}

export async function alertPaymentFailures(count: number, dateIst: string): Promise<void> {
  if (count < 3) return;
  await sendTelegram(
    `⚠️ Payment issues spike — ${count} failures/dismissals today (${dateIst}). Check Razorpay + /admin/bookings`,
  );
}
