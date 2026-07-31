# External cron jobs — cron-job.org

Vercel Hobby keeps built-in jobs in `vercel.json`. Remaining automation is
triggered by cron-job.org.

## Critical: always use `www`

Canonical host is **`https://www.bookscubagoa.com`**.

Apex `https://bookscubagoa.com/...` returns **HTTP 308** to www. Many schedulers
**drop the `Authorization` header** on redirect → cron returns **401** → pipeline
never runs → **no email / Telegram daily report**.

✅ Correct: `https://www.bookscubagoa.com/api/cron/analytics-daily`  
❌ Wrong: `https://bookscubagoa.com/api/cron/analytics-daily`

## Required settings on every cron-job.org job

- Request method: `GET`
- URL: use the exact **www** HTTPS URLs below
- Custom header (pick one):
  - Name: `Authorization` · Value: `Bearer YOUR_CRON_SECRET`
  - **or** Name: `X-Cron-Secret` · Value: `YOUR_CRON_SECRET` (no `Bearer` prefix)
- Replace `YOUR_CRON_SECRET` with the exact `CRON_SECRET` value from Vercel
- Time zone: `UTC`
- Follow redirects: prefer **off** (and use www URL so redirect is unnecessary)
- Save responses: enabled while testing
- Notifications: enable when execution fails

Do not add the secret to the URL. A successful request returns HTTP `202` with
`{"ok":true,"accepted":true,...}` quickly; the work continues on Vercel.
Actual run status is written to Firestore collection `cronRunStatus`.

## Jobs and schedules

| Job title | URL | UTC schedule | IST time |
|---|---|---:|---:|
| Blog publish checker | `https://www.bookscubagoa.com/api/cron/blog-publish` | Every 30 minutes | Every 30 minutes |
| Booking recovery | `https://www.bookscubagoa.com/api/cron/recovery-hourly` | Minute 15 of every hour | Minute 45 of every hour |
| AI analytics | `https://www.bookscubagoa.com/api/cron/analytics-daily` | `0 4 * * *` | 09:30 daily |
| Weekly SEO | `https://www.bookscubagoa.com/api/cron/seo-weekly` | `0 5 * * 1` | 10:30 Monday |
| Business agent | `https://www.bookscubagoa.com/api/cron/business-agent-daily` | `30 5 * * *` | 11:00 daily |
| Marketing agent | `https://www.bookscubagoa.com/api/cron/marketing-daily` | `0 6 * * *` | 11:30 daily |
| Command Center | `https://www.bookscubagoa.com/api/cron/command-center-daily` | `15 6 * * *` | 11:45 daily |
| SEO Blog Center | `https://www.bookscubagoa.com/api/cron/seo-blog-center-daily` | `45 6 * * *` | 12:15 daily |
| AI blog generation queue | `https://www.bookscubagoa.com/api/cron/ai-blog-generation` | Every 30 minutes | Every 30 minutes |
| AI Pricing (weekly) | `https://www.bookscubagoa.com/api/cron/pricing-agent-weekly` | `30 0 * * 2` | **Tuesday 06:00 IST** |
| GSC Indexing Agent (daily) | `https://www.bookscubagoa.com/api/cron/gsc-indexing-agent` | `30 5 * * *` | 11:00 daily |
| GSC Indexing Agent (weekly) | `https://www.bookscubagoa.com/api/cron/gsc-indexing-agent?job=weekly` | `0 7 * * 1` | 12:30 Monday |

For the hourly recovery schedule, cron-job.org's custom schedule should run at
minute `15` UTC. The IST minute becomes `45`.

## Daily analytics report checklist

If email + Telegram did not arrive:

1. cron-job.org URL must be **www** (see above). Test run must return **202**, not 401/308.
2. Vercel env: `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain).
3. Firestore: `cronRunStatus/analytics-daily` (`success` vs `error`) and `aiAnalyticsReports/{date}/notifications`.
4. Admin → AI Analytics → **Generate now** to force-send yesterday’s report.

## Fixing “Failed (HTTP error)”

Open **Details** for the failed job:

- HTTP `308` / following to www then `401`: URL was apex — switch to **www**.
- HTTP `401`: Authorization / `X-Cron-Secret` missing or does not match `CRON_SECRET`.
- HTTP `404`: URL is wrong or latest code is not deployed.
- HTTP `500`: open Vercel Function logs and Firestore `cronRunStatus`.
- HTTP `202`: scheduler setup is correct; inspect `cronRunStatus/<task-name>`
  for background completion (`notifications.telegram` / `notifications.email`).

After deployment, use **Test run** on each job. Do not enable a job until its
test returns HTTP `202`.
