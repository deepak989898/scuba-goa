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
  gscClicks7d: number;
  gscImpressions7d: number;
  ga4Status: string;
  ga4Message: string;
  recommendations: string[];
  manualSteps: string[];
};
