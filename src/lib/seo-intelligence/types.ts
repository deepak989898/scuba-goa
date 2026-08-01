/**
 * AI Competitor SEO Intelligence Agent — shared types.
 * Additive Firestore collections only; never mutates GSC/blog collections in place.
 */

export type SeoIntelCompetitorType =
  | "direct_local"
  | "marketplace"
  | "informational"
  | "other";

export type SeoIntelCompetitorStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "blocked"
  | "paused";

export type SeoIntelSearchIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "local";

export type SeoIntelContentType =
  | "service_page"
  | "package_page"
  | "blog"
  | "guide"
  | "faq_section"
  | "location_landing"
  | "comparison_page"
  | "unknown";

export type SeoIntelPageMatchStatus =
  | "correct_page"
  | "related_page"
  | "wrong_page"
  | "no_page"
  | "cannibalisation"
  | "not_indexed"
  | "weak_ranking"
  | "insufficient_data";

export type SeoIntelSuggestionType =
  | "update_seo_title"
  | "update_meta_description"
  | "improve_h1"
  | "add_headings"
  | "expand_content"
  | "add_pricing_table"
  | "add_package_comparison"
  | "add_faqs"
  | "add_faq_schema"
  | "add_service_schema"
  | "add_offer_schema"
  | "add_breadcrumb_schema"
  | "add_local_business_schema"
  | "add_internal_links"
  | "fix_cannibalisation"
  | "consolidate_pages"
  | "create_service_page"
  | "create_blog"
  | "create_location_page"
  | "improve_image_alt"
  | "optimise_images"
  | "improve_ctr"
  | "fix_canonical"
  | "fix_indexability"
  | "add_trust_signals"
  | "add_safety_info"
  | "add_itinerary"
  | "add_inclusions"
  | "add_pickup_details"
  | "add_booking_cta"
  | "update_year"
  | "add_related_services"
  | "add_author"
  | "improve_mobile"
  | "improve_cwv"
  | "add_testimonials"
  | "improve_url";

export type SeoIntelSuggestionStatus =
  | "draft"
  | "pending_approval"
  | "edited_by_admin"
  | "approved"
  | "auto_approved"
  | "rejected"
  | "scheduled"
  | "applying"
  | "applied"
  | "failed"
  | "rolled_back"
  | "needs_review"
  | "deferred";

export type SeoIntelRiskLevel = "low" | "medium" | "high" | "critical";
export type SeoIntelPriority = "critical" | "high" | "medium" | "low" | "optional";

export type SeoIntelSuggestionAutoType =
  | "title"
  | "meta_description"
  | "internal_links"
  | "faq_additions"
  | "image_alt"
  | "schema"
  | "content_expansion"
  | "new_blog"
  | "new_service_page"
  | "url_changes"
  | "page_consolidation"
  | "redirect_creation"
  | "canonical_changes";

/** Dangerous types stay OFF unless admin explicitly enables + confirms. */
export const SEO_INTEL_DANGEROUS_AUTO_TYPES: SeoIntelSuggestionAutoType[] = [
  "url_changes",
  "page_consolidation",
  "redirect_creation",
  "canonical_changes",
  "new_service_page",
];

export type SeoIntelCompetitor = {
  id: string;
  domain: string;
  canonicalDomain: string;
  displayName: string;
  type: SeoIntelCompetitorType;
  categories: string[];
  source: "auto" | "manual" | "serper" | "gsc";
  relevanceScore: number;
  confidence: number;
  status: SeoIntelCompetitorStatus;
  priority: SeoIntelPriority;
  notes: string;
  paused: boolean;
  blocked: boolean;
  discoveredAt: string;
  approvedAt: string | null;
  lastAnalysedAt: string | null;
  updatedAt: string;
};

