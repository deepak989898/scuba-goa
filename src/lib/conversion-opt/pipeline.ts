import { getAdminDb } from "@/lib/firebase-admin";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import { aggregateConversionFunnel } from "@/lib/conversion-opt/aggregate-funnel";
import { detectConversionIssues } from "@/lib/conversion-opt/detect-issues";
import { generateConversionSuggestions } from "@/lib/conversion-opt/openai-suggestions";

export async function runConversionOptPipeline(opts?: {
  dateIst?: string;
}): Promise<{ ok: boolean; dateIst: string; error?: string }> {
  const db = getAdminDb();
  if (!db) {
    return { ok: false, dateIst: "", error: "Firebase Admin not configured" };
  }

  const dateIst = opts?.dateIst ?? istYesterdayString();
  const daily = await aggregateConversionFunnel(dateIst);
  daily.issues = detectConversionIssues(daily);

  await db.collection("conversionOptDaily").doc(dateIst).set(daily, { merge: true });

  const report = await generateConversionSuggestions(daily);
  if (report) {
    await db.collection("conversionOptReports").doc(dateIst).set(report, {
      merge: true,
    });
  }

  return { ok: true, dateIst };
}
