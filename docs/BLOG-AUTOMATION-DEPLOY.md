# Blog automation — deploy checklist

## Why production looked “old”

GitHub can have the latest code while Vercel **Production** still serves an older build.  
Check: open `/admin/blog-automation` → you should see **“Build: v2-multi-slot-watermark”** and **“Publish times (IST)”** time pickers.

Verify deployed JS (optional): production bundle should contain `publishSlotsIst`, not `publishHourIst`.

## Deploy steps

1. Push to `main` on `deepak989898/scuba-goa`.
2. Vercel → **Deployments** → latest commit → must be **Ready** and marked **Production Current**.
3. If missing, click **Redeploy** → Production.
4. Hard-refresh admin: **Ctrl+Shift+R** (or clear cache).

## Environment variables (Vercel)

| Variable | Required |
|----------|----------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes |
| `OPENAI_API_KEY` | Yes |
| `PEXELS_API_KEY` | Yes (images) |
| `CRON_SECRET` | Yes (cron + external scheduler) |

## Vercel Hobby vs multiple times per day

- **Hobby:** Vercel cron runs **once per day** only. Multiple IST slots will not fire separately unless you use an external cron.
- **Fix (free):** [cron-job.org](https://cron-job.org) → every 30 minutes →  
  `GET https://bookscubagoa.com/api/cron/blog-publish`  
  Header: `Authorization: Bearer <CRON_SECRET>`
- **Pro:** `vercel.json` schedule `*/30 * * * *` works on Vercel.

## Firebase

```bash
firebase deploy --only firestore:rules
```

Rules must include `blogPosts`, `blogTopicQueue`, `blogAutomation`, `blogDailyRuns`.

## URLs

- Admin: `/admin/blog-automation` (nav: **Blog auto**)
- Public blogs: `/blog` and `/blog/[slug]`
