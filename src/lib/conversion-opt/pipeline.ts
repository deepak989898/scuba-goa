import { getAdminDb } from "@/lib/firebase-admin";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import { stripUndefinedDeep } from "@/lib/firestore-json";
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

  try {
    const daily = await aggregateConversionFunnel(dateIst);
    daily.issues = detectConversionIssues(daily);

    await db
      .collection("conversionOptDaily")
      .doc(dateIst)
      .set(stripUndefinedDeep(daily), { merge: true });

    const report = await generateConversionSuggestions(daily);
    if (report) {
      await db
        .collection("conversionOptReports")
        .doc(dateIst)
        .set(stripUndefinedDeep(report), { merge: true });
    }

    return { ok: true, dateIst };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[conversion-opt pipeline]", msg);
    return { ok: false, dateIst, error: msg };
  }
}
