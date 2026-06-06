# SEO Health Audit — Book Scuba Goa

Automated technical SEO audit: sitemap, robots, canonicals, GSC, GA4, schema.

## Admin

- **Page:** `/admin/seo-health`
- **API:** `GET/POST /api/admin/seo-health`
- **Firestore:** `seoHealthReports/{dateIst}`

## What the audit checks

1. **sitemap.xml** — reachable, no `/admin/*` URLs, homepage present
2. **robots.txt** — sitemap directive, admin disallowed
3. **Canonical tags** — key public pages
4. **Metadata** — title length
5. **Schema** — JSON-LD presence on key pages
6. **Google Search Console** — API connection + 7-day impressions/clicks
7. **GA4** — property ID + service account access

## Fixes applied in code

- Removed `/admin/login` from sitemap
- Added legal pages to sitemap
- Canonical tags on about, contact, services, gallery, legal pages
- FAQPage schema on homepage + booking page
- Internal links on homepage SEO section
- Keyword `book scuba goa` in site constants

## Why daily email shows 0 visitors

The AI analytics email combines:

| Source | Your screenshot | Meaning |
|--------|-----------------|---------|
| Internal (Firestore pageViews) | 0 visitors | No real users tracked that day |
| Google Search | 0 impressions | Site not ranking / not indexed yet |
| GA4 | 1 user, 4 sessions | Likely you testing the site |

**This is normal for a new or low-traffic site.** The email is working correctly — it reports truthfully that nobody came from Google yet.

## Manual steps (required for traffic)

1. **Google Search Console** → add `https://bookscubagoa.com`
2. Verify ownership (HTML tag via `GOOGLE_SITE_VERIFICATION` in Vercel)
3. Add service account email from Firebase as **Owner** in GSC
4. Submit sitemap: `https://bookscubagoa.com/sitemap.xml`
5. URL Inspection → Request indexing for `/` and `/booking`
6. **Google Business Profile** — create/verify Baga listing with website link
7. Share site on WhatsApp status, Instagram, Facebook daily
8. Ask happy customers for Google reviews

## Env vars (Vercel)

```
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://bookscubagoa.com/
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
GOOGLE_SITE_VERIFICATION=your-meta-token
FIREBASE_SERVICE_ACCOUNT_KEY=...
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

Service account email (from JSON) must be added as Viewer on GA4 and User on Search Console.
