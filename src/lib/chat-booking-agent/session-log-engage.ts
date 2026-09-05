import type { BookWithUsChatMessage } from "./session-log-types";

/** True once the visitor actually starts the flow (not auto-welcome only). */
export function isEngagedChatSession(input: {
  step?: string;
  messages?: BookWithUsChatMessage[];
  converted?: boolean;
  customerName?: string;
  phone?: string;
  email?: string;
  tripDate?: string;
  people?: number;
  selectedPackages?: string[];
}): boolean {
  if (input.converted) return true;
  if (input.step && input.step !== "welcome") return true;
  if (input.messages?.some((m) => m.role === "user")) return true;
  if (input.customerName?.trim()) return true;
  if ((input.phone?.replace(/\D/g, "") ?? "").length >= 10) return true;
  const email = input.email?.trim() ?? "";
  if (email.includes("@") && email.includes(".")) return true;
  if (input.tripDate?.trim()) return true;
  if ((input.people ?? 0) > 0) return true;
  if ((input.selectedPackages?.length ?? 0) > 0) return true;
  return false;
}
