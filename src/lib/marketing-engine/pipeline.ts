import { getAdminDb } from "@/lib/firebase-admin";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import { addTopicToQueue } from "@/lib/blog-automation/topics";
import type { BlogLanguage } from "@/lib/blog-firestore";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { buildMarketingAnalytics } from "@/lib/marketing-engine/analytics";
import { buildMarketingContext } from "@/lib/marketing-engine/context";
import { generateMarketingEnginePack } from "@/lib/marketing-engine/openai-engine";
import { sendMarketingEngineNotifications } from "@/lib/marketing-engine/notify";
import { getMarketingEngineSettings } from "@/lib/marketing-engine/settings";
import { scanTourismTrends } from "@/lib/marketing-engine/trending";
import type {
  MarketingAgentAction,
  MarketingAgentReportDoc,
  MarketingAgentRunDoc,
  MarketingCampaignDoc,
  MarketingContentType,
  MarketingEngineAiOutput,
} from "@/lib/marketing-engine/types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function persistAiOutput(
  dateIst: string,
  pack: MarketingEngineAiOutput,
  trendingConfigured: boolean,
): Promise<{
  contentIds: string[];
  postIds: string[];
  campaignIds: string[];
}> {
  const db = getAdminDb();
  if (!db) return { contentIds: [], postIds: [], campaignIds: [] };

  const now = new Date().toISOString();
  const contentIds: string[] = [];
  const contentIdByIndex: string[] = [];

  for (const item of pack.generatedContent) {
    const contentId = newId("mc");
    contentIds.push(contentId);
    contentIdByIndex.push(contentId);
    await db.collection("marketingGeneratedContent").doc(contentId).set(
      stripUndefinedDeep({
        contentId,
        dateIst,
        type: (item.type ?? "ad_copy") as MarketingContentType,
        title: String(item.title ?? "").slice(0, 200),
        body: String(item.body ?? ""),
        platform: item.platform,
        cta: item.cta,
        hashtags: item.hashtags ?? [],
        language: String(item.language ?? "en"),
        createdAt: now,
      }),
    );
  }

  const postIds: string[] = [];
  for (const post of pack.socialPosts) {
    const postId = newId("msp");
    postIds.push(postId);
    await db.collection("marketingSocialPosts").doc(postId).set(
      stripUndefinedDeep({
        postId,
        dateIst,
        platform: post.platform ?? "instagram",
        scheduledAt: post.scheduledAt ?? now,
        bestTimeIst: post.bestTimeIst,
        topic: post.topic ?? "",
        caption: post.caption ?? "",
        cta: post.cta,
        status: "pending_approval",
        createdAt: now,
      }),
    );
  }

  for (const ad of pack.adCopies) {
    const adId = newId("mad");
    await db.collection("marketingAdCopies").doc(adId).set(
      stripUndefinedDeep({
        adId,
        dateIst,
        campaignTheme: ad.campaignTheme ?? "",
        headlines: ad.headlines ?? [],
        descriptions: ad.descriptions ?? [],
        ctas: ad.ctas ?? [],
        targeting: ad.targeting,
        urgency: ad.urgency,
        festival: ad.festival,
        createdAt: now,
      }),
    );
  }

  for (const cluster of pack.seoClusters) {
    const clusterId = newId("msc");
    await db.collection("marketingSeoClusters").doc(clusterId).set(
      stripUndefinedDeep({
        clusterId,
        dateIst,
        pillarTopic: cluster.pillarTopic ?? "",
        supportingTopics: cluster.supportingTopics ?? [],
        internalLinks: cluster.internalLinks ?? [],
        faqSuggestions: cluster.faqSuggestions ?? [],
        schemaHint: cluster.schemaHint,
        lowRankingPages: cluster.lowRankingPages ?? [],
        createdAt: now,
      }),
    );
  }

  for (const prompt of pack.imagePrompts) {
    const promptId = newId("map");
    await db.collection("marketingAiPrompts").doc(promptId).set(
      stripUndefinedDeep({
        promptId,
        dateIst,
        category: prompt.category ?? "adventure",
        useCase: prompt.useCase ?? "instagram",
        prompt: prompt.prompt ?? "",
        negativePrompt: prompt.negativePrompt,
        createdAt: now,
      }),
    );
  }

  for (const reel of pack.reelsIdeas) {
    const reelId = newId("mri");
    await db.collection("marketingReelsIdeas").doc(reelId).set(
      stripUndefinedDeep({
        reelId,
        dateIst,
        platform: reel.platform ?? "instagram",
        hook: reel.hook ?? "",
        script: reel.script ?? "",
        scenes: reel.scenes ?? [],
        voiceover: reel.voiceover,
        cta: reel.cta ?? "",
        trend: reel.trend,
        createdAt: now,
      }),
    );
  }

  const reportId = `comp_${dateIst}`;
  await db.collection("marketingCompetitorReports").doc(reportId).set(
    stripUndefinedDeep({
      reportId,
      dateIst,
      gaps: pack.competitorReport.gaps ?? [],
      opportunities: pack.competitorReport.opportunities ?? [],
      trendingStrategies: pack.competitorReport.trendingStrategies ?? [],
      keywordIdeas: pack.competitorReport.keywordIdeas ?? [],
      offerPatterns: pack.competitorReport.offerPatterns ?? [],
      serperConfigured: trendingConfigured,
      createdAt: now,
    }),
  );

  const campaignIds: string[] = [];
  for (const c of pack.campaigns) {
    const campaignId = newId("mcamp");
    campaignIds.push(campaignId);
    const linkedContent = (c.contentIndexes ?? [])
      .map((i) => contentIdByIndex[i])
      .filter(Boolean);
    const doc: MarketingCampaignDoc = {
      campaignId,
      dateIst,
      name: c.name ?? "Campaign",
      theme: c.theme ?? "",
      channels: c.channels ?? [],
      status: "pending_approval",
      contentIds: linkedContent,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection("marketingCampaigns").doc(campaignId).set(stripUndefinedDeep(doc));
  }

  return { contentIds, postIds, campaignIds };
}

export async function runMarketingEnginePipeline(opts?: {
  dateIst?: string;
  skipNotifications?: boolean;
}): Promise<{ ok: boolean; dateIst: string; error?: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, dateIst: "", error: "Firebase Admin not configured" };

  const settings = await getMarketingEngineSettings();
  if (!settings.enabled) {
    return { ok: true, dateIst: opts?.dateIst ?? istYesterdayString(), error: "Marketing engine disabled" };
  }

  const dateIst = opts?.dateIst?.trim() || istYesterdayString();
  const runId = `mkt_${dateIst}_${Date.now()}`;
  const now = new Date().toISOString();

  const runDoc: MarketingAgentRunDoc = {
    runId,
    runAt: now,
    dateIst,
    inputs: {},
    summary: "",
  };

  try {
    const [context, analytics, trending] = await Promise.all([
      buildMarketingContext(dateIst),
      buildMarketingAnalytics(dateIst),
      settings.competitorScanEnabled
        ? scanTourismTrends()
        : Promise.resolve({ configured: false, queries: [], snippets: [] }),
    ]);

    runDoc.inputs = {
      marketingLeads: context.marketingLeadsCount,
      hotRecoveryLeads: context.recoveryHotLeads,
      trendingConfigured: trending.configured,
    };

    await db.collection("marketingAnalytics").doc(dateIst).set(stripUndefinedDeep(analytics));

    const pack = await generateMarketingEnginePack({
      context,
      trending,
      festivalCampaignsEnabled: settings.festivalCampaignsEnabled,
    });

    if (!pack) {
      runDoc.summary = "OpenAI pack generation failed (missing key or parse error).";
      await db.collection("marketingAgentRuns").doc(runId).set(stripUndefinedDeep(runDoc));
      return { ok: true, dateIst, error: runDoc.summary };
    }

    const { postIds, campaignIds } = await persistAiOutput(dateIst, pack, trending.configured);

    const pendingActions: MarketingAgentReportDoc["pendingActions"] = [];
    const appliedActions: MarketingAgentReportDoc["appliedActions"] = [];

    if (settings.autoQueueBlogTopics && pack.blogTopicsToQueue.length) {
      const actionId = newId("ma");
      for (const t of pack.blogTopicsToQueue) {
        if (!t.title?.trim()) continue;
        const lang = t.language as BlogLanguage | undefined;
        await addTopicToQueue({
          title: t.title.trim(),
          serviceSlug: t.serviceSlug,
          language: lang === "en" || lang === "hi" || lang === "hinglish" ? lang : "hinglish",
        });
      }
      const action: MarketingAgentAction = {
        actionId,
        runId,
        dateIst,
        createdAt: now,
        kind: "queue_blog_topics",
        risk: "safe",
        status: "applied",
        appliedAt: now,
        payload: { topics: pack.blogTopicsToQueue },
        reason: `Auto-queued ${pack.blogTopicsToQueue.length} blog topics`,
      };
      await db.collection("marketingAgentActions").doc(actionId).set(stripUndefinedDeep(action));
      appliedActions.push({ actionId, kind: action.kind });
    }

    if (pack.socialPosts.length && settings.requireApprovalForSocial) {
      const actionId = newId("ma");
      const action: MarketingAgentAction = {
        actionId,
        runId,
        dateIst,
        createdAt: now,
        kind: "publish_social_campaign",
        risk: "requires_approval",
        status: "pending_approval",
        campaignId: campaignIds[0],
        payload: { postIds, count: pack.socialPosts.length },
        reason: `Approve ${pack.socialPosts.length} scheduled social posts`,
      };
      await db.collection("marketingAgentActions").doc(actionId).set(stripUndefinedDeep(action));
      pendingActions.push({ actionId, kind: action.kind, reason: action.reason });
    }

    const whatsappItems = pack.generatedContent.filter((c) => c.type === "whatsapp_campaign");
    if (whatsappItems.length && settings.requireApprovalForWhatsapp) {
      const actionId = newId("ma");
      const action: MarketingAgentAction = {
        actionId,
        runId,
        dateIst,
        createdAt: now,
        kind: "whatsapp_broadcast",
        risk: "requires_approval",
        status: "pending_approval",
        campaignId: campaignIds[0],
        payload: { messages: whatsappItems.map((w) => w.body) },
        reason: `Approve WhatsApp campaign (${whatsappItems.length} messages)`,
      };
      await db.collection("marketingAgentActions").doc(actionId).set(stripUndefinedDeep(action));
      pendingActions.push({ actionId, kind: action.kind, reason: action.reason });
    }

    const report: MarketingAgentReportDoc = {
      reportId: dateIst,
      dateIst,
      generatedAt: now,
      headline: pack.headline,
      summaryMarkdown: pack.summaryMarkdown,
      summaryPlain: pack.summaryPlain,
      calendar: pack.calendar,
      trendingTopics: pack.trendingTopics,
      contentIdeas: pack.contentIdeas,
      pendingActions,
      appliedActions,
      openaiModel: process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };

    await db.collection("marketingAgentReports").doc(dateIst).set(stripUndefinedDeep(report));

    runDoc.summary = `Generated ${pack.generatedContent.length} content items, ${pack.socialPosts.length} social posts, ${pendingActions.length} pending approvals.`;
    await db.collection("marketingAgentRuns").doc(runId).set(stripUndefinedDeep(runDoc));

    if (!opts?.skipNotifications) {
      await sendMarketingEngineNotifications(report);
    }

    return { ok: true, dateIst };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    runDoc.summary = `Error: ${msg}`;
    await db.collection("marketingAgentRuns").doc(runId).set(stripUndefinedDeep(runDoc));
    return { ok: false, dateIst, error: msg };
  }
}
