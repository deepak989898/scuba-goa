export type FunnelStepId =
  | "sessions"
  | "engaged_scroll"
  | "cta_click"
  | "booking_page"
  | "checkout_started"
  | "payment_success";

export type FunnelStep = {
  id: FunnelStepId;
  label: string;
  count: number;
  dropOffFromPrev?: number;
  dropOffPct?: number;
};

export type PagePerformance = {
  path: string;
  views: number;
  exits: number;
  avgDwellSec: number;
  avgScrollPct: number;
  bookCtaClicks: number;
  whatsappClicks: number;
  bookingPageRatePct: number;
  score: "high" | "medium" | "low";
};

export type ConversionIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  category:
    | "trust"
    | "speed"
    | "pricing"
    | "cta"
    | "mobile"
    | "payment"
    | "content";
  title: string;
  detail: string;
  affectedPaths: string[];
};

export type ConversionRecommendation = {
  area: "headings" | "booking_buttons" | "trust" | "pricing" | "mobile";
  priority: "high" | "medium" | "low";
  suggestion: string;
  example?: string;
};

export type ConversionOptDailyDoc = {
  dateIst: string;
  generatedAt: string;
  funnel: FunnelStep[];
  topLandingPages: { path: string; sessions: number }[];
  topPerformingPages: PagePerformance[];
  lowPerformingPages: PagePerformance[];
  issues: ConversionIssue[];
  journeyTotals: {
    whatsappClicks: number;
    phoneClicks: number;
    bookCtaClicks: number;
    checkoutStarted: number;
    paymentFailed: number;
    paymentDismissed: number;
    verifyFailed: number;
    mobileSessions: number;
    mobileBouncePct: number;
  };
};

export type ConversionOptReportDoc = {
  dateIst: string;
  generatedAt: string;
  summaryPlain: string;
  recommendations: ConversionRecommendation[];
  openaiModel: string;
};
