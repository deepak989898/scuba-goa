import type { LeadTemperature, RecoveryLeadDoc } from "@/lib/recovery-agent/types";

export function computeLeadScore(signals: RecoveryLeadDoc["signals"]): {
  score: number;
  temperature: LeadTemperature;
} {
  let score = 0;
  const s = signals;

  if (s.checkoutStarted > 0) score += 35;
  if (s.paymentFailed > 0 || s.checkoutDismissed > 0) score += 25;
  if (s.verifyFailed > 0) score += 15;
  if (s.whatsappClicks > 0) score += 12;
  if (s.bookingPageViews >= 2) score += 10;
  if (s.pricingPageViews >= 2) score += 8;
  if (s.sessionCount >= 2) score += 6;
  if (s.totalDwellSec >= 120) score += 5;
  if (s.lastAmountPaise && s.lastAmountPaise >= 500000) score += 8;

  score = Math.min(100, score);

  let temperature: LeadTemperature = "cold";
  if (score >= 70) temperature = "hot";
  else if (score >= 40) temperature = "warm";

  return { score, temperature };
}
