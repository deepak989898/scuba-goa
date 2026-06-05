import type { AiAnalyticsDailyDoc } from "@/lib/ai-analytics/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Structured HTML email — easy for admin to scan on phone or desktop. */
export function buildAdminEmailHtml(
  snapshot: AiAnalyticsDailyDoc,
  aiHeadline?: string,
  aiActions?: string[],
): string {
  const m = snapshot.internal;
  const gsc = snapshot.searchConsole;
  const ga4 = snapshot.ga4;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";
  const date = snapshot.dateIst;

  const topPages = m.topPages
    .slice(0, 5)
    .map((p) => `<li><strong>${esc(p.path)}</strong> — ${p.views} views</li>`)
    .join("");

  const actions =
    (aiActions?.length ? aiActions : snapshot.insights.recommendations)
      .slice(0, 5)
      .map((a) => `<li>${esc(a)}</li>`)
      .join("");

  const gscBlock = gsc
    ? `<p>Google Search: <strong>${gsc.clicks}</strong> clicks · <strong>${gsc.impressions}</strong> impressions · position ${gsc.position.toFixed(1)}</p>`
    : `<p>Google Search: not connected — set GOOGLE_SEARCH_CONSOLE_SITE_URL in Vercel.</p>`;

  const ga4Block = ga4
    ? `<p>GA4: <strong>${ga4.activeUsers}</strong> users · <strong>${ga4.sessions}</strong> sessions · bounce ${ga4.bounceRate.toFixed(0)}%</p>`
    : "";

  const headline =
    aiHeadline ||
    `${m.bookingsPaid} booking(s) · ₹${m.bookingRevenueInr.toLocaleString("en-IN")} revenue · ${m.visitors} visitors`;

  return `<!DOCTYPE html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0c4a6e;max-width:560px;margin:0 auto;padding:16px;">
  <div style="background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;padding:20px;border-radius:12px 12px 0 0;">
    <p style="margin:0;font-size:12px;opacity:0.9;">Book Scuba Goa — Daily report</p>
    <h1 style="margin:8px 0 0;font-size:22px;">${esc(date)} (IST)</h1>
    <p style="margin:8px 0 0;font-size:15px;">${esc(headline)}</p>
  </div>
  <div style="border:1px solid #e0f2fe;border-top:0;padding:20px;border-radius:0 0 12px 12px;background:#fff;">
    <h2 style="font-size:14px;color:#0369a1;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Today's numbers</h2>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f9ff;">👥 Visitors</td><td style="text-align:right;font-weight:bold;padding:8px 0;border-bottom:1px solid #f0f9ff;">${m.visitors}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f9ff;">📄 Page views</td><td style="text-align:right;font-weight:bold;padding:8px 0;border-bottom:1px solid #f0f9ff;">${m.pageViews}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f9ff;">↩️ Bounce rate</td><td style="text-align:right;font-weight:bold;padding:8px 0;border-bottom:1px solid #f0f9ff;">${m.bounceRatePct}%</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f9ff;">✅ Paid bookings</td><td style="text-align:right;font-weight:bold;padding:8px 0;border-bottom:1px solid #f0f9ff;">${m.bookingsPaid}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f9ff;">💰 Revenue (₹)</td><td style="text-align:right;font-weight:bold;padding:8px 0;border-bottom:1px solid #f0f9ff;">${m.bookingRevenueInr.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f9ff;">📈 Conversion</td><td style="text-align:right;font-weight:bold;padding:8px 0;border-bottom:1px solid #f0f9ff;">${m.bookingConversionRatePct}%</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f9ff;">💬 WhatsApp clicks</td><td style="text-align:right;font-weight:bold;padding:8px 0;border-bottom:1px solid #f0f9ff;">${m.whatsappClicks}</td></tr>
      <tr><td style="padding:8px 0;">📞 Phone clicks</td><td style="text-align:right;font-weight:bold;padding:8px 0;">${m.phoneClicks}</td></tr>
    </table>

    <h2 style="font-size:14px;color:#0369a1;margin:24px 0 12px;text-transform:uppercase;">Payments</h2>
    <p style="margin:0;font-size:14px;">
      Success: <strong>${m.paymentSuccess}</strong> ·
      Failed: <strong style="color:${m.paymentFailed > 0 ? "#b91c1c" : "inherit"}">${m.paymentFailed}</strong> ·
      Closed without pay: <strong>${m.paymentDismissed}</strong> ·
      Booking page views: <strong>${m.bookingPageViews}</strong>
    </p>

    <h2 style="font-size:14px;color:#0369a1;margin:24px 0 12px;text-transform:uppercase;">Top pages</h2>
    <ul style="margin:0;padding-left:20px;font-size:14px;">${topPages || "<li>No data yet</li>"}</ul>

    <h2 style="font-size:14px;color:#0369a1;margin:24px 0 12px;text-transform:uppercase;">SEO &amp; GA4</h2>
    <div style="font-size:14px;">${gscBlock}${ga4Block}</div>

    <h2 style="font-size:14px;color:#0369a1;margin:24px 0 12px;text-transform:uppercase;">Do this tomorrow</h2>
    <ul style="margin:0;padding-left:20px;font-size:14px;">${actions || "<li>Keep monitoring — no urgent issues.</li>"}</ul>

    <p style="margin:24px 0 0;font-size:13px;">
      <a href="${esc(site)}/admin/ai-analytics" style="color:#0284c7;font-weight:bold;">Open full dashboard</a> ·
      <a href="https://clarity.microsoft.com/" style="color:#0284c7;">Microsoft Clarity</a> (project: ${esc(snapshot.clarity.projectId || "—")})
    </p>
  </div>
</body></html>`;
}

/** Plain-text version for Telegram / WhatsApp. */
export function buildAdminEmailPlain(
  snapshot: AiAnalyticsDailyDoc,
  aiHeadline?: string,
): string {
  const m = snapshot.internal;
  const gsc = snapshot.searchConsole;
  const lines = [
    `📊 Book Scuba Goa — ${snapshot.dateIst}`,
    "",
    aiHeadline || `Summary: ${m.bookingsPaid} bookings, ₹${m.bookingRevenueInr} revenue`,
    "",
    "NUMBERS",
    `Visitors: ${m.visitors}`,
    `Page views: ${m.pageViews}`,
    `Bounce: ${m.bounceRatePct}%`,
    `Bookings paid: ${m.bookingsPaid}`,
    `Revenue: ₹${m.bookingRevenueInr.toLocaleString("en-IN")}`,
    `Conversion: ${m.bookingConversionRatePct}%`,
    `WhatsApp clicks: ${m.whatsappClicks}`,
    "",
    "PAYMENTS",
    `Success ${m.paymentSuccess} · Failed ${m.paymentFailed} · Dismissed ${m.paymentDismissed}`,
    "",
    "TOP PAGES",
    ...m.topPages.slice(0, 5).map((p) => `• ${p.path} (${p.views})`),
  ];
  if (gsc) {
    lines.push("", `SEARCH: ${gsc.clicks} clicks, ${gsc.impressions} impressions`);
  }
  lines.push("", "ACTIONS");
  for (const a of snapshot.insights.recommendations.slice(0, 4)) {
    lines.push(`• ${a}`);
  }
  return lines.join("\n").slice(0, 3800);
}
