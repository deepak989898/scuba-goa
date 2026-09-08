# Firestore Cost Audit Report — BookScubaGoa.com

**Date:** 2026-09-07  
**Symptom:** ~34M Firestore reads/day, ~44K writes/day, ~20–30 human visitors/day  
**Scope:** Full codebase audit + safe production fixes

---

## A. ROOT CAUSE (most likely)

**34M reads/day cannot be explained by 20–30 human visitors alone.**

The dominant causes are a **combination** of:

1. **Full-collection Firestore scans on every uncached server request** for guides/blogs (`seoPages` + `blogPosts`), especially on `/guides/[slug]` which was `force-dynamic` and called `buildClusterCatalog()` **twice** per request (~800–5,000+ reads per hit depending on catalog size).

2. **Bot/crawler traffic** (Google, Bing, SEO tools) hitting thousands of guide/blog URLs — each uncached hit multiplied the full-catalog read cost.

3. **Admin panel Firestore polling** — `/admin/analytics` reads 400 `pageViews` + 150 `analyticsSessions` + 200 `marketingLeads` every poll interval from the **browser** (client SDK).  
   - **Legacy code (comment in repo):** 7,000 docs every **20 seconds** ≈ **30.2M reads/day from ONE open tab**.  
   - **Current code (before this fix):** 750 docs every **120s** ≈ **540K reads/day per tab**.

4. **`listPublishedSeoPagesServer()` scanned ALL `seoPages` docs** (including unpublished) then filtered in memory — wasted reads on every caller (sitemap, guides index, cluster catalog, GSC cron).

5. **Admin blog/guide list pages** loading ~1,200 blogs + ~600 guides on every open/refresh (partially fixed in prior commit with lazy-load collapse).

**External crons and bot traffic are common secondary causes** alongside SSR full-collection scans.

**No `onSnapshot` listeners exist anywhere in the codebase** — the problem is repeated `get()` / `getDocs()` / Admin `.get()`, not realtime listeners.

---

## B. FILES RESPONSIBLE (ranked)

| Severity | File(s) | Issue |
|----------|---------|-------|
| **CRITICAL** | `src/app/guides/[slug]/page.tsx` | `force-dynamic` + 2× full catalog reads per request |
| **CRITICAL** | `src/lib/cluster-related-content.ts` | `buildClusterCatalog()` full scans, no cache, duplicated calls |
| **CRITICAL** | `src/lib/seo-pages-server.ts` | `seoPages.get()` without `where published` |
| **HIGH** | `src/app/guides/page.tsx` | `force-dynamic` + full blog+guide lists every request |
| **HIGH** | `src/app/blog/[slug]/page.tsx` | Duplicate cluster catalog on cache miss |
| **HIGH** | `src/app/admin/analytics/page.tsx` | Client-side polling of pageViews/sessions/leads |
| **HIGH** | `src/app/api/analytics/track/route.ts` | 5–8 reads per non-heartbeat analytics event (bots included) |
| **HIGH** | `src/app/api/admin/blog-posts/route.ts` | Full `blogPosts.get()` (~1,200 docs) per admin load |
| **HIGH** | `src/app/api/admin/seo-pages/route.ts` | Full `seoPages.get()` per admin load |
| **MEDIUM** | `src/lib/home-gallery-sync.ts` | Full `homeGallery.get()` on every blog image sync |
| **MEDIUM** | `src/lib/analytics-content-traffic.ts` | Full aggregation collection `.get()` + 5K pageViews backfill |
| **MEDIUM** | `src/app/sitemap.ts` | Full blog+guide scans per sitemap generation |
| **MEDIUM** | `src/lib/gsc-indexing-agent/*` | Daily full inventory + seoUrls scans |
| **MEDIUM** | `src/app/admin/ai-blog-automation/page.tsx` | Full blog list reload on many actions |
| **LOW** | External crons (blog-publish, ai-blog) | Periodic scans when misconfigured |
| **LOW** | Client hooks `useServices`, `usePackages`, `useHeroSlides` | ~55 reads/session (cached 5 min in browser) |

---

## C. BEFORE (scale math)

### Guide page (worst public path)
```
Per request ≈ 2×(N_seo + N_blog) + services/packages
With N_seo=600 (all docs), N_blog=1200 published:
  ≈ 2×1800 + 35 = 3,635 reads/request

10,000 bot guide hits/day → 36M reads/day (matches observed 34M)
```

### Admin analytics (legacy 20s poll — if still deployed)
```
7,000 reads × (86,400 / 20) = 30,240,000 reads/day (one tab)
```

### Admin analytics (current 120s poll)
```
(400 + 150 + 200) × (86,400 / 120) = 540,000 reads/day per 24/7 tab
```

### Human visitors only (20–30/day)
```
~30 visitors × 10 pages × ~50 reads ≈ 15,000 reads/day (0.04% of 34M)
```

### Writes (~44K/day)
Likely sources:
- `analytics/track` — session updates, pageViews, rate-limit docs, content-traffic txns
- Bot traffic generating view/heartbeat/leave events
- GSC agent upserts, blog automation, hotel price cache writes
- **Not primarily external cron misconfiguration** (blog-publish full scans when unoptimized)

