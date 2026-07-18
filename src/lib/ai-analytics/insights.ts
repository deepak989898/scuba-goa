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

function isOffTopicPath(path: string): boolean {
  const p = path.toLowerCase();
  return (
    p.includes("casino") ||
    p.includes("gambling") ||
    p.includes("betting") ||
    p.includes("poker")
  );
}

function shortPathLabel(path: string): string {
  if (path.length <= 48) return path;
  return `${path.slice(0, 45)}…`;
}

/**
 * Deterministic, path-specific actions for tomorrow — used as AI context
 * and as a fallback when the model returns generic advice.
 */
export function buildEvidenceBasedActions(
  internal: InternalDailyMetrics,
): string[] {
  const actions: string[] = [];
  const topExit = internal.exitPages[0];
  const topPage = internal.topPages[0];

  if (topExit && topExit.views >= 3) {
    if (isOffTopicPath(topExit.path)) {
      actions.push(
        `Fix top exit ${shortPathLabel(topExit.path)} (${topExit.views} leaves): add a clear scuba / water-sports booking box and links to /services/scuba-diving — this topic is off-brand and leaking visitors.`,
      );
    } else if (topExit.path === "/" || topExit.path === "") {
      actions.push(
        `Homepage is a top exit (${topExit.views} leaves) with bounce ${internal.bounceRatePct}% — tighten hero headline, show one Book Now CTA above the fold, and cut slow first-screen media.`,
      );
    } else if (topExit.path.startsWith("/services/")) {
      actions.push(
        `Service page ${shortPathLabel(topExit.path)} has ${topExit.views} exits — put price + inclusions + Book Now in the first screen, then WhatsApp as secondary.`,
      );
    } else if (topExit.path.startsWith("/blog/") || topExit.path.startsWith("/guides/")) {
      actions.push(
        `Blog/guide ${shortPathLabel(topExit.path)} exits ${topExit.views} times — add a sticky “Book scuba from ₹…” CTA and related package links before readers leave.`,
      );
    } else {
      actions.push(
        `Reduce exits on ${shortPathLabel(topExit.path)} (${topExit.views}) — clarify next step (Book / WhatsApp / call) and answer price questions on-page.`,
      );
    }
  }

  const serviceLeak = internal.exitPages.find((p) =>
    p.path.startsWith("/services/"),
  );
  if (
    serviceLeak &&
    (!topExit || serviceLeak.path !== topExit.path) &&
    serviceLeak.views >= 3 &&
    actions.length < 3
  ) {
    actions.push(
      `Improve ${shortPathLabel(serviceLeak.path)} (${serviceLeak.views} exits): show live price, trip duration, pickup note, and one primary Book button.`,
    );
  }

  if (internal.bounceRatePct > 55 && actions.length < 3) {
    const focus =
      topPage?.path === "/"
        ? "homepage first screen"
        : topPage
          ? shortPathLabel(topPage.path)
          : "top landing pages";
    actions.push(
      `Bounce is ${internal.bounceRatePct}% — speed up ${focus}, keep one clear booking CTA, and remove clutter above the fold.`,
    );
  }

  if (
    internal.whatsappClicks > Math.max(2, internal.bookingsPaid * 2) &&
    internal.bookingsPaid < 3 &&
    actions.length < 3
  ) {
    actions.push(
      `${internal.whatsappClicks} WhatsApp clicks vs ${internal.bookingsPaid} paid bookings — reply with a short booking link + package price, not long chat only.`,
    );
  }

  if (
    internal.paymentFailed > Math.max(1, internal.paymentSuccess * 0.2) &&
    actions.length < 3
  ) {
    actions.push(
      `${internal.paymentFailed} failed payments — check Razorpay live keys, UPI errors, and cart totals before tomorrow’s traffic peak.`,
    );
  }

  if (
    topPage &&
    topPage.path.startsWith("/blog/") &&
    topPage.views >= 5 &&
    actions.length < 3
  ) {
    actions.push(
      `Top blog ${shortPathLabel(topPage.path)} (${topPage.views} views) — add price table + link to matching /services or /packages page above the fold.`,
    );
  }

  if (actions.length === 0) {
    actions.push(
      `Promote top page ${shortPathLabel(topPage?.path ?? "/")} with a WhatsApp story that links straight to /booking.`,
    );
    actions.push(
      "Publish one SEO blog that answers a Search Console query and links to a bookable service.",
    );
    actions.push(
      "Review /booking on mobile: form length, trust badges, and promo code visibility.",
    );
  }

  while (actions.length < 3) {
    const nextExit = internal.exitPages[actions.length];
    if (nextExit && nextExit.views >= 2) {
      actions.push(
        `Review ${shortPathLabel(nextExit.path)} (${nextExit.views} exits) in Clarity — fix confusing layout or missing price/CTA.`,
      );
    } else {
      actions.push(
        "Keep publishing scuba / water-sports guides that link to live packages with prices.",
      );
      break;
    }
  }

  return actions.slice(0, 3);
}

