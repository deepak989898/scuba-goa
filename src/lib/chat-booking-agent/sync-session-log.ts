"use client";

type SyncPayload = {
  sessionId: string;
  language: string;
  messages: Array<{
    role: "user" | "assistant";
    text: string;
    at: string;
    step?: string;
  }>;
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
  converted?: boolean;
  paymentId?: string;
};

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let inflight = false;

export function scheduleBookWithUsSessionSync(payload: SyncPayload): void {
  if (typeof window === "undefined") return;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    void flushBookWithUsSessionSync(payload);
  }, 1200);
}

export async function flushBookWithUsSessionSync(
  payload: SyncPayload,
): Promise<void> {
  if (inflight) return;
  inflight = true;
  try {
    await fetch("/api/chat/booking-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* best-effort */
  } finally {
    inflight = false;
  }
}
