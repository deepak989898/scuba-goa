# SEO Intelligence Agent (Competitor SEO)

Admin module at **`/admin/seo-intelligence`** beside the existing **GSC Indexing Agent**.

GSC Indexing Agent stays unchanged for index coverage, URL inspection, sitemaps, and ranking text improve.

## What ships in this foundation

- Overview dashboard (counts + provider status + activity)
- Competitors: manual add, approve/reject/block/pause, SERP discovery
- Settings: suggestion auto-approve **OFF** by default + granular / dangerous toggles
- Activity logs
- SERP provider abstraction (`Serper` via `SERPER_API_KEY` / `SERP_API_KEY`)
- Additive Firestore collections only (no data deletion)

Placeholder sections (next phases): Keyword Rankings, Keyword Gap, Content Gap, Opportunities, Suggestions, Approval Queue, Applied Changes.

## Safety rules

- Ranking impact is **not guaranteed** (shown in UI).
- Never call Google Indexing API / never automate “Request indexing”.
- Suggestion auto-approve defaults **OFF**.
- Dangerous actions (URL changes, redirects, consolidation, new service pages, canonicals) stay blocked unless explicitly enabled.
- No competitor content copying; discovery only stores domains + scores.
- Missing SERP key → setup banner; GSC + manual competitors still work.

## Firestore collections (new)

| Collection | Purpose |
|------------|---------|
| `seoCompetitors` | Competitor domains |
| `seoKeywords` | Tracked keywords (phase 4+) |
| `seoRankSnapshots` | Rank history (phase 5+) |
| `seoSuggestions` | Suggestions (phase 8+) |
| `seoChangeVersions` | Snapshots / rollback (phase 11+) |
| `seoAgentSettings` / `settings` | Agent settings |
| `seoActivityLogs` | Audit log |
| `seoIntelJobLocks` | Cron locks (phase 15+) |

## Environment variables

```env
SERP_PROVIDER=serper
SERPER_API_KEY=          # or SERP_API_KEY=
SERP_LOCATION=Goa,India
SERP_COUNTRY=IN
SERP_LANGUAGE=en
SEO_COMPETITOR_AUTO_DISCOVERY=true
SEO_AUTO_APPROVE_DEFAULT=false
SEO_MAX_DAILY_CHANGES=10
SEO_MAX_WEEKLY_NEW_PAGES=3
SEO_MIN_AUTO_APPROVE_CONFIDENCE=85
```

## Admin APIs

- `GET /api/admin/seo-intelligence/dashboard`
- `GET|PATCH /api/admin/seo-intelligence/settings`
- `GET|POST /api/admin/seo-intelligence/competitors`
- `POST /api/admin/seo-intelligence/competitors/discover`
- `PATCH|DELETE /api/admin/seo-intelligence/competitors/[id]`

Auth: Firebase Bearer + `admins/{uid}` (same as other admin APIs).

## Cron (later)

Daily/weekly jobs will use `/api/cron/...` + `CRON_SECRET` with job locks. Not enabled in foundation to avoid unexpected SERP spend.

## Tests

```bash
node scripts/test-seo-intelligence.mjs
```

## Rollback

1. Remove nav links if needed (module is additive).
2. Stop using `/admin/seo-intelligence`.
3. Firestore collections can remain (harmless) or be archived manually — never auto-deleted.
4. GSC agent and public site are untouched.
