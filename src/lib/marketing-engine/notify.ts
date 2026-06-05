import type { MarketingAgentReportDoc } from "@/lib/marketing-engine/types";

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

export async function sendMarketingEngineNotifications(
  report: MarketingAgentReportDoc,
): Promise<{ telegram: boolean }> {
  const text = `📣 Marketing AI — ${report.dateIst}\n\n${report.headline}\n\n${report.summaryPlain}\n\nPending approvals: ${report.pendingActions.length}`;
  const telegram = await sendTelegram(text);
  return { telegram };
}
