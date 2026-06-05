# AI SEO Agent — Book Scuba Goa

Weekly SEO pipeline that pulls Google Search Console data, audits key pages, generates OpenAI SEO fixes, and (optionally) queues blog topics into your existing blog automation system.

## What it does

- Fetches Search Console performance for:
  - last 7 days (ending yesterday IST)
  - previous 7 days (baseline)
- Detects:
  - low CTR pages
  - declining rankings / clicks
  - keyword opportunities
  - weak meta titles
  - missing schema
  - thin content
- Generates (OpenAI):
  - SEO titles + meta descriptions
  - FAQs
  - internal link plan
  - schema suggestions
  - blog topic clusters (pillar + supporting)
  - content improvement suggestions
- Optional competitor keyword gap scan:
  - uses Serper (Google SERP API) when `SERPER_API_KEY` is set

## Where data is saved (Firestore)

| Collection | Doc ID | Notes |
|-----------|--------|------|
| `seoWeekly` | `YYYY-MM-DD` | Week ending date (yesterday IST) |
| `seoWeeklyReports` | same | OpenAI report + recommendations |

## Admin dashboard

- Page: `/admin/seo-agent`
- API:
  - `GET /api/admin/seo-agent/dashboard?weeks=8`
  - `POST /api/admin/seo-agent/run` (options: `{ weekId?, days?, queueBlogTopics? }`)

If you enable **“Queue blog topics automatically”**, the agent will push the generated topics into `blogTopicQueue` (visible in `/admin/blog-automation`).

## Automation (Vercel Cron)

Runs weekly:

- `GET /api/cron/seo-weekly`
- Schedule in `vercel.json`: `0 5 * * 1` (Mondays 05:00 UTC)

## Environment variables (Vercel)

Required:

```env
FIREBASE_SERVICE_ACCOUNT_KEY=...
CRON_SECRET=...
OPENAI_API_KEY=...
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://bookscubagoa.com/
```

Optional:

```env
SERPER_API_KEY=...   # competitor keyword gap scan
AI_ANALYTICS_OPENAI_MODEL=gpt-4o-mini
```

## Notes

- Blog interlinking for new posts is improved by updating the blog generator prompt to include 5–8 internal markdown links (always `/booking` and the related service page).
- For best results, add your Firebase service account email as an owner/user in Google Search Console for the property.

