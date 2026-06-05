export type LeadTemperature = "hot" | "warm" | "cold";

export type RecoveryLeadStatus =
  | "active"
  | "recovered"
  | "converted"
  | "opted_out";

export type RecoveryLeadDoc = {
  leadId: string;
  sessionId: string;
  phone?: string;
  name?: string;
  email?: string;
  status: RecoveryLeadStatus;
  temperature: LeadTemperature;
  score: number;
  signals: {
    whatsappClicks: number;
    bookingPageViews: number;
    checkoutStarted: number;
    paymentFailed: number;
    checkoutDismissed: number;
    verifyFailed: number;
    pricingPageViews: number;
    sessionCount: number;
    totalDwellSec: number;
    lastAmountPaise?: number;
  };
  lastPath?: string;
  landingPath?: string;
  lastEventAt: string;
  createdAt: string;
  updatedAt: string;
  convertedAt?: string;
  recovery: {
    attempts: number;
    lastSentAt?: string;
    nextEligibleAt?: string;
    lastMessage?: string;
  };
};

export type RecoveryAbandonedDoc = {
  id: string;
  leadId: string;
  sessionId: string;
  phone?: string;
  eventType: string;
  amountPaise?: number;
  path?: string;
  createdAt: string;
};

export type RecoveryConversationDoc = {
  conversationId: string;
  sessionId: string;
  leadId?: string;
  language: string;
  messages: { role: "user" | "assistant"; text: string; at: string }[];
  updatedAt: string;
  createdAt: string;
};

export type RecoveryCampaignDoc = {
  campaignId: string;
  leadId: string;
  phone: string;
  message: string;
  status: "queued" | "sent" | "failed" | "skipped";
  reason?: string;
  createdAt: string;
  sentAt?: string;
};

export type RecoveryWhatsappEventDoc = {
  id: string;
  direction: "outbound" | "inbound";
  phone: string;
  leadId?: string;
  message: string;
  status: "sent" | "failed";
  createdAt: string;
};

export type RecoveryAgentSettings = {
  enabled: boolean;
  recoveryDelayMinutes: number;
  maxRecoveryAttempts: number;
  urgencyEnabled: boolean;
  rateLimitPerPhonePerHour: number;
  hotLeadScoreThreshold: number;
};

export const DEFAULT_RECOVERY_SETTINGS: RecoveryAgentSettings = {
  enabled: true,
  recoveryDelayMinutes: 45,
  maxRecoveryAttempts: 2,
  urgencyEnabled: true,
  rateLimitPerPhonePerHour: 2,
  hotLeadScoreThreshold: 70,
};
