# External cron jobs — cron-job.org

Vercel Hobby keeps one built-in daily fallback in `vercel.json`. All other
automation is triggered by cron-job.org.

## Required settings on every cron-job.org job

- Request method: `GET`
- URL: use the exact HTTPS URLs below
- Custom header name: `Authorization`
- Custom header value: `Bearer YOUR_CRON_SECRET`
- Replace `YOUR_CRON_SECRET` with the exact `CRON_SECRET` value from Vercel
- Time zone: `UTC`
- Save responses: enabled while testing
- Notifications: enable when execution fails

Do not add the secret to the URL. A successful request returns HTTP `202` with
`{"ok":true,"accepted":true,...}` quickly; the work continues safely on Vercel.
Actual run status is written to Firestore collection `cronRunStatus`.

## Jobs and schedules

| Job title | URL | UTC schedule | IST time |
|---|---|---:|---:|
| Blog publish checker | `https://bookscubagoa.com/api/cron/blog-publish` | Every 30 minutes | Every 30 minutes |
| Booking recovery | `https://bookscubagoa.com/api/cron/recovery-hourly` | Minute 15 of every hour | Minute 45 of every hour |
| AI analytics | `https://bookscubagoa.com/api/cron/analytics-daily` | `0 4 * * *` | 09:30 daily |
| Weekly SEO | `https://bookscubagoa.com/api/cron/seo-weekly` | `0 5 * * 1` | 10:30 Monday |
| Business agent | `https://bookscubagoa.com/api/cron/business-agent-daily` | `30 5 * * *` | 11:00 daily |
| Marketing agent | `https://bookscubagoa.com/api/cron/marketing-daily` | `0 6 * * *` | 11:30 daily |
| Command Center | `https://bookscubagoa.com/api/cron/command-center-daily` | `15 6 * * *` | 11:45 daily |
| SEO Blog Center | `https://bookscubagoa.com/api/cron/seo-blog-center-daily` | `45 6 * * *` | 12:15 daily |
| AI blog generation queue | `https://bookscubagoa.com/api/cron/ai-blog-generation` | Every 30 minutes | Every 30 minutes |
| AI Pricing (weekly) | `https://bookscubagoa.com/api/cron/pricing-agent-weekly` | `30 0 * * 2` | **Tuesday 06:00 IST** |

For the hourly recovery schedule, cron-job.org's custom schedule should run at
minute `15` UTC. The IST minute becomes `45`.

## Fixing “Failed (HTTP error)”

Open **Details** for the failed job:

- HTTP `401`: the Authorization header is absent or does not exactly match
  `Bearer <CRON_SECRET>`.
- HTTP `404`: URL is wrong or latest code is not deployed.
- HTTP `500`: open Vercel Function logs and Firestore `cronRunStatus`.
- HTTP `202`: scheduler setup is correct; inspect `cronRunStatus/<task-name>`
  for background completion.

After deployment, use **Test run** on each job. Do not enable a job until its
test returns HTTP `202`.