export type SeoIntelKeyword = {
  id: string;
  keyword: string;
  normalisedKeyword: string;
  clusterId: string | null;
  primaryKeyword: string | null;
  intent: SeoIntelSearchIntent;
  category: string;
  location: string;
  searchVolume: number | null;
  difficulty: number | null;
  source: string;
  priorityScore: number;
  businessValueScore: number;
  existingPageId: string | null;
  existingPageUrl: string | null;
  /** Matched page type when a page exists */
  existingPageType: SeoIntelContentType | null;
  pageMatchStatus: SeoIntelPageMatchStatus;
  pageMatchNote: string;
  recommendedContentType: SeoIntelContentType;
  status: "active" | "paused" | "archived";
  /** Denormalised latest ranking for admin tables */
  myPosition: number | null;
  myUrl: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  bestCompetitorPosition: number | null;
  bestCompetitorDomain: string | null;
  rankingGap: number | null;
  opportunityScore: number;
  recommendedAction: string;
  competitorPreview: SeoIntelCompetitorPosition[];
  discoveredAt: string;
  lastCheckedAt: string | null;
  updatedAt: string;
};

export type SeoIntelCompetitorPosition = {
  domain: string;
  position: number | null;
  url: string | null;
};

export type SeoIntelRankSnapshot = {
  id: string;
  keywordId: string;
  checkedAt: string;
  myPosition: number | null;
  myUrl: string | null;
  competitorPositions: SeoIntelCompetitorPosition[];
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  source: string;
  device: "all" | "mobile" | "desktop";
  country: string;
};

export type SeoIntelSuggestion = {
  id: string;
  keywordId: string | null;
  keyword: string;
  targetPageId: string | null;
  targetUrl: string;
  /** Firestore collection for apply, if any */
  targetCollection: "blogPosts" | "seoPages" | null;
  targetDocId: string | null;
  pageType: SeoIntelContentType;
  type: SeoIntelSuggestionType;
  currentValue: string;
  proposedValue: string;
  /** Structured fields to merge on apply */
  proposedPatch: Record<string, unknown> | null;
  reason: string;
  evidence: string;
  competitorComparison: string;
  expectedBenefit: string;
  risk: SeoIntelRiskLevel;
  priority: SeoIntelPriority;
  confidence: number;
  changeScope: string;
  rollbackAvailable: boolean;
  status: SeoIntelSuggestionStatus;
  editedByAdmin: boolean;
  autoApproved: boolean;
  rejectionReason: string | null;
  aiModel: string | null;
  estimatedCost: number | null;
  adminNotes: string;
  changeVersionId: string | null;
  applyError: string | null;
  createdAt: string;
  approvedAt: string | null;
  appliedAt: string | null;
  updatedAt: string;
  /** Live rank from keyword store (list enrichment; may not be persisted) */
  myPosition?: number | null;
  bestCompetitorPosition?: number | null;
  bestCompetitorDomain?: string | null;
};

export type SeoIntelChangeVersion = {
  id: string;
  pageId: string;
  suggestionId: string;
  collection: "blogPosts" | "seoPages";
  docId: string;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  status: "applied" | "rolled_back" | "failed";
  rollbackData: Record<string, unknown> | null;
  createdAt: string;
  rolledBackAt: string | null;
};

export type SeoIntelAgentSettings = {
  id: "settings";
  competitorAutoDiscovery: boolean;
  competitorAutoApprove: boolean;
  competitorAutoApproveMinConfidence: number;
  suggestionAutoApprove: boolean;
  allowedAutoApproveTypes: SeoIntelSuggestionAutoType[];
  dangerousActionSettings: Partial<
    Record<SeoIntelSuggestionAutoType, boolean>
  >;
  minConfidence: number;
  maxRisk: SeoIntelRiskLevel;
  minGscImpressions: number;
  minBusinessRelevance: number;
  dailyChangeLimit: number;
  weeklyPageLimit: number;
  maxAiCostPerDay: number;
  provider: "serper" | "none";
  serpLocation: string;
  serpCountry: string;
  serpLanguage: string;
  automationPaused: boolean;
  schedule: {
    dailyEnabled: boolean;
    weeklyEnabled: boolean;
    monthlyEnabled: boolean;
  };
  notificationSettings: {
    newCompetitor: boolean;
    highValueKeyword: boolean;
    rankingDrop: boolean;
    suggestionPending: boolean;
    autoApprovedApplied: boolean;
    changeFailed: boolean;
  };
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
};

export type SeoIntelActivityLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: string;
  details: string;
  result: "ok" | "error" | "skipped";
  error: string | null;
  createdAt: string;
};

export type SeoIntelPriorityTone =
  | "critical"
  | "high"
  | "medium"
  | "good"
  | "info"
  | "strategic"
  | "neutral";