export function buildAnalyticsInsights(
  internal: InternalDailyMetrics,
): AnalyticsInsights {
  const highTrafficLowConversion = internal.topPages
    .filter((p) => p.views >= 5)
    .map((p) => {
      const bookingStarts =
        p.path === "/booking"
          ? internal.paymentSuccess + internal.paymentFailed
          : 0;
      // Site-wide bookings / page views is only a rough “leak” signal for non-booking pages.
      const rate =
        p.views > 0
          ? Math.round((internal.bookingsPaid / p.views) * 10000) / 100
          : 0;
      return {
        path: p.path,
        views: p.views,
        bookingStarts,
        conversionRatePct: rate,
        likelyIssue: issueForPath(p.path),
      };
    })
    .filter((p) => {
      if (p.path === "/booking") return p.conversionRatePct < 5 && p.views >= 5;
      return p.views >= 5 && internal.bookingsPaid === 0;
    })
    .slice(0, 8);

  const exitRiskPages = internal.exitPages.slice(0, 8).map((p) => ({
    path: p.path,
    exitCount: p.views,
    avgDwellSec: internal.avgSessionDurationSec,
    likelyReason: isOffTopicPath(p.path)
      ? "Off-topic content for a scuba brand — visitors leave without seeing bookable trips."
      : p.path === "/booking"
        ? "Payment friction, form length, or trust concerns before paying."
        : p.path.startsWith("/blog/") || p.path.startsWith("/guides/")
          ? "Informational content without a next step — user got answer and left."
          : p.path.startsWith("/services/")
            ? "Service interest without a clear price/CTA — add Book Now and inclusions up top."
            : "Content may not answer price/availability questions — add FAQ and CTA.",
  }));

  const recommendations: string[] = [];

  if (internal.bounceRatePct > 55) {
    const landing = internal.topPages[0]?.path ?? "/";
    recommendations.push(
      `Bounce rate is ${internal.bounceRatePct}% (focus ${shortPathLabel(landing)}) — improve mobile speed, hero clarity, and first-screen booking CTA.`,
    );
  }

  for (const exit of internal.exitPages.slice(0, 3)) {
    if (exit.views < 3) continue;
    if (isOffTopicPath(exit.path)) {
      recommendations.push(
        `High exits on off-topic page ${shortPathLabel(exit.path)} (${exit.views}) — add scuba booking CTAs or reduce promotion of this URL.`,
      );
    } else if (exit.path.startsWith("/services/")) {
      recommendations.push(
        `${shortPathLabel(exit.path)} lost ${exit.views} visitors — show price, inclusions, and Book Now above the fold.`,
      );
    } else if (exit.path === "/") {
      recommendations.push(
        `Homepage exits: ${exit.views} — one primary Book Now CTA and clearer first-screen value.`,
      );
    } else if (exit.path.startsWith("/blog/") || exit.path.startsWith("/guides/")) {
      recommendations.push(
        `${shortPathLabel(exit.path)} exits ${exit.views}× — add pricing + WhatsApp + /booking links near the top.`,
      );
    }
  }

  if (
    internal.whatsappClicks > internal.bookingsPaid * 2 &&
    internal.bookingsPaid < 3
  ) {
    recommendations.push(
      `${internal.whatsappClicks} WhatsApp clicks vs ${internal.bookingsPaid} paid bookings — tighten chatbot/WhatsApp scripts to push /booking with a package price.`,
    );
  }
  if (internal.paymentFailed > internal.paymentSuccess * 0.2) {
    recommendations.push(
      `${internal.paymentFailed} failed payments — check Razorpay live keys, UPI errors, and cart amount validation.`,
    );
  }
  if (internal.bookingPageViews > 20 && internal.bookingConversionRatePct < 3) {
    recommendations.push(
      `Booking page had ${internal.bookingPageViews} views but only ${internal.bookingConversionRatePct}% site conversion — simplify cart, show pickup info, surface promos.`,
    );
  }
  if (highTrafficLowConversion.length > 0) {
    const leak = highTrafficLowConversion[0]!;
    recommendations.push(
      `Top leak: ${shortPathLabel(leak.path)} (${leak.views} views, ~${leak.conversionRatePct}% rough conv) — ${leak.likelyIssue}`,
    );
  }

  // De-dupe while preserving order
  const seen = new Set<string>();
  const unique = recommendations.filter((r) => {
    const key = r.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    unique.push(
      ...buildEvidenceBasedActions(internal).map(
        (a) => a.replace(/^Fix |^Improve |^Reduce /, "Action: "),
      ),
    );
  }

  return {
    highTrafficLowConversion,
    exitRiskPages,
    recommendations: unique.slice(0, 8),
  };
}

/** Detect vague marketing fluff that ignores the day's page data. */
export function isGenericAction(text: string): boolean {
  const t = text.toLowerCase();
  const genericPhrases = [
    "improve website content",
    "better engagement",
    "promote top pages on social",
    "promote on social media",
    "limited-time discount",
    "encourage bookings",
    "increase social media presence",
    "create more engaging content",
    "optimize your website",
    "focus on seo",
    "post regularly on",
  ];
  if (genericPhrases.some((p) => t.includes(p))) return true;
  // Must mention a concrete path, metric, or channel when possible
  const hasPath = t.includes("/") || t.includes("homepage") || t.includes("whatsapp");
  const hasNumber = /\d/.test(t);
  return !hasPath && !hasNumber && t.length < 80;
}

export function preferSpecificActions(
  aiActions: string[],
  evidenceActions: string[],
): string[] {
  const cleaned = aiActions.map((a) => a.trim()).filter(Boolean);
  const specific = cleaned.filter((a) => !isGenericAction(a));
  if (specific.length >= 3) return specific.slice(0, 3);
  const merged = [...specific];
  for (const e of evidenceActions) {
    if (merged.length >= 3) break;
    if (!merged.some((m) => m.slice(0, 40) === e.slice(0, 40))) {
      merged.push(e);
    }
  }
  return merged.slice(0, 3);
}
