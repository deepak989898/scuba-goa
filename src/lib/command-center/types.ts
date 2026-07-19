export type AgentId =
  | "seo"
  | "analytics"
  | "booking"
  | "marketing"
  | "reputation"
  | "competitor"
  | "pricing";

export type AgentStatus = "idle" | "running" | "ok" | "error" | "skipped";

export type CommandCenterAgentMeta = {
  id: AgentId;
  name: string;
  description: string;
  adminPath: string;
  cronPath?: string;
  cronSchedule?: string;
  pipelineFn?: string;
};

export type CommandCenterTaskPriority = "critical" | "high" | "medium" | "low";

export type CommandCenterTaskStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type CommandCenterTask = {
  taskId: string;
  dateIst: string;
  agentId: AgentId;
  priority: CommandCenterTaskPriority;
  status: CommandCenterTaskStatus;
  title: string;
  description: string;
  sourceActionId?: string;
  sourceCollection?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
};

export type CommandCenterAgentLog = {
  logId: string;
  runId: string;
  dateIst: string;
  agentId: AgentId;
  action: string;
  status: AgentStatus;
  summary: string;
  createdAt: string;
  details?: Record<string, unknown>;
};

export type CommandCenterInsight = {
  insightId: string;
  runId: string;
  dateIst: string;
  fromAgent: AgentId;
  toAgents: AgentId[];
  topic: string;
  message: string;
  priority: CommandCenterTaskPriority;
  createdAt: string;
};

export type CommandCenterDecision = {
  decisionId: string;
  runId: string;
  dateIst: string;
  title: string;
  reasoning: string;
  affectedAgents: AgentId[];
  priority: CommandCenterTaskPriority;
  requiresApproval: boolean;
  relatedTaskIds: string[];
  createdAt: string;
};

export type CommandCenterAlert = {
  alertId: string;
  runId: string;
  dateIst: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  agentId: AgentId;
  createdAt: string;
};

export type CommandCenterMemoryCategory =
  | "business"
  | "seo"
  | "campaigns"
  | "bookings"
  | "customers"
  | "decisions";

export type CommandCenterMemoryEntry = {
  at: string;
  dateIst: string;
  summary: string;
  data?: Record<string, unknown>;
};

export type CommandCenterMemoryDoc = {
  category: CommandCenterMemoryCategory;
  entries: CommandCenterMemoryEntry[];
  updatedAt: string;
};

export type CommandCenterRunDoc = {
  runId: string;
  runAt: string;
  dateIst: string;
  agentResults: Record<AgentId, { status: AgentStatus; summary: string }>;
  tasksCreated: number;
  insightsShared: number;
  decisionsCount: number;
  alertsCount: number;
  summary: string;
};

export type CommandCenterReportDoc = {
  reportId: string;
  dateIst: string;
  generatedAt: string;
  headline: string;
  summaryMarkdown: string;
  summaryPlain: string;
  agentStatuses: Record<AgentId, AgentStatus>;
  topPriorities: string[];
  revenueSnapshot: {
    bookingsPaid: number;
    revenueInr: number;
    conversionRatePct: number;
  };
  seoSnapshot: {
    clicks: number;
    impressions: number;
    position: number;
    asOfDate?: string;
    source?: string;
    note?: string;
  };
  pendingApprovals: number;
  openaiModel?: string;
};

export type CommandCenterSettings = {
  enabled: boolean;
  masterAiEnabled: boolean;
  autoCreateTasks: boolean;
  conflictPrevention: boolean;
  notifyTelegram: boolean;
};

export const DEFAULT_COMMAND_CENTER_SETTINGS: CommandCenterSettings = {
  enabled: true,
  masterAiEnabled: true,
  autoCreateTasks: true,
  conflictPrevention: true,
  notifyTelegram: true,
};

export type AgentSnapshot = {
  agentId: AgentId;
  status: AgentStatus;
  lastRunAt?: string;
  summary: string;
  data: Record<string, unknown>;
};

export type MasterAiOutput = {
  headline: string;
  summaryMarkdown: string;
  summaryPlain: string;
  topPriorities: string[];
  decisions: Omit<CommandCenterDecision, "decisionId" | "runId" | "dateIst" | "createdAt">[];
  insights: Omit<CommandCenterInsight, "insightId" | "runId" | "dateIst" | "createdAt">[];
  alerts: Omit<CommandCenterAlert, "alertId" | "runId" | "dateIst" | "createdAt">[];
  tasks: Omit<CommandCenterTask, "taskId" | "dateIst" | "createdAt" | "status">[];
};
