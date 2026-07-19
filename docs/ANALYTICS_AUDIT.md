# Analytics Audit — Book Scuba Goa

Date: 2026-07-19  
Site: https://bookscubagoa.com  
Scope: Custom Site Analytics (`/admin/analytics`), ingest API, AI Analytics internal metrics.

This audit is based on reading the production code paths listed below — not speculation.

---

## Architecture (current)

```
Browser AnalyticsTracker (client)
  → POST /api/analytics/track
      → UA bot check (reject → 204, no write)
      → pageViews.add + analyticsSessions.merge
      → optional blog/guide traffic increments

Admin /admin/analytics
  → client Firestore reads of pageViews + analyticsSessions

Cron /api/cron/analytics-daily
  → aggregateInternalDaily(pageViews…) → AI reports
```

There is **no Next.js middleware** that counts visitors. SSR / Link prefetch do **not** create analytics rows.

---

## Files that create visitors / page views

| Role | Path |
|------|------|
| Client tracker | `src/components/AnalyticsTracker.tsx` |
| Mounted from | `src/components/Providers.tsx` → root `layout.tsx` |
| Ingest API | `src/app/api/analytics/track/route.ts` |
| Source labels (client) | `src/lib/analytics-traffic.ts` |
| Bot UA list | `src/lib/analytics-bot.ts` |
| Device/UA parse | `src/lib/clientDevice.ts` |
| Geo headers | `src/lib/analytics-geo.ts` |
| Admin UI | `src/app/admin/analytics/page.tsx` |
| AI daily aggregate | `src/lib/ai-analytics/aggregate-internal.ts` |

Firestore collections: `pageViews`, `analyticsSessions`, `analyticsBlogTraffic`, `analyticsBlogTrafficVisitors`.

---

## How a visitor is created

1. `AnalyticsTracker` runs in the browser on public routes.
2. `getSessionId()` creates a UUID in **`sessionStorage`** key `bsg_analytics_sid` (tab-scoped only).
3. First `eventType: "view"` POST creates/merges `analyticsSessions/{sessionId}` and adds a `pageViews` document.
4. Admin “unique visitors” = **distinct `sessionId`** among that day’s pageViews.

There is **no persistent `visitorId`**. A new browser tab = a new “visitor”.

---

## How a page view is created

- Trigger: `usePathname()` change / mount → `track({ eventType: "view", path: pathname })`.
- Path comes from `usePathname() ?? "/"` — **not hardcoded**.
- 2.5s module-level dedupe per path reduces React Strict Mode doubles.
- Server stores client-sent `path` after normalization.
- `leave` / `click` also write `pageViews`. Heartbeat updates session only.

---

## How “Google Search” is detected (root bug #1)

Client (`classifyTrafficSource` in `analytics-traffic.ts`):

```ts
matchesHost(referrerHost, ["google.com", "google.co.in", "google.co.uk"])
|| (utmSource === "google" && utmMedium === "organic")
```

Admin label: **“Google (search)”** for channel `google_organic`.

**Critical flaw:** `/api/analytics/track` **trusts client fields** `trafficChannel`, `referrerHost`, UTMs. It does **not** re-validate against a raw referrer URL. Any client (or script) can POST:

```json
{ "path": "/blog/…", "trafficChannel": "google_organic", "sessionId": "…" }
```

and appear as Google Search organic traffic.

Also: only three Google hostnames are recognized on the client; many real Google TLDs are missed — but the inflation problem is the opposite (false positives via spoofed / trusted client channel).

---

## How bots are detected (root bug #2)

`isBotUserAgent()` in `analytics-bot.ts` — regex list; bots get **204 and no Firestore write**.

Gaps:

- Empty UA is **not** treated as a bot.
- Normal **Chrome-on-Linux** headless / datacenter browsers often **do not** match bot patterns and are stored as humans.
- `/whatsapp/i` can falsely drop real WhatsApp in-app browsers.
- No engagement-based classification (0-second bounce still = “human visitor”).
- No rate limiting / IP abuse controls on the public ingest endpoint.

---

## Why ~345 “Google Search” visitors can appear in one day while GSC shows ~1 click

Combined causes consistent with observed data (Desktop · Chrome · Linux · 1 page · arrive/leave same second · foreign geos · one blog URL):

1. **Client-trusted `trafficChannel`** allows spoofed `google_organic`.
2. **JS-capable scrapers / SEO / AI tools** execute the tracker with a normal Chrome UA (often Linux), so they pass the UA bot filter.
3. They repeatedly hit a **high-ranking SEO article** (see below); each run gets a new `sessionId` → counted as a new visitor.
4. **Zero engagement** is still counted as a human visitor in admin totals.
5. GSC counts **real Google Search clicks** only — not spoofed referrers or non-Google crawlers executing JS. Custom analytics and GSC are not the same metric, but 345 vs 1 is an attribution anomaly, not a timezone quirk.

Clarity (~34 sessions / 21 days) and AI Analytics (22 visitors on 2026-07-17) align far better with real humans than Site Analytics “346 today”.

---

## Why almost all land on one article

`/blog/scuba-diving-safety-tips-for-beginners-2`

**Not hardcoded** in the tracker. Path is always the current `usePathname()`.

Likely reasons (code-supported + traffic pattern):

- Popular indexed URL attracting crawlers / scrapers / preview bots that run JS.
- Each automated hit creates a new session → UI looks like “everyone” opened that page.
- Blog traffic counters (`analyticsBlogTraffic`) further amplify that slug’s prominence.
- No evidence of a service worker rewriting pathname, or of admin UI forcing one landing path for all sessions.

---

## Duplicate counting

| Risk | Status |
|------|--------|
| Strict Mode double mount | Mitigated by 2.5s path dedupe |
| Heartbeat inflating page views | No — heartbeat skips `pageViews` |
| Prefetch / SSR | No |
| Missing sessionId → `"anon"` | Possible session collapse (under-count), not the 345 inflation |
| Multiple leave events | Can inflate leave rows; unique visitors still by sessionId |
| API open to arbitrary POSTs | **Yes — primary inflation vector** |

---

## Geolocation

- Uses Vercel/CF edge headers (`x-vercel-ip-country`, city, region) — **real client edge geo**, not Firebase server IP.
- **No IP stored** (good for privacy; harder to rate-limit by IP today).
- Successful geo does **not** prove a human (datacenter / VPN geos still resolve).

---

## AI Analytics interaction

`aggregateInternalDaily` skips `isBot === true` pageViews but still counts **suspected automation** that was stored as human (`isBot: false`). It also does not require high-confidence Google attribution when summarizing traffic sources.

---

## Summary of root causes

1. **Source detection bug:** Server accepts client `trafficChannel` without verifying referrer/UTM → false “Google (search)”.
2. **Human classification bug:** UA-only bot filter; zero-engagement Linux/Chrome sessions counted as humans.
3. **Identity bug:** Tab `sessionId` only; no durable visitorId; no eventId idempotency.
4. **Single-article pattern:** External repeated hits on a popular blog URL + one session per hit — not a hardcoded pathname bug.
5. **Legacy mixing:** No `analyticsVersion`; old and new semantics look identical in admin.

---

## Fix direction (implemented in follow-up)

- Analytics **v2** records with server-side attribution + confidence.
- Layered bot / `suspected_bot` / human classification using engagement.
- Admin tabs: Humans / Suspected / Bots / All; default humans + v2.
- AI reports label sources separately and exclude confirmed/suspected bots from “business” human totals.
- Preserve legacy Firestore rows; mark new rows `analyticsVersion: 2`.