---

## D. FIXES APPLIED (this session)

| Change | File(s) |
|--------|---------|
| Cache cluster catalog 1h via `unstable_cache` | `src/lib/cluster-related-content.ts` |
| Single bundle call (no duplicate `buildClusterCatalog`) | `guides/[slug]/page.tsx`, `blog/[slug]/page.tsx` |
| ISR `revalidate=3600` instead of `force-dynamic` | `guides/[slug]/page.tsx`, `guides/page.tsx` |
| `where("published","==",true)` for seoPages list | `src/lib/seo-pages-server.ts` |
| Cache published seo pages list 1h | `src/lib/seo-pages-server.ts` |
| Cache published blog posts list 1h | `src/lib/blog-posts-server.ts` |
| Replace full `homeGallery.get()` with targeted `where().limit()` dedupe | `src/lib/home-gallery-sync.ts` |
| Admin analytics poll 120s → **300s** + visibility guard on all polls | `src/app/admin/analytics/page.tsx` |
| Lazy-load admin blog/guide lists (prior commit) | `blog-automation/page.tsx`, `social-media/page.tsx` |

---

## E. AFTER (expected reduction)

| Area | Before (worst case) | After (expected) |
|------|---------------------|------------------|
| Guide detail page | 3,000–5,000 reads/hit | **~40 reads/hit** (1 guide doc + cached catalog context) |
| Guides index | 400+ reads/hit | **~0 reads** for 1h (ISR cache) |
| Cluster catalog globally | Every request scans DB | **1 scan/hour** shared across all pages |
| seoPages list queries | All docs including drafts | **Published only** |
| homeGallery sync | 80+ reads/sync | **≤8 reads/sync** |
| Admin analytics tab | 540K reads/day (120s) | **~216K reads/day** (300s, hidden-tab skip) |

**Conservative estimate:** Public SSR reads drop **90–99%** for guide/blog traffic.  
**If legacy 20s admin poll was still live in production:** redeploying current code alone could drop **~30M reads/day**.

---

## F. COST IMPACT

- Blaze plan Firestore reads: ~$0.06 per 100K reads (region-dependent).
- **34M reads/day** ≈ **$20+/day** in read costs alone.
- After fixes, expect **<1–3M reads/day** if bots still crawl heavily, or **<200K/day** with normal crawl + no admin tabs left open 24/7.

Monitor Firebase console for 48 hours post-deploy.

---

## G. REMAINING RISKS

1. **Admin analytics tab open 24/7** — still ~200K+ reads/day per tab.
2. **AI Blog Automation** — full `blogPosts.get()` on each `load()`.
3. **Blog traffic `mode=full`** — 5,000 pageViews backfill scan.
4. **GSC daily cron** — 5K–15K reads/day (acceptable).
5. ~~**Bot analytics events** — `/api/t` still does transactional reads per view.~~ **Fixed wave 2:** bots skip rate-limit txn reads.
6. ~~**Client CMS hooks** on homepage — 55 reads per new browser session.~~ **Fixed wave 2:** `/api/public/cms-catalog` + 1h server cache.
7. **Bulk gallery backfill** — still scans full collections when run manually.
8. **cron-job.org every 30 min** — reduce `blog-publish` + `ai-blog-generation` to **hourly** (see `docs/EXTERNAL-CRON-JOBS.md`).

---

## Wave 2 fixes (Sep 7 — billing still rising with admin closed)

| Fix | Files |
|-----|-------|
| Public CMS catalog API (services + packages + hero) with 1h cache | `src/app/api/public/cms-catalog/route.ts`, `get-*-server.ts` |
| Homepage hooks use HTTP catalog instead of client `getDocs` | `useServices.ts`, `usePackages.ts`, `useHeroSlides.ts`, `usePublicCmsCatalog.ts` |
| Bot analytics: skip rate-limit read txn | `src/app/api/analytics/track/route.ts` |
| ISR 1h on services, packages, offers | `services/[slug]/page.tsx`, `packages/[id]/page.tsx`, `offers/page.tsx` |
| `publishDueScheduledPosts` targeted query (not full unpublished scan) | `scheduled-posts.ts` |
| AI blog cron early-exit when automation off + no waiting jobs | `api/cron/ai-blog-generation/route.ts` |
| Cache public offers list 1h | `server-offers.ts` |

---

## H. TEST RESULTS

- `npx tsc --noEmit` — **PASSED** after fixes.
- Run `npm run build` before deploy (recommended).

---

## I. MONITORING (next 24–48 hours)

In Firebase Console → Firestore → Usage:

1. **Reads/day** — should fall sharply within 24h of deploy.
2. **Top collections** — watch `seoPages`, `blogPosts`, `pageViews`, `analyticsSessions`.
3. **Do not leave** `/admin/analytics` or `/admin/ai-blog-automation` open overnight.
4. Check **Firestore Usage by API** — client SDK spikes = admin browser; Admin SDK spikes = SSR/cron.
5. Set **budget alert** at ₹500/day.

---

## onSnapshot audit

**Result: 0 usages** — no listener cleanup issues.
