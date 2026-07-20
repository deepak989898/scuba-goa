import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { runKeywordResearch } from "@/lib/seo-blog-center/orchestrate-research";
import {
  addSeoBlogLog,
  bumpDailyCounter,
  getSeoBlogSettings,
  saveCluster,
  saveKeyword,
} from "@/lib/seo-blog-center/store";
import type { ResearchInput } from "@/lib/seo-blog-center/providers/types";
import { getAllServicesServer } from "@/lib/get-services-server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Partial<ResearchInput> = {};
  try {
    body = (await req.json()) as Partial<ResearchInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settings = await getSeoBlogSettings();
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (
    settings.researchCallsDate === day &&
    (settings.researchCallsToday ?? 0) >= 20
  ) {
    return NextResponse.json(
      { error: "Daily research call limit reached (20)" },
      { status: 429 },
    );
  }

  const services = await getAllServicesServer();
  const service =
    services.find((s) => s.slug === body.serviceSlug) ||
    services.find((s) =>
      s.title.toLowerCase().includes(String(body.seedKeyword || "").toLowerCase()),
    ) ||
    services[0];

  const input: ResearchInput = {
    serviceSlug: body.serviceSlug?.trim() || service?.slug || "scuba-diving",
    serviceName: body.serviceName?.trim() || service?.title || "Scuba diving",
    seedKeyword:
      body.seedKeyword?.trim() ||
      body.serviceName?.trim() ||
      service?.title ||
      "scuba diving Goa",
    country: body.country?.trim() || "India",
    state: body.state?.trim() || "Goa",
    city: body.city?.trim() || "",
    language: body.language === "hi" || body.language === "both" ? body.language : "en",
    maxKeywords: Math.min(
      100,
      Math.max(1, Number(body.maxKeywords) || settings.maxKeywordsPerResearch || 100),
    ),
    minMonthlySearches: Math.max(0, Number(body.minMonthlySearches) || 0),
    includeCommercial: body.includeCommercial !== false,
    includeInformational: body.includeInformational !== false,
    includeLocal: body.includeLocal !== false,
    includeQuestions: body.includeQuestions !== false,
    includeComparison: body.includeComparison !== false,
    includePrice: body.includePrice !== false,
    includeSeasonal: body.includeSeasonal !== false,
    includeGsc: body.includeGsc !== false && settings.includeGscKeywords,
    includeSuggest: body.includeSuggest !== false && settings.includeGoogleSuggest,
    includeAds: body.includeAds !== false && settings.includeGoogleAds,
    excludeCovered: body.excludeCovered !== false,
  };

  try {
    const result = await runKeywordResearch(input);
    for (const kw of result.keywords) await saveKeyword(kw);
    for (const cl of result.clusters) await saveCluster(cl);
    await bumpDailyCounter("researchCalls");
    await addSeoBlogLog({
      type: "research_run",
      message: `Research ${result.researchJobId}: ${result.keywords.length} keywords, ${result.clusters.length} clusters`,
      resourceId: result.researchJobId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Research failed";
    await addSeoBlogLog({ type: "error", message, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
