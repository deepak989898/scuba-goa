import type {
  KeywordIntent,
  KeywordSource,
  ContentType,
} from "@/lib/seo-blog-center/types";
import type { ResearchCategoryId } from "@/lib/seo-blog-center/research-categories";

export type RawKeywordIdea = {
  keyword: string;
  source: KeywordSource;
  monthlySearches?: number | null;
  competition?: "low" | "medium" | "high";
  competitionIndex?: number | null;
  cpcLow?: number | null;
  cpcHigh?: number | null;
  gscClicks?: number | null;
  gscImpressions?: number | null;
  gscCtr?: number | null;
  gscPosition?: number | null;
  serviceSlug?: string;
};

export type ResearchInput = {
  serviceSlug: string;
  serviceName: string;
  seedKeyword: string;
  country: string;
  state: string;
  city: string;
  language: "en" | "hi" | "both";
  maxKeywords: number;
  minMonthlySearches: number;
  includeCommercial: boolean;
  includeInformational: boolean;
  includeLocal: boolean;
  includeQuestions: boolean;
  includeComparison: boolean;
  includePrice: boolean;
  includeSeasonal: boolean;
  includeGsc: boolean;
  includeSuggest: boolean;
  includeAds: boolean;
  excludeCovered: boolean;
  /** Category 1–10 checkboxes from New keyword research. */
  researchCategories?: ResearchCategoryId[];
};

export type ProviderResult = {
  configured: boolean;
  ideas: RawKeywordIdea[];
  error?: string;
  provider: string;
};

export type ClassifiedKeyword = RawKeywordIdea & {
  normalizedKeyword: string;
  displayKeyword: string;
  intent: KeywordIntent;
  contentType: ContentType;
};
