# Analytics Fix Summary — Book Scuba Goa

Date: 2026-07-19  
Companion audit: `docs/ANALYTICS_AUDIT.md`

## Root cause found

1. **Source-detection bug:** `/api/analytics/track` trusted client `trafficChannel`. Scripts could POST `google_organic` without a Google referrer → inflated “Google (search)” totals while Search Console showed ~1 click.
2. **Human-classification bug:** Only UA regex bots were dropped. JS-capable scrapers (often Desktop · Chrome · Linux · 0s dwell) were stored as humans.
3. **Single-article spike:** Path is **not** hardcoded. Automated clients repeatedly hit the popular SEO URL `/blog/scuba-diving-safety-tips-for-beginners-2`; each hit = new `sessionId` = new “visitor”.
4. **No analytics version:** Legacy and corrected semantics were mixed in one dashboard.

## Exact fixes

| Area | Change |
|------|--------|
| Attribution | Server re-classifies via `classifyAttribution()`; client channel ignored |
| Google organic | Requires real Google **search** hostname or `utm_source=google&utm_medium=organic` + confidence |
| Bots | Expanded UA list (GPTBot, ClaudeBot, etc.); bots **stored** with `visitorType: bot` for the Bots tab |
| Suspected | Zero-engagement + Linux/Chrome or low-confidence Google → `suspected_bot` |
| Identity | `visitorId` (localStorage) + `sessionId` (sessionStorage) + `eventId` idempotency |
| Version | New rows: `analyticsVersion: 2` |
| Prefetch | `Purpose: prefetch` / preview skipped |
| Rate limit | Per IP-hash window (`analyticsRateLimits`) |
| Admin UI | Tabs: Humans / Suspected / Bots / All; legacy warning; high-confidence Google count |
| AI aggregate | Skips bots + suspected; low-confidence Google not labeled as search |

## Modified / created files

**Created**

- `docs/ANALYTICS_AUDIT.md`
- `docs/ANALYTICS_FIX_SUMMARY.md`
- `src/lib/analytics-attribution.ts`
- `src/lib/analytics-v2.ts`
- `src/lib/analytics-visitor-kind.ts`
- `scripts/test-analytics-attribution.mjs`

**Modified**

- `src/lib/analytics-bot.ts`
- `src/lib/analytics-traffic.ts`
- `src/components/AnalyticsTracker.tsx`
- `src/app/api/analytics/track/route.ts`
- `src/app/admin/analytics/page.tsx`
- `src/lib/ai-analytics/aggregate-internal.ts`
- `firestore.rules`
- `.env.example`
- `package.json`

## Firestore schema (new fields on sessions / pageViews)

- `analyticsVersion` (number, 2)
- `visitorId`, `eventId`, `ipHash` (hashed, not raw IP)
- `visitorType`: `human` \| `bot` \| `suspected_bot` \| `unknown`
- `source`, `medium`, `sourceConfidence`, `attributionReason`, `rawReferrer`
- `botName`, `botCategory`, `botReason`, `botSignals`, `isEngagedSession`
- Collections: `analyticsEventIds`, `analyticsRateLimits`

## Indexes

No new composite indexes required for current admin queries (still orderBy `createdAt` / `lastSeenAt`).

## Rules

Deploy: `firebase deploy --only firestore:rules`  
Adds admin-read / no-client-write for `analyticsEventIds`; deny-all for `analyticsRateLimits`.

## Environment

```
ANALYTICS_IP_HASH_SECRET=<long random string>
```

Optional; a fallback salt is used if unset (set a real secret in production).

## Migration

- **Do not delete** legacy `pageViews` / `analyticsSessions`.
- Admin **Suspected** tab + legacy badge reclassifies zero-engagement Google/Linux patterns without rewriting Firestore.
- Optional later: dry-run script to stamp `analyticsVersion: 1` on old docs (not required for dashboards).

## Testing

```bash
npm run test:analytics
npx tsc --noEmit
npm run lint
npm run build
```

Manual:

1. Open site in a normal browser → `/admin/analytics` → **Humans** should stay low / realistic.
2. Open **Suspected** → legacy scraper-like sessions should appear.
3. Confirm Google organic only when `sourceConfidence` is high (detail pane shows reason).
4. Regenerate AI analytics report → visitors should not match the old 345 Google day.

## Rollback

1. Redeploy previous Vercel deployment.
2. Tracker continues to accept old payloads; v2 fields are additive.
3. Disable by reverting `track/route.ts` + `AnalyticsTracker.tsx` if needed.

## Deployment checklist

1. Set `ANALYTICS_IP_HASH_SECRET` on Vercel
2. Deploy Next.js app
3. `firebase deploy --only firestore:rules`
4. Open `/admin/analytics` → verify Humans vs Suspected
5. Run AI analytics once and confirm lower human visitor count
6. Compare high-confidence Google organic vs GSC clicks over the same IST day

## Acceptance

- Hundreds of unverified “Google Search” hits no longer dominate the **Humans** tab
- Unknown / spoofed traffic is not auto-labeled Google Search
- Bots and suspected automation are visible on separate tabs
- Pathname is still from `usePathname()` (not hardcoded to the safety tips article)
- New events use `analyticsVersion: 2`
- Legacy data preserved and labeled
