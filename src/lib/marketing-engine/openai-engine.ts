import type { MarketingContext } from "@/lib/marketing-engine/context";
import type { MarketingEngineAiOutput } from "@/lib/marketing-engine/types";
import type { TrendingScanResult } from "@/lib/marketing-engine/trending";

export async function generateMarketingEnginePack(opts: {
  context: MarketingContext;
  trending: TrendingScanResult;
  festivalCampaignsEnabled?: boolean;
}): Promise<MarketingEngineAiOutput | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";
  const { context, trending } = opts;

  const system = `You are an autonomous AI marketing engine for Book Scuba Goa (${site}), a scuba diving & Goa tourism booking business.

Rules:
- Use ONLY prices from the catalog. Never invent ₹ amounts.
- Write for Indian tourists (English + simple Hinglish where noted).
- Focus on bookings, trust, safety, and Goa seasonality.
- Generate practical, publish-ready marketing assets.
- Festival offers only when festivalCampaignsEnabled is true.
- CTAs should point to /booking or WhatsApp.`;

  const user = `Date (IST): ${context.dateIst}

CATALOG:
${context.catalogText}

ANALYTICS SNAPSHOT:
${JSON.stringify(context.analytics?.insights ?? context.analytics ?? {}).slice(0, 4000)}

CONVERSION FUNNEL:
${JSON.stringify(context.conversion ?? {}).slice(0, 2500)}

SEO REPORT (latest):
${JSON.stringify(context.seoReport ?? {}).slice(0, 2500)}

LEADS: marketing=${context.marketingLeadsCount}, hot recovery=${context.recoveryHotLeads}
ACTIVE OFFERS: ${JSON.stringify(context.activeOffers)}
RECENT BLOGS: ${context.recentBlogTitles.slice(0, 10).join(" | ")}

TRENDING SCAN (Serper ${trending.configured ? "on" : "off"}):
${JSON.stringify(trending.snippets).slice(0, 3000)}

festivalCampaignsEnabled: ${opts.festivalCampaignsEnabled !== false}

Return JSON only:
{
  "headline": "one-line marketing headline for owner",
  "summaryMarkdown": "Weekly marketing brief with ## sections: Summary, Traffic & bookings, Content plan, Social calendar, Ads, SEO clusters, Competitor opportunities, Next actions",
  "summaryPlain": "WhatsApp summary max 900 chars",
  "trendingTopics": ["6-12 Goa/scuba/tourism trends"],
  "contentIdeas": ["8-15 short content ideas"],
  "calendar": [
    { "day": "Mon|Tue|...", "platform": "instagram|facebook|google_business|blog", "topic": "", "bestTimeIst": "HH:MM", "contentType": "" }
  ],
  "generatedContent": [
    { "type": "instagram_caption|facebook_post|google_business_post|ad_copy|blog_idea|whatsapp_campaign|push_notification|email_marketing|festival_offer|package_promotion", "title": "", "body": "", "platform": "", "cta": "", "hashtags": [], "language": "en|hinglish" }
  ],
  "socialPosts": [
    { "platform": "instagram|facebook|google_business", "scheduledAt": "ISO date in future", "bestTimeIst": "HH:MM", "topic": "", "caption": "", "cta": "" }
  ],
  "adCopies": [
    { "campaignTheme": "", "headlines": ["3-5"], "descriptions": ["3-5"], "ctas": ["3-5"], "targeting": "local Goa tourists", "urgency": true, "festival": "" }
  ],
  "seoClusters": [
    { "pillarTopic": "", "supportingTopics": [], "internalLinks": [{ "from": "/blog/...", "to": "/services/...", "anchor": "" }], "faqSuggestions": [{ "question": "", "answerHint": "" }], "schemaHint": "", "lowRankingPages": [] }
  ],
  "imagePrompts": [
    { "category": "luxury|adventure|romantic|family|budget", "useCase": "instagram|facebook_ad|poster|banner", "prompt": "detailed image gen prompt", "negativePrompt": "" }
  ],
  "reelsIdeas": [
    { "platform": "instagram|youtube_shorts", "hook": "", "script": "", "scenes": [], "voiceover": "", "cta": "", "trend": "" }
  ],
  "competitorReport": {
    "gaps": [], "opportunities": [], "trendingStrategies": [], "keywordIdeas": [], "offerPatterns": []
  },
  "campaigns": [
    { "name": "", "theme": "", "channels": ["instagram","whatsapp"], "contentIndexes": [0,1] }
  ],
  "blogTopicsToQueue": [
    { "title": "", "serviceSlug": "", "language": "hinglish|en|hi" }
  ]
}

Minimums: generatedContent 12+, socialPosts 7 (daily week), adCopies 3, seoClusters 2, imagePrompts 5 (one per category), reelsIdeas 5, calendar 7 entries.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.55,
      max_tokens: 4500,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<MarketingEngineAiOutput>;
    return {
      headline: String(parsed.headline ?? "Marketing engine report").trim(),
      summaryMarkdown: String(parsed.summaryMarkdown ?? "").trim(),
      summaryPlain: String(parsed.summaryPlain ?? "").trim().slice(0, 900),
      trendingTopics: Array.isArray(parsed.trendingTopics)
        ? parsed.trendingTopics.map(String).slice(0, 20)
        : [],
      contentIdeas: Array.isArray(parsed.contentIdeas)
        ? parsed.contentIdeas.map(String).slice(0, 25)
        : [],
      calendar: Array.isArray(parsed.calendar) ? parsed.calendar.slice(0, 14) : [],
      generatedContent: Array.isArray(parsed.generatedContent)
        ? parsed.generatedContent.slice(0, 30)
        : [],
      socialPosts: Array.isArray(parsed.socialPosts) ? parsed.socialPosts.slice(0, 14) : [],
      adCopies: Array.isArray(parsed.adCopies) ? parsed.adCopies.slice(0, 10) : [],
      seoClusters: Array.isArray(parsed.seoClusters) ? parsed.seoClusters.slice(0, 6) : [],
      imagePrompts: Array.isArray(parsed.imagePrompts) ? parsed.imagePrompts.slice(0, 12) : [],
      reelsIdeas: Array.isArray(parsed.reelsIdeas) ? parsed.reelsIdeas.slice(0, 12) : [],
      competitorReport: {
        gaps: parsed.competitorReport?.gaps?.map(String) ?? [],
        opportunities: parsed.competitorReport?.opportunities?.map(String) ?? [],
        trendingStrategies: parsed.competitorReport?.trendingStrategies?.map(String) ?? [],
        keywordIdeas: parsed.competitorReport?.keywordIdeas?.map(String) ?? [],
        offerPatterns: parsed.competitorReport?.offerPatterns?.map(String) ?? [],
      },
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns.slice(0, 8) : [],
      blogTopicsToQueue: Array.isArray(parsed.blogTopicsToQueue)
        ? parsed.blogTopicsToQueue.slice(0, 12)
        : [],
    };
  } catch {
    return null;
  }
}
