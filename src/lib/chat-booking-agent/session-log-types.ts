export type BookWithUsChatMessage = {
  role: "assistant" | "user";
  text: string;
  at: string;
  step?: string;
};

export type BookWithUsChatSession = {
  id: string;
  sessionId: string;
  language: string;
  messages: BookWithUsChatMessage[];
  step: string;
  tripDate?: string;
  people?: number;
  pickup?: string;
  selectedPackages?: string[];
  customerName?: string;
  phone?: string;
  email?: string;
  cartTotalInr?: number;
  paidInr?: number;
  converted: boolean;
  paymentId?: string;
  /** IST calendar day for admin grouping */
  activityDate: string;
  createdAt: string;
  updatedAt: string;
};

export type BookWithUsChatDaySummary = {
  date: string;
  label: string;
  sessionCount: number;
  convertedCount: number;
};

export const BOOK_WITH_US_CHAT_COLLECTION = "bookWithUsChatSessions";
