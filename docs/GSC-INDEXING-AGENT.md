# Google Search Console Indexing & Ranking AI Agent

Production agent for **bookscubagoa.com** that monitors index coverage and rankings, submits sitemaps via the official Search Console API, runs technical audits, and queues safe fixes / approvals.

## Hard limits (do not violate)

- **Never** call the Google **Indexing API** for blogs, guides, services, or travel pages.
- Indexing API is only for JobPosting / livestream BroadcastEvent pages (not used here).
- URL Inspection API is **read-only status** — it does **not** request indexing.
- Never automate Search Console UI “Request indexing” (no Puppeteer/Playwright).
- Never promise guaranteed indexing or ranking.

### GSC “Not found (404)” fixes

Permanent redirects live in `src/lib/blog-redirects.ts` (wired via `next.config.ts`):

- `/blog/exploring-goas-underwater-life-a-scuba-divers-guide` → `/blog/what-to-expect-during-your-scuba-diving-experience`
- `/5` → `/booking`

After deploy, validate with URL Inspection; GSC coverage charts update slowly.

## Admin UI

- **`/admin/gsc-agent`** — Overview, URL inventory, issues, approvals, sitemaps, connection, settings, logs
- Nav: **Blogs & guides → GSC Indexing Agent**
- **URL inventory → Ranking opportunities:** for **blog** and **guide** rows only, **Generate** (OpenAI text improve, no images) auto-updates Firestore + shows estimated % uplift; **Edit** opens an inline panel like AI Blog Automation Generation queue (all text fields + featured/OG/hero image upload; blogs also support Generate with AI image). Static pages have no Generate/Edit.

## Environment variables

```env
# Existing (keep)
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://www.bookscubagoa.com/
GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON=...   # optional fallback for Analytics
FIREBASE_SERVICE_ACCOUNT_KEY=...
CRON_SECRET=...
OPENAI_API_KEY=...   # optional; not required for core monitor

# New — GSC OAuth (can reuse Google Business OAuth client)
GOOGLE_GSC_CLIENT_ID=
GOOGLE_GSC_CLIENT_SECRET=
GOOGLE_GSC_REDIRECT_URI=https://www.bookscubagoa.com/api/admin/gsc-agent/oauth-callback
GOOGLE_TOKEN_ENCRYPTION_KEY=               # min 16 chars; used to encrypt refresh tokens
```

If `GOOGLE_GSC_*` is empty, the agent falls back to `GOOGLE_BUSINESS_CLIENT_ID` / `SECRET`.

### Canonical host (critical for indexing)

Production prefers **www** (`bookscubagoa.com` → 308 → `www.bookscubagoa.com`).

Set both of these to the **www** URL so sitemap, robots, and canonicals do not redirect:

- `NEXT_PUBLIC_SITE_URL=https://www.bookscubagoa.com`
- `GOOGLE_SEARCH_CONSOLE_SITE_URL=https://www.bookscubagoa.com/`

Prefer a **Domain** property in Search Console (`bookscubagoa.com`) covering apex + www, or use the www URL-prefix property consistently.

### OAuth redirect URL (Google Cloud Console)

Add authorized redirect URI:

`https://www.bookscubagoa.com/api/admin/gsc-agent/oauth-callback`

Scopes requested:

- `https://www.googleapis.com/auth/webmasters.readonly`
- `https://www.googleapis.com/auth/webmasters` (sitemap submit + inspection)

## Firestore collections

| Collection | Purpose |
|------------|---------|
| `seoUrls` | Canonical URL inventory + metrics |
| `seoInspections` | Inspection snapshots |
| `seoIssues` | Technical / coverage issues |
| `seoApprovals` | Human approval queue |
| `seoActions` | Activity log |
| `seoSitemaps` | Sitemap submit status |
| `seoAnalyticsDaily` | Daily Search Analytics snapshot |
| `seoAgentRuns` | Job run history |
| `seoSettings` | Mode, pause, quotas (`settings` doc) |
| `googleConnections` | Encrypted GSC OAuth (`gsc` doc) |
| `gscOAuthState` | Short-lived OAuth state |

## Sitemaps

- `/sitemap.xml` — existing App Router sitemap (unchanged primary)
- `/sitemaps/blog.xml`
- `/sitemaps/services.xml`
- `/sitemaps/static.xml`

Submit via Search Console Sitemap API (debounced). Not using deprecated ping endpoints.

## Cron

- Vercel: `GET /api/cron/gsc-indexing-agent` daily `30 5 * * *` (defaults `job=daily`)
- External cron examples:

```text
GET /api/cron/gsc-indexing-agent?job=inventory   every 1h
GET /api/cron/gsc-indexing-agent?job=inspect     daily
GET /api/cron/gsc-indexing-agent?job=analytics   daily
GET /api/cron/gsc-indexing-agent?job=weekly      weekly
```

Auth: `Authorization: Bearer $CRON_SECRET`

## Agent modes

1. **monitor_only** — reports only  
2. **approval_required** (default) — diagnostics + approval for risky changes  
3. **safe_auto_fix** — low-risk inventory/sitemap eligibility fixes only  

Emergency **pause** in Agent settings.

### Auto-fix (safe)

- Mark non-200 / noindex URLs ineligible for sitemap inventory  
- Record expected canonical + queue reinspection  
- Debounced sitemap submit  

### Requires approval

- Title/body rewrites, canonical changes to another URL, redirects/deletes, thin-content rewrites  

## Publish hook

When a blog is published via `publishBlogPostNow`, the agent:

1. Adds/updates `seoUrls`  
2. Runs a technical checklist fetch  
3. Queues delayed URL Inspection (status read)  

Existing publish / GBP / gallery behaviour is unchanged.

## Manual test checklist

1. Production build passes  
2. Open `/admin/gsc-agent`  
3. Set `GOOGLE_TOKEN_ENCRYPTION_KEY` + OAuth client  
4. Connect Google → select property  
5. Run **Discover URLs**  
6. Run **Audit batch** / **Inspect queue**  
7. Open `/sitemaps/blog.xml`  
8. Submit sitemaps (needs OAuth write)  
9. Publish a test blog → activity log shows `publish_hook`  
10. Confirm no Indexing API calls in logs  

## Rollback

Git tag: `checkpoint/pre-gsc-indexing-agent-2026-07-25`
