import type {
  ConversionIssue,
  ConversionOptDailyDoc,
} from "@/lib/conversion-opt/types";

export function detectConversionIssues(
  doc: ConversionOptDailyDoc,
): ConversionIssue[] {
  const issues: ConversionIssue[] = [];
  const j = doc.journeyTotals;
  const funnel = doc.funnel;
  const bookingStep = funnel.find((s) => s.id === "booking_page");
  const checkoutStep = funnel.find((s) => s.id === "checkout_started");
  const paidStep = funnel.find((s) => s.id === "payment_success");

  if (j.whatsappClicks >= 5 && (paidStep?.count ?? 0) < 2) {
    issues.push({
      id: "whatsapp_not_converting",
      severity: "high",
      category: "trust",
      title: "Many WhatsApp clicks but few paid bookings",
      detail:
        "Visitors prefer chatting instead of paying online. Strengthen trust badges, reviews, and clear prices on the booking page. Consider a WhatsApp → booking follow-up script.",
      affectedPaths: ["/", "/booking", "/services/scuba-diving"],
    });
  }

  if (
    (bookingStep?.count ?? 0) >= 10 &&
    (checkoutStep?.count ?? 0) < Math.max(2, (bookingStep?.count ?? 0) * 0.15)
  ) {
    issues.push({
      id: "booking_page_dropoff",
      severity: "high",
      category: "pricing",
      title: "Booking page visitors not starting checkout",
      detail:
        "Users open /booking but rarely click Pay. Likely pricing confusion, long form, or missing pickup/date clarity. Show total price earlier and simplify cart summary.",
      affectedPaths: ["/booking"],
    });
  }

  if (j.paymentFailed >= 2 || j.verifyFailed >= 1) {
    issues.push({
      id: "payment_failures",
      severity: "high",
      category: "payment",
      title: "Payment failures detected",
      detail:
        "Razorpay failures or verify errors block revenue. Check test vs live keys, UPI/card errors, and show a clear retry + WhatsApp help message.",
      affectedPaths: ["/booking"],
    });
  }

  if (j.mobileBouncePct >= 60 && j.mobileSessions >= 10) {
    issues.push({
      id: "mobile_bounce",
      severity: "high",
      category: "mobile",
      title: "High mobile bounce rate",
      detail:
        "Mobile users leave quickly. Improve sticky Book/WhatsApp bar, larger tap targets, faster hero load, and shorter forms on small screens.",
      affectedPaths: ["/", "/services", "/booking"],
    });
  }

  for (const p of doc.lowPerformingPages.slice(0, 3)) {
    if (p.avgDwellSec < 10 && p.views >= 8) {
      issues.push({
        id: `fast_exit_${p.path.replace(/\//g, "_")}`,
        severity: "medium",
        category: "speed",
        title: `Users leave quickly: ${p.path}`,
        detail: `Average time on page is only ${p.avgDwellSec}s. Page may feel slow, unclear, or missing price. Add a clear headline and CTA above the fold.`,
        affectedPaths: [p.path],
      });
    }
    if (p.avgScrollPct < 35 && p.views >= 8) {
      issues.push({
        id: `low_scroll_${p.path.replace(/\//g, "_")}`,
        severity: "medium",
        category: "content",
        title: `Low scroll depth: ${p.path}`,
        detail: `Users only scroll ~${p.avgScrollPct}% — headline or hero may not hook them. Test stronger scuba/Goa benefit in the first screen.`,
        affectedPaths: [p.path],
      });
    }
  }

  const ctaStep = funnel.find((s) => s.id === "cta_click");
  const scrollStep = funnel.find((s) => s.id === "engaged_scroll");
  if (
    (scrollStep?.count ?? 0) >= 20 &&
    (ctaStep?.count ?? 0) < (scrollStep?.count ?? 0) * 0.1
  ) {
    issues.push({
      id: "weak_cta",
      severity: "medium",
      category: "cta",
      title: "Weak call-to-action buttons",
      detail:
        "Users scroll but rarely click Book or WhatsApp. Make buttons brighter, repeat CTA after pricing sections, and use action text like 'Book scuba — ₹2,499'.",
      affectedPaths: doc.topLandingPages.slice(0, 3).map((x) => x.path),
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "no_major_issues",
      severity: "low",
      category: "content",
      title: "No critical conversion blockers today",
      detail: "Keep monitoring funnel drop-offs and A/B test headlines on top landing pages.",
      affectedPaths: [],
    });
  }

  return issues.slice(0, 10);
}
