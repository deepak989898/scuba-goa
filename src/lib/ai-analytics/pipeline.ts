import { getAdminDb } from "@/lib/firebase-admin";
import { aggregateInternalDaily } from "@/lib/ai-analytics/aggregate-internal";
import { buildClaritySnapshot } from "@/lib/ai-analytics/connectors/clarity";
import { fetchGa4DailySnapshot } from "@/lib/ai-analytics/connectors/ga4";
import { fetchSearchConsoleDailySnapshot } from "@/lib/ai-analytics/connectors/search-console";
import { buildAnalyticsInsights } from "@/lib/ai-analytics/insights";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import { generateAiDailyReport } from "@/lib/ai-analytics/openai-report";
import { sendDailyReportNotifications } from "@/lib/ai-analytics/notify";
import type {
  AiAnalyticsDailyDoc,
  AiAnalyticsReportDoc,
} from "@/lib/ai-analytics/types";

export async function runAiAnalyticsDailyPipeline(opts?: {
  dateIst?: string;
  skipNotifications?: boolean;
}): Promise<{
  ok: boolean;
  dateIst: string;
  error?: string;
  notifications?: { telegram: boolean; email: boolean; whatsapp: boolean };
}> {
  const db = getAdminDb();
  if (!db) {
    return { ok: false, dateIst: "", error: "Firebase Admin not configured" };
  }

  const dateIst = opts?.dateIst ?? istYesterdayString();

  const [internal, ga4Result, gscResult] = await Promise.all([
    aggregateInternalDaily(dateIst),
    fetchGa4DailySnapshot(dateIst),
    fetchSearchConsoleDailySnapshot(dateIst),
  ]);

  const clarity = buildClaritySnapshot();
  const insights = buildAnalyticsInsights(internal);

  const snapshot: AiAnalyticsDailyDoc = {
    dateIst,
    generatedAt: new Date().toISOString(),
    internal,
    ga4: ga4Result.data,
    searchConsole: gscResult.data,
    clarity,
    insights,
    connectorsStatus: {
      ga4: ga4Result.status,
      ga4Message: ga4Result.message,
      searchConsole: gscResult.status,
      searchConsoleMessage: gscResult.message,
      clarity: "dashboard_only",
    },
  };

  await db.collection("aiAnalyticsDaily").doc(dateIst).set(snapshot, { merge: true });

  const ai = await generateAiDailyReport(snapshot);
  let notifications = { telegram: false, email: false, whatsapp: false };

  if (ai) {
    const report: AiAnalyticsReportDoc = {
      dateIst,
      generatedAt: new Date().toISOString(),
      summaryMarkdown: ai.summaryMarkdown,
      summaryPlain: ai.summaryPlain,
      openaiModel: ai.model,
      notifications: {},
    };

    if (!opts?.skipNotifications) {
      notifications = await sendDailyReportNotifications({
        snapshot,
        headline: ai.headline,
        actions: ai.actions,
        summaryPlain: ai.summaryPlain,
      });
      report.notifications = notifications;
    }

    await db.collection("aiAnalyticsReports").doc(dateIst).set(report, { merge: true });
  }

  return { ok: true, dateIst, notifications };
}
