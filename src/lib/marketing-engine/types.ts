export type MarketingContentType =
  | "instagram_caption"
  | "facebook_post"
  | "google_business_post"
  | "ad_copy"
  | "blog_idea"
  | "whatsapp_campaign"
  | "push_notification"
  | "email_marketing"
  | "festival_offer"
  | "package_promotion";

export type MarketingCampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "failed";

export type MarketingAgentActionStatus =
  | "pending_approval"
  | "approved"
  | "applied"
  | "rejected"
  | "failed";

export type MarketingAgentActionRisk = "safe" | "requires_approval";

export type MarketingGeneratedContentDoc = {
  contentId: string;
  dateIst: string;
  type: MarketingContentType;
  title: string;
  body: string;
  platform?: string;
  cta?: string;
  hashtags?: string[];
  language: string;
  createdAt: string;
  campaignId?: string;
};

export type MarketingSocialPostDoc = {
  postId: string;
  dateIst: string;
  platform: "instagram" | "facebook" | "google_business";
  scheduledAt: string;
  bestTimeIst?: string;
  topic: string;
  caption: string;
  cta?: string;
  status: MarketingCampaignStatus;
  campaignId?: string;
  createdAt: string;
  publishedAt?: string;
};

export type MarketingAdCopyDoc = {
  adId: string;
  dateIst: string;
  campaignTheme: string;
  headlines: string[];
  descriptions: string[];
  ctas: string[];
  targeting?: string;
  urgency?: boolean;
  festival?: string;
  createdAt: string;
};

export type MarketingSeoClusterDoc = {
  clusterId: string;
  dateIst: string;
  pillarTopic: string;
  supportingTopics: string[];
  internalLinks: { from: string; to: string; anchor: string }[];
  faqSuggestions: { question: string; answerHint: string }[];
  schemaHint?: string;
  lowRankingPages?: string[];
  createdAt: string;
};

export type MarketingAiPromptDoc = {
  promptId: string;
  dateIst: string;
  category: "luxury" | "adventure" | "romantic" | "family" | "budget";
  useCase: string;
  prompt: string;
  negativePrompt?: string;
  createdAt: string;
};

export type MarketingReelsIdeaDoc = {
  reelId: string;
  dateIst: string;
  platform: "instagram" | "youtube_shorts";
  hook: string;
  script: string;
  scenes: string[];
  voiceover?: string;
  cta: string;
  trend?: string;
  createdAt: string;
};

export type MarketingCompetitorReportDoc = {
  reportId: string;
  dateIst: string;
  gaps: string[];
  opportunities: string[];
  trendingStrategies: string[];
  keywordIdeas: string[];
  offerPatterns: string[];
  serperConfigured: boolean;
  createdAt: string;
};

export type MarketingCampaignDoc = {
  campaignId: string;
  dateIst: string;
  name: string;
  theme: string;
  channels: string[];
  status: MarketingCampaignStatus;
  contentIds: string[];
  scheduledAt?: string;
  publishedAt?: string;
  performance?: { impressions?: number; clicks?: number; conversions?: number };
  createdAt: string;
  updatedAt: string;
};

export type MarketingAnalyticsDoc = {
  dateIst: string;
  generatedAt: string;
  traffic: {
    pageViews: number;
    sessions: number;
    trendPct?: number;
  };
  conversions: {
    bookings: number;
    checkoutStarted: number;
    paymentFailed: number;
    trendPct?: number;
  };
  leads: {
    marketingLeads: number;
    hotRecoveryLeads: number;
    whatsappClicks: number;
  };
  seo: {
    topQueries?: string[];
    weeklyIssues?: number;
  };
  content: {
    blogsPublished7d: number;
    campaignsActive: number;
  };
};

export type MarketingCalendarEntry = {
  day: string;
  platform: string;
  topic: string;
  bestTimeIst: string;
  contentType: string;
};

export type MarketingAgentRunDoc = {
  runId: string;
  runAt: string;
  dateIst: string;
  inputs: Record<string, unknown>;
  summary: string;
};

export type MarketingAgentAction = {
  actionId: string;
  runId: string;
  dateIst: string;
  createdAt: string;
  kind:
    | "publish_social_campaign"
    | "whatsapp_broadcast"
    | "queue_blog_topics"
    | "schedule_google_business";
  risk: MarketingAgentActionRisk;
  status: MarketingAgentActionStatus;
  campaignId?: string;
  payload: Record<string, unknown>;
  reason: string;
  approvedAt?: string;
  appliedAt?: string;
  rejectedAt?: string;
  error?: string;
};

export type MarketingAgentReportDoc = {
  reportId: string;
  dateIst: string;
  generatedAt: string;
  headline: string;
  summaryMarkdown: string;
  summaryPlain: string;
  calendar: MarketingCalendarEntry[];
  trendingTopics: string[];
  contentIdeas: string[];
  pendingActions: { actionId: string; kind: string; reason: string }[];
  appliedActions: { actionId: string; kind: string }[];
  openaiModel?: string;
};

export type MarketingEngineSettings = {
  enabled: boolean;
  autoQueueBlogTopics: boolean;
  requireApprovalForSocial: boolean;
  requireApprovalForWhatsapp: boolean;
  festivalCampaignsEnabled: boolean;
  competitorScanEnabled: boolean;
};

export const DEFAULT_MARKETING_SETTINGS: MarketingEngineSettings = {
  enabled: true,
  autoQueueBlogTopics: true,
  requireApprovalForSocial: true,
  requireApprovalForWhatsapp: true,
  festivalCampaignsEnabled: true,
  competitorScanEnabled: true,
};

export type MarketingEngineAiOutput = {
  headline: string;
  summaryMarkdown: string;
  summaryPlain: string;
  trendingTopics: string[];
  contentIdeas: string[];
  calendar: MarketingCalendarEntry[];
  generatedContent: Omit<MarketingGeneratedContentDoc, "contentId" | "dateIst" | "createdAt">[];
  socialPosts: Omit<MarketingSocialPostDoc, "postId" | "dateIst" | "createdAt" | "status">[];
  adCopies: Omit<MarketingAdCopyDoc, "adId" | "dateIst" | "createdAt">[];
  seoClusters: Omit<MarketingSeoClusterDoc, "clusterId" | "dateIst" | "createdAt">[];
  imagePrompts: Omit<MarketingAiPromptDoc, "promptId" | "dateIst" | "createdAt">[];
  reelsIdeas: Omit<MarketingReelsIdeaDoc, "reelId" | "dateIst" | "createdAt">[];
  competitorReport: Omit<MarketingCompetitorReportDoc, "reportId" | "dateIst" | "createdAt" | "serperConfigured">;
  campaigns: { name: string; theme: string; channels: string[]; contentIndexes: number[] }[];
  blogTopicsToQueue: { title: string; serviceSlug?: string; language?: string }[];
};
