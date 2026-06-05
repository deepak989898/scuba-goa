# AI Analytics Agent — Book Scuba Goa

Production analytics pipeline that rolls up traffic, bookings, payments, and SEO data into Firestore, generates an OpenAI daily report, and sends alerts.

## Architecture

```
Vercel Cron (04:00 UTC daily)
    → GET /api/cron/analytics-daily
        → aggregate Firestore (pageViews, sessions, bookings, paymentEvents)
        → optional GA4 Data API
        → optional Google Search Console API
        → Clarity (dashboard link only — no public metrics API)
        → OpenAI report
        → save aiAnalyticsDaily/{dateIst} + aiAnalyticsReports/{dateIst}
        → Telegram / email / WhatsApp (optional)

Admin UI: /admin/ai-analytics
Manual run: POST /api/admin/ai-analytics/run
```

## Firestore collections

| Collection | Doc ID | Written by |
|------------|--------|------------|
| `aiAnalyticsDaily` | `YYYY-MM-DD` (IST) | Cron + admin run |
| `aiAnalyticsReports` | same date | Cron + admin run |
| `paymentEvents` | auto | `/api/analytics/payment-event`, Razorpay verify |

Existing collections used as sources: `pageViews`, `analyticsSessions`, `bookings`, `marketingLeads`.

## Environment variables

Add to Vercel (Production):

```env
# Required (already on site)
FIREBASE_SERVICE_ACCOUNT_KEY=...
OPENAI_API_KEY=...
CRON_SECRET=...

# GA4 Data API — numeric Property ID (not G- measurement ID)
# GA4 → Admin → Property settings → Property ID
GOOGLE_ANALYTICS_PROPERTY_ID=123456789

# Search Console — exact property URL as in GSC
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://bookscubagoa.com/

# Optional: dedicated service account JSON (else uses FIREBASE_SERVICE_ACCOUNT_KEY)
GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON=

# Daily report delivery
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
AI_ANALYTICS_REPORT_EMAIL=support@bookscubagoa.com
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Optional WhatsApp Cloud API (Meta Business)
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_REPORT_RECIPIENT=918354075026

# Clarity — already on site via NEXT_PUBLIC_CLARITY_PROJECT_ID (recordings in Clarity UI)
```

## Google API access (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com/), enable:
   - **Google Analytics Data API**
   - **Google Search Console API**
2. Use the same service account email as Firebase (`client_email` in `FIREBASE_SERVICE_ACCOUNT_KEY`).
3. **GA4:** Admin → Property access → Add user → Viewer.
4. **Search Console:** Settings → Users → Add user → Full (or Restricted).

## Cron

`vercel.json`:

```json
{ "path": "/api/cron/analytics-daily", "schedule": "0 4 * * *" }
```

Runs for **yesterday (IST)** so the day is complete.

## Admin

- **Dashboard:** `/admin/ai-analytics`
- **Generate now:** button calls `POST /api/admin/ai-analytics/run`
- **Live visitors:** `/admin/analytics` (real-time Firestore)

## Microsoft Clarity

Clarity does not expose a public REST API for daily bounce/users. The agent:

- Tracks that Clarity is configured on the site
- Links to the Clarity project dashboard for session replay
- Uses internal Firestore + GA4 for numeric daily metrics

## Payment funnel

`BookingForm` logs: `checkout_started`, `checkout_dismissed`, `payment_failed`, `verify_failed`.  
`razorpay/verify` logs: `payment_success`.

## Deploy checklist

1. Deploy code + `firestore.rules`
2. Set env vars above
3. Add GA4 + GSC access for service account
4. Create Telegram bot → get `TELEGRAM_CHAT_ID`
5. Click **Generate report now** in admin to test
6. Confirm cron in Vercel → Cron Jobs tab
