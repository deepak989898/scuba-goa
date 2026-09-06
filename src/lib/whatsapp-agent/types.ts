export type WhatsAppBookingStep =
  | "idle"
  | "collecting_date"
  | "collecting_people"
  | "collecting_activity"
  | "ready_to_book";

export type WhatsAppBookingSession = {
  phone: string;
  step: WhatsAppBookingStep;
  preferredDate: string;
  people: number;
  activityInterest: string;
  customerName: string;
  handoffUntil: string | null;
  lastInboundAt: string;
  updatedAt: string;
  createdAt: string;
};

export const DEFAULT_WHATSAPP_BOOKING_SESSION = (
  phone: string,
): WhatsAppBookingSession => ({
  phone,
  step: "idle",
  preferredDate: "",
  people: 0,
  activityInterest: "",
  customerName: "",
  handoffUntil: null,
  lastInboundAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
});
