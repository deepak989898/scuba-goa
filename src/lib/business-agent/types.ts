export type BusinessAgentRunDoc = {
  runId: string;
  runAt: string;
  dateIst: string; // main analysis day (IST)
  inputs: {
    aiAnalyticsDaily?: { dateIst: string };
    conversionOptDaily?: { dateIst: string };
    seoWeeklyReports?: { weekId: string };
  };
  decisionSummary: string;
};

export type BusinessAgentActionStatus =
  | "proposed"
  | "pending_approval"
  | "approved"
  | "applied"
  | "rejected"
  | "failed";

export type BusinessAgentActionRisk = "safe" | "requires_approval";

export type BusinessAgentAction = {
  actionId: string;
  runId: string;
  createdAt: string;

  /** What we want to do. */
  kind:
    | "seo_meta_update"
    | "seo_content_update"
    | "service_copy_update"
    | "blog_content_update"
    | "manual_only";

  /** Safety classification. */
  risk: BusinessAgentActionRisk;

  status: BusinessAgentActionStatus;

  /** Editable target. */
  target: {
    collection: "seoPages" | "blogPosts" | "services" | string;
    docId: string;
  };

  /** If risk === safe: patch is auto-applied immediately. */
  patch?: Record<string, unknown>;

  /** Why the agent decided this. */
  reason: string;

  /** Rollback/version info (stored separately). */
  lastRollbackId?: string;
  approvedAt?: string;
  appliedAt?: string;
  rejectedAt?: string;
  error?: string;
};

export type BusinessAgentRollbackHistoryDoc = {
  rollbackId: string;
  createdAt: string;
  runId: string;

  target: { collection: string; docId: string };
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  appliedPatch: Record<string, unknown>;
  reason: string;
};

export type BusinessAgentReportDoc = {
  reportId: string; // `${dateIst}`
  dateIst: string;
  generatedAt: string;
  headline: string;
  summaryPlain: string;

  appliedActions: { kind: string; target: { collection: string; docId: string } }[];
  pendingActions: { kind: string; target: { collection: string; docId: string } }[];
  failedActions: { kind: string; error: string }[];
};

