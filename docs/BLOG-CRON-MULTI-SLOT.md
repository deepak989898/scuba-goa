# Blog automation — 3 posts at 3 IST times

## How scheduling works (v2 — review before publish)

1. **Prepare** — content is generated and saved as **Scheduled** (not live yet).
2. **Admin reviews** — edit title, content, image, or change **Auto-publish at (IST)** in Admin → Blog auto.
3. **Auto-publish** — cron publishes when IST time is reached (one post per due slot).

- Each **cron run** publishes **at most 1** due scheduled post.
- **Prepare today's scheduled posts** creates one draft per slot (06:00, 18:00, 21:00).
- Published posts store **publishedAt** (shown in admin as IST).

## Vercel Hobby (once per day)

Built-in cron (`vercel.json`) runs **once** (~9:00 IST). You get **one** automated post per day, not three.

## Three posts per day (recommended)

Use [cron-job.org](https://cron-job.org) (free):

1. Create a job every **30 minutes**.
2. URL: `https://bookscubagoa.com/api/cron/blog-publish`
3. Method: **GET**
4. Header: `Authorization: Bearer YOUR_CRON_SECRET` (same as Vercel `CRON_SECRET`)

Example: at 06:00–06:45 IST → post 1; at 18:00–18:45 → post 2; at 21:00–21:45 → post 3.

## Admin buttons

| Button | Behavior |
|--------|----------|
| **Generate 1 post now** | Immediate post, ignores schedule |
| **Run next scheduled slot** | Same as cron — **one** post for next due IST slot |
| **Publish all remaining today** | Test only — publishes all remaining at once |

Do **not** use “Publish all remaining today” for normal operation.
