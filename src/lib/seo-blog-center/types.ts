export type KeywordStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "queued"
  | "generating"
  | "draft_created"
  | "published"
  | "failed"
  | "already_covered"
  | "needs_optimization"
  | "duplicate_cluster";

export type BlogDraftStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "published"
  | "rejected";

export type KeywordCategory =
  | "scuba_diving"
  | "water_sports"
  | "goa_beaches"
  | "island_trips"
  | "travel_guides"
  | "booking_pricing"
  | "city_origin";

export type KeywordSource =
  | "google_suggest"
  | "google_serp"
  | "template"
  | "gsc"
  | "city_research"
  | "ai"
  | "google_ads"
  | "service_seed";

export type KeywordIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "local"
  | "navigational"
  | "comparison"
  | "price"
  | "safety"
  | "beginner"
  | "seasonal"
  | "faq";

export type ContentType =
  | "complete_guide"
  | "price_guide"
  | "safety_guide"
  | "beginner_guide"
  | "comparison"
  | "best_of"
  | "location_guide"
  | "package_guide"
  | "faq_article"
  | "booking_guide"
  | "seasonal_guide"
  | "what_to_expect"
  | "optimize_service_page";

export type SuggestedAction =
  | "create_article"
  | "optimize_existing"
  | "merge_cluster"
  | "skip";

export interface SeoBlogKeyword {
  id: string;
  keyword: string;
  displayKeyword?: string;
  normalizedKeyword?: string;
  searchVolume: number;
  /** null when Ads/GSC did not provide volume */
  monthlySearches?: number | null;
  competition: "low" | "medium" | "high";
  competitionIndex?: number | null;
  cpcLow?: number | null;
  cpcHigh?: number | null;
  trendScore: number;
  category: KeywordCategory;
  destination?: string;
  originCity?: string;
  seoScore: number;
  opportunityScore?: number;
  scoreExplanation?: string;
  intent?: KeywordIntent;
  contentType?: ContentType;
  clusterId?: string;
  cannibalizationRisk?: "none" | "low" | "medium" | "high";
  suggestedAction?: SuggestedAction;
  serviceSlug?: string;
  language?: "en" | "hi" | "both";
  status: KeywordStatus;
  source: KeywordSource;
  gscClicks?: number;
  gscImpressions?: number;
  gscCtr?: number;
  gscPosition?: number;
  researchJobId?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SeoKeywordCluster {
  id: string;
  researchJobId?: string;
  primaryKeyword: string;
  primaryKeywordId?: string;
  secondaryKeywords: string[];
  questionKeywords: string[];
  keywordIds: string[];
  intent: KeywordIntent;
  contentType: ContentType;
  serviceSlug: string;
  location: string;
  language: "en" | "hi" | "both";
  suggestedTitle: string;
  suggestedSlug: string;
  opportunityScore: number;
  cannibalizationScore: number;
  conflictingUrls: string[];
  status: "pending" | "approved" | "rejected" | "queued" | "generated";
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export type GenerationJobStatus =
  | "waiting"
  | "generating-outline"
  | "generating-content"
  | "generating-image"
  | "validating"
  | "draft-ready"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export interface AiBlogGenerationJob {
  id: string;
  clusterId: string;
  serviceSlug: string;
  serviceName: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  questions: string[];
  searchIntent: KeywordIntent;
  contentType: ContentType;
  language: "en" | "hi" | "hinglish";
  location: string;
  status: GenerationJobStatus;
  priority: number;
  attempts: number;
  maximumAttempts: number;
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledPublishAt?: string;
  errorCode?: string;
  errorMessage?: string;
  generatedDraftId?: string;
  generatedBlogSlug?: string;
  qualityScore?: number;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  lockedBy?: string | null;
  lockedAt?: string | null;
  leaseExpiresAt?: string | null;
  promptVersion: string;
}

export interface SeoBlogMeta {
  id: string;
  keywordId: string;
  keyword: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  slug: string;
  faq: { question: string; answer: string }[];
  metaKeywords: string[];
  openGraph: {
    title: string;
    description: string;
    image?: string;
    url: string;
  };
  schemaMarkup: Record<string, unknown>;
  canonicalUrl: string;
  serviceSlug: string;
  createdAt: string;
}

export interface SeoBlogDraft {
  id: string;
  keywordId: string;
  keyword: string;
  clusterId?: string;
  jobId?: string;
  slug: string;
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  content: string;
  faqs: { question: string; answer: string }[];
  readTime: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  ogImageUrl: string;
  schemaMarkup: Record<string, unknown>;
  serviceSlug: string;
  language: "en" | "hi" | "hinglish";
  status: BlogDraftStatus;
  source: "seo-blog-center";
  qualityScore?: number;
  qualityNotes?: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  publishedAt?: string;
  publishedBlogSlug?: string;
}

export interface SeoBlogCenterSettings {
  id: "global";
  enabled: boolean;
  keywordsPerDay: number;
  blogsPerDay: number;
  includeGscKeywords: boolean;
  includeGoogleSuggest: boolean;
  includeTemplates: boolean;
  includeGoogleAds: boolean;
  autoApproveKeywords: boolean;
  autoGenerateBlogs: boolean;
  autoApproveBlogs: boolean;
  autoPublish: boolean;
  approvalRequired: boolean;
  /** AI Blog Automation */
  pauseGenerationQueue: boolean;
  maxKeywordsPerResearch: number;
  maxBlogsGeneratedPerDay: number;
  maxBlogsPublishedPerDay: number;
  maxImagesPerDay: number;
  minHoursBetweenPublications: number;
  minAutoPublishQualityScore: number;
  generateImages: boolean;
  estimatedCostConfirmUsd: number;
  researchCallsToday?: number;
  researchCallsDate?: string;
  blogsGeneratedToday?: number;
  blogsGeneratedDate?: string;
  imagesGeneratedToday?: number;
  imagesGeneratedDate?: string;
  blogsPublishedToday?: number;
  blogsPublishedDate?: string;
  updatedAt?: string;
}

export type SeoBlogLogType =
  | "keyword_generated"
  | "keyword_approved"
  | "keyword_rejected"
  | "seo_meta_generated"
  | "blog_generated"
  | "blog_approved"
  | "blog_published"
  | "pipeline_run"
  | "research_run"
  | "cluster_approved"
  | "job_failed"
  | "error";

export interface SeoBlogCenterLog {
  id: string;
  type: SeoBlogLogType;
  message: string;
  resourceId?: string;
  error?: string;
  createdAt: string;
}

export const DEFAULT_SEO_BLOG_SETTINGS: SeoBlogCenterSettings = {
  id: "global",
  enabled: true,
  keywordsPerDay: 15,
  blogsPerDay: 2,
  includeGscKeywords: true,
  includeGoogleSuggest: true,
  includeTemplates: true,
  includeGoogleAds: true,
  autoApproveKeywords: false,
  autoGenerateBlogs: false,
  autoApproveBlogs: false,
  autoPublish: false,
  approvalRequired: true,
  pauseGenerationQueue: false,
  maxKeywordsPerResearch: 100,
  maxBlogsGeneratedPerDay: 5,
  maxBlogsPublishedPerDay: 2,
  maxImagesPerDay: 5,
  minHoursBetweenPublications: 6,
  minAutoPublishQualityScore: 92,
  generateImages: true,
  estimatedCostConfirmUsd: 5,
};

export const PROMPT_VERSION = "ai-blog-automation-v1";
