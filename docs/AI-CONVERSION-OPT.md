# AI Conversion Optimization — Book Scuba Goa

Tracks the full booking journey, detects conversion blockers, and generates daily OpenAI suggestions.

## Architecture

```
Site (AnalyticsTracker)
    → scroll depth (25/50/75/100%)
    → CTA / WhatsApp / phone clicks (clickCategory)
    → page exits (maxScrollDepthPct, durationMs)
    → POST /api/analytics/track → Firestore pageViews

BookingForm + Razorpay
    → POST /api/analytics/payment-event → Firestore paymentEvents

Vercel Cron (04:00 UTC daily)
    → GET /api/cron/analytics-daily
        → aggregateConversionFunnel (pageViews + paymentEvents)
        → detectConversionIssues (trust, speed, pricing, CTA, mobile, payment)
        → OpenAI suggestions
        → save conversionOptDaily/{dateIst} + conversionOptReports/{dateIst}

Admin UI: /admin/conversion-opt
Manual run: POST /api/admin/conversion-opt/run
```

## Firestore collections

| Collection | Doc ID | Written by |
|------------|--------|------------|
| `conversionOptDaily` | `YYYY-MM-DD` (IST) | Cron + admin run |
| `conversionOptReports` | same date | Cron + admin run (needs OpenAI) |

Source data: `pageViews` (views, scroll, click, leave), `paymentEvents`.

## Journey tracking

| Signal | How |
|--------|-----|
| Landing page | `landingPath` on first view per session |
| Scroll depth | `scroll` events at 25/50/75/100% |
| CTA clicks | `click` + `clickCategory`: `book_cta`, `service_cta` |
| WhatsApp | `clickCategory: whatsapp` |
| Booking attempts | visit `/booking` + `checkout_started` payment event |
| Payment failures | `payment_failed`, `verify_failed`, `checkout_dismissed` |
| Page exits | `leave` + `maxScrollDepthPct` + `durationMs` |

## Issue detection (rules-based)

- WhatsApp clicks without paid bookings → trust
- Booking page without checkout → pricing / form friction
- Payment failures → payment config / UX
- High mobile bounce → mobile UX
- Low scroll / fast exit on pages → speed / weak headline
- Scroll without CTA clicks → weak buttons

## OpenAI recommendations

Areas: headings, booking buttons, trust, pricing display, mobile conversion.

Uses `OPENAI_API_KEY` and optional `AI_ANALYTICS_OPENAI_MODEL` (default `gpt-4o-mini`).

## Admin dashboard

`/admin/conversion-opt` shows:

- Conversion funnel with drop-off %
- Journey totals (WhatsApp, CTA, checkout, payments)
- Detected issues
- AI daily summary + recommendations
- Top / low performing pages
- Top landing pages

## Deploy checklist

1. Deploy site (tracker changes go live on next visit).
2. Ensure `OPENAI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_KEY` on Vercel.
3. Deploy `firestore.rules` (`conversionOptDaily`, `conversionOptReports` read for admins).
4. No Firestore composite index is required for the admin dashboard (reports are sorted in memory).
4. Browse site: scroll, click Book/WhatsApp, try booking flow.
5. Admin → **Conversion AI** → **Generate suggestions now**.

## Related

- Traffic + SEO agent: `docs/AI-ANALYTICS-AGENT.md`, `/admin/ai-analytics`
- Live visitors: `/admin/analytics`
