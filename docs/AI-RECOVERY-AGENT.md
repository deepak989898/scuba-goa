# WhatsApp + Booking Recovery AI — Book Scuba Goa

Lead tracking, abandoned-checkout recovery via WhatsApp, AI chat with memory, lead scoring, and admin dashboard.

## Architecture

```
Site (AnalyticsTracker + BookingForm)
    → WhatsApp clicks, pricing/booking views, checkout events
    → POST /api/analytics/track + /api/analytics/payment-event
    → upsertRecoveryLead() → Firestore recoveryLeads

Marketing form / Razorpay verify
    → link phone to session lead, mark converted

Site chatbot (AiChatbot)
    → POST /api/chat (sessionId + language)
    → recoveryConversations + recoveryAiResponses

Vercel Cron (hourly :15 UTC)
    → GET /api/cron/recovery-hourly
        → runRecoveryAgentPipeline()
        → score leads, generate OpenAI recovery copy, send Meta WhatsApp API
        → recoveryCampaigns + recoveryWhatsappEvents
        → Telegram alerts for hot leads / payment spikes

Admin: /admin/recovery-agent
    → GET /api/admin/recovery-agent/dashboard
    → POST /api/admin/recovery-agent/run
    → POST /api/admin/recovery-agent/settings
```

## Firestore collections

| Collection | Doc ID | Purpose |
|------------|--------|---------|
| `recoveryLeads` | `phone_{digits}` or `sid_{sessionId}` | Lead profile, signals, score, recovery state |
| `recoveryAbandonedBookings` | auto | Checkout/payment abandon events |
| `recoveryConversations` | `conv_{sessionId}` | Chatbot message history |
| `recoveryCampaigns` | auto | Outbound recovery message queue/log |
| `recoveryWhatsappEvents` | auto | All WhatsApp send attempts |
| `recoveryAiResponses` | auto | OpenAI prompt/response audit log |
| `recoveryAgent/settings` | fixed doc | Delay, rate limits, urgency toggle |

## Lead signals & scoring

Signals incremented on analytics/payment events:

- WhatsApp clicks, booking/pricing page views, checkout started
- Payment failed, verify failed, checkout dismissed
- Session count, dwell time on booking page

Temperature: **hot** / **warm** / **cold** from composite score. Hot leads trigger Telegram alerts when configured.

## Recovery pipeline

1. Find leads with phone, status `active`, eligible `nextEligibleAt`
2. Respect `recoveryDelayMinutes`, `maxRecoveryAttempts`, `rateLimitPerPhonePerHour`
3. OpenAI generates personalized recovery message (trust + assistance + optional urgency)
4. Send via Meta Cloud API (`META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`)
5. Log campaign + WhatsApp event; increment recovery attempts

## Safe automation

- Per-phone hourly rate limit (settings)
- Max recovery attempts per lead
- Configurable delay before first message
- All sends logged to Firestore
- Admin manual run + settings UI (no client writes to recovery collections)

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Yes | Recovery copy + chatbot |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes | Lead + conversation storage |
| `CRON_SECRET` | Yes | Cron auth |
| `META_WHATSAPP_TOKEN` | For WhatsApp send | Meta Business API |
| `META_WHATSAPP_PHONE_NUMBER_ID` | For WhatsApp send | Phone number ID |
| `TELEGRAM_BOT_TOKEN` | Alerts | Hot lead / spike notifications |
| `TELEGRAM_CHAT_ID` | Alerts | Destination chat |

## Admin

- **Dashboard:** `/admin/recovery-agent`
- **Manual run:** POST `/api/admin/recovery-agent/run`
- **Settings:** POST `/api/admin/recovery-agent/settings`

## Testing locally

1. Browse site with DevTools → confirm `bsg_analytics_sid` in sessionStorage
2. Start booking with phone number, abandon checkout
3. Check Firestore `recoveryLeads` and `recoveryAbandonedBookings`
4. POST admin run (or wait for cron) with Meta credentials configured
5. Chat on site widget → verify `recoveryConversations` grows
