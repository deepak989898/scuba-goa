# AI Marketing Engine — Book Scuba Goa

Autonomous marketing system: content generation, social calendar, ad optimization, trending topics, SEO clusters, image prompts, reels ideas, competitor analysis, and campaign approval workflow.

## Architecture

```
Analytics + SEO + leads + catalog
    → buildMarketingContext()
    → scanTourismTrends() (optional Serper)
    → generateMarketingEnginePack() (OpenAI)
    → persist to Firestore collections
    → queue blog topics (safe auto)
    → pending approvals for social / WhatsApp campaigns
    → Telegram owner summary

Vercel Cron (06:00 UTC daily)
    → GET /api/cron/marketing-daily

Admin: /admin/marketing-engine
    → dashboard, run now, settings, approve/reject campaigns
```

## Firestore collections

| Collection | Purpose |
|------------|---------|
| `marketingCampaigns` | Campaign shells + publish status |
| `marketingGeneratedContent` | All AI copy (IG, FB, GBP, email, WhatsApp, etc.) |
| `marketingSocialPosts` | Scheduled social calendar entries |
| `marketingAdCopies` | Headline/description/CTA variations |
| `marketingSeoClusters` | Topic clusters, internal links, FAQs |
| `marketingAiPrompts` | Image generation prompts by category |
| `marketingReelsIdeas` | Reel/Shorts scripts and hooks |
| `marketingCompetitorReports` | Gap/opportunity reports |
| `marketingAnalytics` | Daily performance snapshot |
| `marketingAgentRuns` | Pipeline run log |
| `marketingAgentActions` | Approval queue (social, WhatsApp) |
| `marketingAgentReports` | Daily AI marketing brief |
| `marketingAgent/settings` | Engine toggles |

## Features

1. **Content generation** — Instagram, Facebook, Google Business, ads, blogs, WhatsApp, push, email, festival offers, package promos (catalog-aware prices).
2. **Social calendar** — 7-day schedule with best posting times (IST) and platform mix.
3. **Ad copy optimizer** — Multiple headline/description/CTA sets with urgency and festival variants.
4. **Trending engine** — Serper scan for Goa tourism + scuba trends (optional `SERPER_API_KEY`).
5. **SEO clusters** — Pillar topics, supporting posts, internal links, FAQ/schema hints.
6. **Image prompts** — luxury, adventure, romantic, family, budget categories.
7. **Reels ideas** — Hooks, scripts, scenes, voiceover, CTAs.
8. **Competitor analysis** — Gaps, opportunities, keyword/offer patterns in AI report.
9. **Performance dashboard** — Traffic, bookings, WhatsApp clicks, campaign stats.
10. **Campaign workflow** — Generate → admin review → approve → publish (logged).

## Safe automation

- Blog topics auto-queue to `blogTopicQueue` when enabled (safe).
- Social and WhatsApp campaigns require admin approval by default.
- All content logged in Firestore; no client writes.
- Rate-limited by daily cron (not spammy bursts).

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Yes | Content generation |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes | Storage |
| `CRON_SECRET` | Yes | Cron auth |
| `SERPER_API_KEY` | Optional | Trending + competitor SERP scan |
| `TELEGRAM_BOT_TOKEN` | Optional | Daily brief alerts |
| `TELEGRAM_CHAT_ID` | Optional | Alert destination |

## Admin APIs

- `GET /api/admin/marketing-engine/dashboard`
- `POST /api/admin/marketing-engine/run`
- `POST /api/admin/marketing-engine/settings`
- `POST /api/admin/marketing-engine/action/approve` — body `{ actionId }`
- `POST /api/admin/marketing-engine/action/reject` — body `{ actionId }`

## Integrations

- **Blog automation** — `blogTopicsToQueue` → `addTopicToQueue()`
- **SEO agent** — reads latest `seoWeeklyReports` for context
- **AI analytics** — reads `aiAnalyticsDaily` for traffic/booking signals
- **Recovery agent** — hot lead count in marketing context
- **Legacy marketing page** — `/admin/marketing` for manual lead WhatsApp templates

## Testing

1. Ensure `aiAnalyticsDaily` has at least one day of data (run analytics cron).
2. Admin → **Marketing AI** → **Run marketing engine now**.
3. Review generated content, calendar, ads, clusters in dashboard.
4. Approve pending social/WhatsApp actions.
5. Check `blogTopicQueue` for new topics.
