/** Daily snapshot stored at `aiAnalyticsDaily/{dateIst}` (IST calendar date). */
export type AiAnalyticsDailyDoc = {
  dateIst: string;
  generatedAt: string;
  internal: InternalDailyMetrics;
  ga4: Ga4DailySnapshot | null;
  searchConsole: SearchConsoleDailySnapshot | null;
  clarity: ClarityDailySnapshot;
  insights: AnalyticsInsights;
  connectorsStatus: ConnectorsStatus;
};

export type InternalDailyMetrics = {
  /** Confirmed humans (same definition as Site analytics Humans tab). Alias of visitorsHuman. */
  visitors: number;
  visitorsHuman: number;
  visitorsSuspected: number;
  visitorsBot: number;
  visitorsAll: number;
  /** Human page views (business total). */
  pageViews: number;
  pageViewsAll: number;
  bounceRatePct: number;
  avgSessionDurationSec: number;
  bookingsPaid: number;
  bookingRevenueInr: number;
  bookingConversionRatePct: number;
  whatsappClicks: number;
  phoneClicks: number;
  bookingPageViews: number;
  paymentSuccess: number;
  paymentFailed: number;
  paymentDismissed: number;
  verifyFailed: number;
  topPages: PageMetric[];
  exitPages: PageMetric[];
  trafficSources: TrafficSourceMetric[];
};

export type PageMetric = {
  path: string;
  views: number;
  visitors?: number;
};

export type TrafficSourceMetric = {
  channel: string;
  label: string;
  sessions: number;
};

export type Ga4DailySnapshot = {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  bounceRate: number;
  averageSessionDuration: number;
  propertyId: string;
};

export type SearchConsoleDailySnapshot = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: { query: string; clicks: number; impressions: number }[];
  siteUrl: string;
};

export type ClarityDailySnapshot = {
  configured: boolean;
  projectId: string;
  note: string;
  dashboardUrl: string;
};

export type AnalyticsInsights = {
  highTrafficLowConversion: HighTrafficLowConversionPage[];
  exitRiskPages: ExitRiskPage[];
  recommendations: string[];
};

export type HighTrafficLowConversionPage = {
  path: string;
  views: number;
  bookingStarts: number;
  conversionRatePct: number;
  likelyIssue: string;
};

export type ExitRiskPage = {
  path: string;
  exitCount: number;
  avgDwellSec: number;
  likelyReason: string;
};

export type ConnectorStatus = "ok" | "skipped" | "error";

export type ConnectorsStatus = {
  ga4: ConnectorStatus;
  ga4Message?: string;
  searchConsole: ConnectorStatus;
  searchConsoleMessage?: string;
  clarity: "dashboard_only";
};

/** AI report at `aiAnalyticsReports/{dateIst}`. */
export type AiAnalyticsReportDoc = {
  dateIst: string;
  generatedAt: string;
  summaryMarkdown: string;
  summaryPlain: string;
  openaiModel: string;
  /** Short email/Telegram headline */
  headline?: string;
  /** Validated "Tomorrow's 3 actions" (path/number specific) */
  actions?: string[];
  notifications: {
    telegram?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  };
};

export type PaymentEventType =
  | "checkout_started"
  | "payment_success"
  | "payment_failed"
  | "checkout_dismissed"
  | "verify_failed";
