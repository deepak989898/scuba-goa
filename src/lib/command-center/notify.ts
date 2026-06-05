import type { CommandCenterReportDoc } from "@/lib/command-center/types";

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

export async function sendCommandCenterNotifications(
  report: CommandCenterReportDoc,
): Promise<{ telegram: boolean }> {
  const text = `🎯 AI Command Center — ${report.dateIst}\n\n${report.headline}\n\n${report.summaryPlain}\n\nPending approvals: ${report.pendingApprovals}`;
  const telegram = await sendTelegram(text);
  return { telegram };
}
