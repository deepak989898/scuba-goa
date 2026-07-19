export type SeoHealthSeverity = "critical" | "warning" | "info";

export type SeoHealthIssue = {
  severity: SeoHealthSeverity;
  category: "sitemap" | "robots" | "canonical" | "metadata" | "indexing" | "gsc" | "ga4" | "schema" | "internal";
  message: string;
  fix?: string;
  path?: string;
};

export type SeoHealthReportDoc = {
  reportId: string;
  generatedAt: string;
  siteUrl: string;
  healthScore: number;
  sitemapUrlCount: number;
  issues: SeoHealthIssue[];
  pagesChecked: number;
  pagesMissingCanonical: string[];
  gscStatus: string;
  gscMessage: string;
  /** @deprecated use gscClicks — kept for older reports */
  gscClicks7d: number;
  /** @deprecated use gscImpressions — kept for older reports */
  gscImpressions7d: number;
  gscClicks: number;
  gscImpressions: number;
  gscPeriodId: string;
  gscPeriodLabel: string;
  gscStartDateIst: string;
  gscEndDateIst: string;
  ga4Status: string;
  ga4Message: string;
  ga4ActiveUsers?: number;
  ga4Sessions?: number;
  recommendations: string[];
  manualSteps: string[];
};
