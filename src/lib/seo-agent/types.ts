export type SeoTrend = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  clicksPrev: number;
  impressionsPrev: number;
  ctrPrev: number;
  positionPrev: number;
  clicksDelta: number;
  impressionsDelta: number;
  ctrDelta: number;
  positionDelta: number;
};

export type SeoPageRow = SeoTrend & {
  page: string;
  topQueries: { query: string; clicks: number; impressions: number; position: number; ctr: number }[];
};

export type SeoQueryRow = SeoTrend & {
  query: string;
  topPages: { page: string; clicks: number; impressions: number; position: number; ctr: number }[];
};

export type SeoPageAudit = {
  url: string;
  path: string;
  httpStatus?: number;
  title?: string;
  metaDescription?: string;
  hasJsonLdSchema: boolean;
  wordCount: number;
  h1?: string;
};

export type SeoIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  category:
    | "ctr"
    | "ranking"
    | "keywords"
    | "meta"
    | "schema"
    | "content"
    | "internal_links"
    | "competitor";
  title: string;
  detail: string;
  affectedUrls: string[];
};

export type SeoRecommendation = {
  area:
    | "titles"
    | "meta_descriptions"
    | "faqs"
    | "internal_links"
    | "schema"
    | "content_improvements"
    | "topic_clusters"
    | "publishing";
  priority: "high" | "medium" | "low";
  suggestion: string;
  example?: string;
  targetUrl?: string;
};

/** Weekly snapshot stored at `seoWeekly/{weekId}`. */
export type SeoWeeklyDoc = {
  weekId: string; // YYYY-MM-DD (IST) for week ending date (yesterday IST)
  generatedAt: string;
  siteUrl: string;
  range: { startDateIst: string; endDateIst: string; days: number };
  rangePrev: { startDateIst: string; endDateIst: string; days: number };
  topPages: SeoPageRow[];
  topQueries: SeoQueryRow[];
  audits: SeoPageAudit[];
  issues: SeoIssue[];
  competitorGaps: {
    configured: boolean;
    note: string;
    examples: { query: string; competitorDomains: string[] }[];
  };
};

/** AI report stored at `seoWeeklyReports/{weekId}`. */
export type SeoWeeklyReportDoc = {
  weekId: string;
  generatedAt: string;
  summaryMarkdown: string;
  summaryPlain: string;
  openaiModel: string;
  recommendations: SeoRecommendation[];
  blogTopicsToQueue: { title: string; serviceSlug?: string; language?: "en" | "hi" | "hinglish" }[];
};

