import type {
  AnalyticsInsights,
  InternalDailyMetrics,
} from "@/lib/ai-analytics/types";

function issueForPath(path: string): string {
  if (path === "/booking") {
    return "Users reach checkout but may drop at payment — check Razorpay errors, promo rules, and mobile UX.";
  }
  if (path.startsWith("/services/")) {
    return "High interest in this activity but few bookings — add clearer price, inclusions, and a stronger CTA to /booking.";
  }
  if (path.startsWith("/blog/") || path.startsWith("/guides/")) {
    return "SEO traffic without conversion — add pricing table, WhatsApp CTA, and link to /booking above the fold.";
  }
  if (path === "/" || path === "/services") {
    return "Homepage or services hub traffic — ensure hero CTA, trust signals, and limited-time offer are visible.";
  }
  return "Review page content, load speed, and add a direct Book now or WhatsApp path.";
}

export function buildAnalyticsInsights(
  internal: InternalDailyMetrics,
): AnalyticsInsights {
  const highTrafficLowConversion = internal.topPages
    .filter((p) => p.views >= 5)
    .map((p) => {
      const bookingStarts =
        p.path === "/booking" ? internal.paymentSuccess + internal.paymentFailed : 0;
      const rate =
        p.views > 0
          ? Math.round((internal.bookingsPaid / p.views) * 10000) / 100
          : 0;
      return {
        path: p.path,
        views: p.views,
        bookingStarts,
        conversionRatePct: p.path === "/booking" ? rate : rate,
        likelyIssue: issueForPath(p.path),
      };
    })
    .filter((p) => p.views >= 10 && p.conversionRatePct < 2)
    .slice(0, 8);

  const exitRiskPages = internal.exitPages.slice(0, 8).map((p) => ({
    path: p.path,
    exitCount: p.views,
    avgDwellSec: internal.avgSessionDurationSec,
    likelyReason:
      p.path === "/booking"
        ? "Payment friction, form length, or trust concerns before paying."
        : p.path.startsWith("/blog/") || p.path.startsWith("/guides/")
          ? "Informational content without a next step — user got answer and left."
          : "Content may not answer price/availability questions — add FAQ and CTA.",
  }));

  const recommendations: string[] = [];

  if (internal.bounceRatePct > 55) {
    recommendations.push(
      `Bounce rate is ${internal.bounceRatePct}% — improve mobile speed, hero clarity, and first-screen booking CTA.`,
    );
  }
  if (internal.whatsappClicks > internal.bookingsPaid * 2 && internal.bookingsPaid < 3) {
    recommendations.push(
      `${internal.whatsappClicks} WhatsApp clicks vs ${internal.bookingsPaid} paid bookings — tighten AI chatbot and WhatsApp scripts to push /booking.`,
    );
  }
  if (internal.paymentFailed > internal.paymentSuccess * 0.2) {
    recommendations.push(
      `${internal.paymentFailed} failed payments — check Razorpay test/live keys, UPI errors, and cart amount validation.`,
    );
  }
  if (internal.bookingPageViews > 20 && internal.bookingConversionRatePct < 3) {
    recommendations.push(
      "Booking page gets traffic but low site-wide conversion — simplify cart, show pickup info, and surface promo codes.",
    );
  }
  if (highTrafficLowConversion.length > 0) {
    recommendations.push(
      `Top leak: ${highTrafficLowConversion[0].path} (${highTrafficLowConversion[0].views} views, ~${highTrafficLowConversion[0].conversionRatePct}% conv).`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Traffic and conversion look stable — keep publishing SEO blogs and monitor Search Console queries.",
    );
  }

  return { highTrafficLowConversion, exitRiskPages, recommendations };
}
