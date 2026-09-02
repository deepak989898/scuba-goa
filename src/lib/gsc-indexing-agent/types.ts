/** Google Search Console Indexing & Ranking Agent — shared types. */

export type AgentMode = "monitor_only" | "approval_required" | "safe_auto_fix";

export type PageType =
  | "blog"
  | "guide"
  | "service"
  | "package"
  | "static"
  | "category"
  | "other";

export type IndexStatusCode =
  | "INDEXED"
  | "NOT_ON_GOOGLE"
  | "DISCOVERED_NOT_INDEXED"
  | "CRAWLED_NOT_INDEXED"
  | "BLOCKED_BY_ROBOTS"
  | "BLOCKED_BY_NOINDEX"
  | "SOFT_404"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "REDIRECT_ERROR"
  | "DUPLICATE_GOOGLE_CANONICAL"
  | "ALTERNATE_WITH_CANONICAL"
  | "UNKNOWN"
  | "API_ERROR"
  | "PENDING_INSPECTION";

export type RankingStatus =
  | "NEW_NO_DATA"
  | "INDEXED_NO_IMPRESSIONS"
  | "IMPRESSIONS_NO_CLICKS"
  | "LOW_CTR"
  | "POSITION_1_TO_3"
  | "POSITION_4_TO_10"
  | "POSITION_11_TO_20"
  | "POSITION_21_PLUS"
  | "RISING"
  | "DECLINING"
  | "LOST_TRAFFIC"
  | "CANNIBALIZATION_RISK"
  | "HEALTHY"
  | "UNKNOWN";

export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ApprovalStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "applied";

export type AutoFixStatus =
  | "none"
  | "queued"
  | "applied"
  | "skipped_monitor"
  | "needs_approval"
  | "failed";

export type SeoUrlRecord = {
  id: string;
  url: string;
  normalizedUrl: string;
  canonicalUrl: string;
  pageType: PageType;
  contentId: string;
  locale: string;
  status: "active" | "excluded" | "redirect" | "error";
  publishedAt: string | null;
  contentUpdatedAt: string | null;
  discoveredAt: string;
  lastSitemapIncludedAt: string | null;
  sitemapName: string | null;
  eligibleForIndexing: boolean;
  noindexDetected: boolean;
  robotsBlocked: boolean;
  httpStatus: number | null;
  contentHash: string | null;
  lastInspectionAt: string | null;
  nextInspectionAt: string | null;
  inspectionPriority: number;
  indexStatus: IndexStatusCode;
  coverageState: string | null;
  crawlState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawlTime: string | null;
  referringUrlsCount: number;
  internalLinksIn: number;
  internalLinksOut: number;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  rankingStatus: RankingStatus;
  issueCodes: string[];
  recommendationCodes: string[];
  autoFixStatus: AutoFixStatus;
  approvalStatus: ApprovalStatus;
  lastActionAt: string | null;
  retryCount: number;
  siteId: string;
  createdAt: string;
  updatedAt: string;
  /** Last AI/manual ranking content improve (blog/guide). */
  lastRankingImprove?: {
    at: string;
    estimatedPct: number;
    targetBand: string;
    checklist: string[];
    summary: string;
    rankingStatus: string;
  };
  /** Flag when free stock could not satisfy hero image — admin may use OpenAI manually. */
  imageAttention?: {
    needsOpenAi: boolean;
    reason: string;
    at: string;
  };
};

export type GscAutomationOpenAiImageItem = {
  urlId: string;
  url: string;
  title: string;
  slug: string;
  reason: string;
  at: string;
};

export type SeoSettings = {
  id: "settings";
  siteId: string;
  agentMode: AgentMode;
  paused: boolean;
  propertyUri: string;
  inspectionDailyQuota: number;
  inspectionsUsedToday: number;
  inspectionsQuotaDate: string;
  sitemapSubmitDebounceMinutes: number;
  lastSitemapSubmitAt: string | null;
  lastInventoryAt: string | null;
  lastAnalyticsSyncAt: string | null;
  notifyOnCritical: boolean;
  /** Daily GSC automation: sync analytics → inspect → ranking improve (stock images only). */
  automationScheduleEnabled?: boolean;
  automationFrequency?: "daily" | "weekly" | "monthly";
  /** Improve blogs with average position worse than this (e.g. 8 = not in top 8). */
  automationPositionThreshold?: number;
  automationInspectPerRun?: number;
  automationRankingImproveMax?: number;
  automationStartedAt?: string | null;
  automationStartedBy?: string | null;
  automationLastRunAt?: string | null;
  automationLastRunDate?: string | null;
  /** Blogs where stock image failed or needs manual OpenAI hero image. */
  automationOpenAiImageQueue?: GscAutomationOpenAiImageItem[];
  createdAt: string;
  updatedAt: string;
};

export type GoogleGscConnection = {
  id: "gsc";
  connected: boolean;
  propertyUri: string | null;
  /** AES-GCM encrypted refresh token (never sent to client). */
  refreshTokenEnc: string | null;
  connectedAt: string | null;
  connectedByUid: string | null;
  lastError: string | null;
  lastHealthCheckAt: string | null;
  healthOk: boolean;
  scopes: string[];
  updatedAt: string;
};

export type SeoIssue = {
  id: string;
  urlId: string;
  url: string;
  code: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  autoFixable: boolean;
  requiresApproval: boolean;
  status: "open" | "fixed" | "ignored" | "pending_approval";
  siteId: string;
  createdAt: string;
  updatedAt: string;
};

export type SeoApproval = {
  id: string;
  urlId: string;
  url: string;
  actionType: string;
  riskLevel: IssueSeverity;
  reason: string;
  expectedImpact: string;
  beforeJson: string;
  afterJson: string;
  status: ApprovalStatus;
  decidedByUid: string | null;
  decidedAt: string | null;
  siteId: string;
  createdAt: string;
  updatedAt: string;
};

export type SeoActionLog = {
  id: string;
  urlId?: string;
  url?: string;
  action: string;
  detail: string;
  ok: boolean;
  siteId: string;
  createdAt: string;
};

export type SeoSitemapRecord = {
  id: string;
  path: string;
  fullUrl: string;
  urlCount: number;
  lastSubmittedAt: string | null;
  lastGoogleStatus: string | null;
  lastError: string | null;
  siteId: string;
  updatedAt: string;
};

export type OverviewStats = {
  totalUrls: number;
  indexed: number;
  notIndexed: number;
  unknown: number;
  criticalIssues: number;
  awaitingInspection: number;
  rankingOpportunities: number;
  declining: number;
  pendingApprovals: number;
  sitemapErrors: number;
  agentMode: AgentMode;
  paused: boolean;
  connectionHealth: boolean;
  propertyUri: string;
};
