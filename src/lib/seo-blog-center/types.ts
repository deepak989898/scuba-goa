export type KeywordStatus = "pending" | "approved" | "rejected";
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
  | "ai";

export interface SeoBlogKeyword {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: "low" | "medium" | "high";
  trendScore: number;
  category: KeywordCategory;
  destination?: string;
  originCity?: string;
  seoScore: number;
  status: KeywordStatus;
  source: KeywordSource;
  /** GSC metrics when source is gsc */
  gscClicks?: number;
  gscImpressions?: number;
  gscCtr?: number;
  gscPosition?: number;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
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
  autoApproveKeywords: boolean;
  autoGenerateBlogs: boolean;
  autoApproveBlogs: boolean;
  autoPublish: boolean;
  approvalRequired: boolean;
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
  autoApproveKeywords: true,
  autoGenerateBlogs: false,
  autoApproveBlogs: true,
  autoPublish: false,
  approvalRequired: false,
};
