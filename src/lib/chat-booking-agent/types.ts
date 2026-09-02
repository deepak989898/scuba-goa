import type { ServiceItem, SubServiceItem } from "@/data/services";

export type BookingFlowStep =
  | "welcome"
  | "date"
  | "people"
  | "pickup"
  | "category"
  | "packages"
  | "review"
  | "contact"
  | "payment"
  | "confirmed";

export type PickOption = {
  key: string;
  service: ServiceItem;
  sub?: SubServiceItem;
  subIndex?: number;
  title: string;
  price: number;
  image: string;
  short: string;
  includes: string[];
  duration: string;
  slotsLeft?: number;
  bookedToday?: number;
};

export type ChatBookingLine = {
  key: string;
  kind: "service";
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image?: string;
  duration?: string;
  slotsLeft?: number;
};

export type ChatBookingState = {
  step: BookingFlowStep;
  date: string;
  people: number;
  pickup: string;
  categoryId: string | null;
  selectedKeys: string[];
  name: string;
  phone: string;
  email: string;
  payMode: "min" | "full";
  /** Set after successful payment */
  confirmation?: {
    paymentId: string;
    paidInr: number;
    balanceInr: number;
    fullInr: number;
    packageName: string;
    emailSent: boolean;
    smsSent: boolean;
    invoiceDownloadUrl?: string;
  };
};

export type ChatBubble = {
  id: string;
  role: "assistant" | "user";
  text: string;
};
