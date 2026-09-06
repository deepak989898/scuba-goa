# SEO Cannibalization Implementation Report — Phase 1

**Website:** https://www.bookscubagoa.com  
**Date:** 2026-09-06  
**Status:** Implemented in codebase (deploy required for live HTTP validation)

## Summary

Phase 1 addresses the highest-risk cannibalization clusters without deleting Firestore documents or removing stored blog/guide body content. Changes use:

- **16 permanent 301 redirects** (`next.config.ts` via `src/lib/seo-cannibalization/redirects.ts`)
- **Render-time metadata patches** for surviving pages with overlapping intent
- **Content supplements** on primary hub pages (non-destructive append)
- **Hub internal links** on scuba, Russian nightlife, and water sports pages
- **Sitemap / GSC inventory** exclusion of redirect sources
- **Blog & guides index** filtering of redirect sources
- **Service catalog merge** restoring `/services/casino-bookings` when missing from Firestore

---

## Redirect & action table

| Old URL | Final URL | Action | Reason | Status |
|---------|-----------|--------|--------|--------|
| `/guides/russian-club-goa` | `/guides/russian-night-club-goa` | 301 REDIRECT | Duplicate H1 & hub intent | Configured |
| `/blog/complete-guide-scuba-diving-goa` | `/guides/scuba-diving-in-goa` | 301 REDIRECT | Ultimate guide cannibalization | Configured |
| `/blog/complete-guide-to-scuba-diving-in-goa-1` | `/guides/scuba-diving-in-goa` | 301 REDIRECT | Ultimate guide cannibalization | Configured |
| `/blog/a-complete-guide-to-scuba-diving-in-goa` | `/guides/scuba-diving-in-goa` | 301 REDIRECT | Ultimate guide cannibalization | Configured |
| `/guides/scuba-diving-in-goa-price` | `/blog/scuba-diving-price-guide-2026` | 301 REDIRECT | Price intent ownership | Configured |
| `/guides/scuba-diving-goa-price` | `/blog/scuba-diving-price-guide-2026` | 301 REDIRECT | Price intent ownership | Configured |
| `/guides/scuba-diving-goa-price-booking` | `/blog/scuba-diving-price-guide-2026` | 301 REDIRECT | Price intent ownership | Configured |
| `/blog/scuba-diving-booking-baga` | `/guides/scuba-diving-in-baga-goa` | 301 REDIRECT | Duplicate Baga scuba intent | Configured |
| `/blog/exploring-goa-best-water-sports-activities` | `/guides/water-sports-goa` | 301 REDIRECT | Water sports hub | Configured |
| `/blog/why-goa-is-the-ultimate-destination-for-water-sports` | `/guides/water-sports-goa` | 301 REDIRECT | Water sports hub | Configured |
| `/blog/russian-night-club-in-goa-complete-guide` | `/guides/russian-night-club-goa` | 301 REDIRECT | Duplicate nightlife hub | Configured |
| `/blog/russian-club-goa-entry-fee` | `/guides/russian-club-goa-price` | 301 REDIRECT | Entry fee → price page | Configured |
| `/blog/russian-night-club-in-goa-price-in-grande-island` | `/guides/russian-night-club-goa` | 301 REDIRECT | Misleading slug / no unique intent | Configured |
| `/blog/discount-tire` | `/guides/russian-night-club-goa` | 301 REDIRECT | Off-topic slug; nightclub content | Configured |
| `/blog/season-for-majestic-pride-casino-in-goa-in-goa` | `/blog/majestic-pride-casino-in-goa-in-palolem` | 301 REDIRECT | Majestic Pride consolidation | Configured |
| `/blog/where-to-do-majestic-pride-casino-in-goa-in-goa` | `/blog/majestic-pride-casino-in-goa-in-palolem` | 301 REDIRECT | Majestic Pride consolidation | Configured |
| `/blog/goa-scuba-diving-price-under-5000` | (self) | RETARGET | Long-tail under ₹5000 | Patched |
| `/blog/scuba-diving-safety-tips-for-beginners-2` | (self) | RETARGET | Safety checklist intent | Patched |
| `/guides/best-scuba-diving-goa` | (self) | RETARGET | Beginner scuba intent | Patched |
| `/blog/best-scuba-diving-in-goa` | (self) | RETARGET | Choose best operator | Patched |
| `/blog/russian-night-club-in-goa-goa-same-day-booking` | (self) | RETARGET | Same-day booking | Patched |
| `/blog/russian-night-club-in-goa-in-goa-with-hotel-pickup` | (self) | RETARGET | Hotel pickup | Patched |
| `/blog/russian-night-club-near-baga-calangute-itinerary-cost-honest-review` | (self) | RETARGET | Baga/Calangute itinerary | Patched |
| `/blog/best-russian-night-club-in-goa-package-vs-cheap-option-goa` | (self) | RETARGET | Premium vs budget | Patched |
| `/blog/nightlife-in-baga` | (self) | RETARGET | General Baga nightlife | Patched |
| `/blog/rusian-beach-club-disco-calangute` | (self) | RETARGET | Calangute venue | Patched |
| `/blog/majestic-pride-casino-in-goa-in-palolem` | (self) | RETARGET | Consolidated Majestic Pride hub | Patched |
| `/services/casino-bookings` | (self) | FIX 404 | Fallback service merge | Code fix |

---

## 1. Pages redirected (16)

All listed in table above with **301 REDIRECT**. Implemented in `src/lib/seo-cannibalization/redirects.ts` and wired through `getAllPermanentRedirects()` → `next.config.ts`.

**Validation:** `node scripts/validate-seo-phase1.mjs` — 16 redirects, **no chains**, **no loops**.

---

## 2. Pages retained (primary owners)

| Intent | Primary URL |
|--------|-------------|
| Scuba hub | `/guides/scuba-diving-in-goa` |
| Scuba commercial | `/services/scuba-diving` |
| Scuba price | `/blog/scuba-diving-price-guide-2026` |
| Scuba best time | `/blog/best-time-for-scuba-diving-in-goa` |
| Scuba safety | `/blog/is-scuba-diving-safe` |
| Scuba sites | `/blog/top-5-scuba-diving-spots-in-goa` |
| Scuba Baga | `/guides/scuba-diving-in-baga-goa` |
| Russian nightlife hub | `/guides/russian-night-club-goa` |
| Russian club price | `/guides/russian-club-goa-price` |
| Club Ruskii | `/guides/club-ruskii-reviews` |
| Night club commercial | `/services/night-club` |
| Water sports hub | `/guides/water-sports-goa` |
| Water sports commercial | `/services/water-sports` |
| Casino hub | `/blog/casino-bookings-in-goa-complete-guide-prices-tips` |
| Majestic Pride | `/blog/majestic-pride-casino-in-goa-in-palolem` |

---

## 3. Pages retargeted (metadata only — Firestore unchanged)

See **RETARGET** rows in table. Patches in `src/lib/seo-cannibalization/metadata-patches.ts`, applied via `resolveEnhancedSeoFields()`.

---

## 4. Content merged (render-time supplements)

| Primary page | Supplement |
|--------------|------------|
| `/guides/scuba-diving-in-goa` | Practical planning tips + internal links to price/safety/best-time |
| `/blog/scuba-diving-price-guide-2026` | Quick links to hub, booking, service, under-₹5000 page |
| `/blog/scuba-diving-safety-tips-for-beginners-2` | Link block to safety pillar |
| `/blog/goa-scuba-diving-price-under-5000` | Link block to full price guide |

Source Firestore documents for redirected URLs were **not** modified or deleted.

---

## 5. Internal links changed

Hub link sets in `src/lib/seo-cannibalization/hub-internal-links.ts`, merged in `buildInternalLinks()`:

- **Scuba hub** → service, price guide, best time, safety, top sites, Baga guide
- **Russian hub** → Ruskii, price guide, night-club service, booking
- **Water sports hub** → service, cheap water sports blog
- **Price pillar blog** → scuba hub, booking, service

---

## 6. Canonicals changed

- Surviving pages: unchanged behaviour — self-referencing canonical via existing `generateMetadata`
- Redirected pages: canonical tags no longer matter for indexing; **HTTP 301** is the authority signal

---

## 7. Sitemap changes

`src/app/sitemap.ts` now excludes **all** `getAllPermanentRedirects()` sources, including:

- Redirected blog slugs (already partially supported)
- Redirected guide slugs (**new**): e.g. `/guides/russian-club-goa`, price guides

`src/lib/gsc-indexing-agent/inventory.ts` — same exclusion for GSC URL inventory.

---

## 8. Remaining cannibalization (Phase 2+)

| Area | Notes |
|------|-------|
| `/blog/best-scuba-diving-in-goa` vs `/guides/best-scuba-diving-goa` | Retargeted to different intents; monitor GSC after deploy |
| Multiple Russian nightlife long-tail blogs | Retained with distinct intents; watch for overlap in GSC |
| `best-islands-scuba-diving-goa-1` vs top-5 spots | Not in Phase 1 scope |
| Legacy pillar blogs vs AI duplicates | Many coexist; Phase 2 merge candidates |
| `/services/pubs`, `/services/disco` | Already 301 → `/services/night-club` (pre-existing) |

---

## 9. Issues requiring manual review

1. **Deploy to production** — redirects and casino fix validate only after Vercel deploy.
2. **Firestore sync (optional)** — admin may later align Firestore `metaTitle`/`headline` with patches for consistency in admin UI.
3. **Google Search Console** — submit updated sitemap after deploy; expect 2–6 weeks for redirect consolidation in SERPs.
4. **Redirected blog posts still `published: true` in Firestore** — intentional; unpublishing is optional cleanup in Phase 2.

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/seo-cannibalization/redirects.ts` | **New** — Phase 1 redirect map |
| `src/lib/seo-cannibalization/metadata-patches.ts` | **New** — intent separation patches |
| `src/lib/seo-cannibalization/content-supplements.ts` | **New** — hub content append |
| `src/lib/seo-cannibalization/hub-internal-links.ts` | **New** — curated hub links |
| `src/lib/blog-redirects.ts` | Merge cannibalization redirects; helpers |
| `src/lib/content-seo-enhancements.ts` | Patches + hub links |
| `src/lib/get-services-server.ts` | Merge missing fallback services |
| `src/app/sitemap.ts` | Exclude guide redirect sources |
| `src/lib/gsc-indexing-agent/inventory.ts` | Exclude guide redirect sources |
| `src/app/blog/[slug]/page.tsx` | Redirect guard, patches, supplements |
| `src/app/guides/[slug]/page.tsx` | Patches, supplements, H1 fix |
| `src/app/blog/page.tsx` | Hide redirected posts from index |
| `src/app/guides/page.tsx` | Hide redirected guides from index |
| `scripts/validate-seo-phase1.mjs` | **New** — redirect chain validator |
| `docs/SEO_CANNIBALIZATION_FIX_LOG.md` | **New** — change log |

---

## REMAINING SEO RISKS

1. **Production not yet deployed** — live site still serves duplicate content until this build ships.
2. **AI blog volume** — ~47 indexed blogs; many long-tail pages not yet audited in Phase 2.
3. **Firestore documents for redirected URLs remain published** — crawlers that ignore redirects could still discover URLs via external backlinks (mitigated by 301 + sitemap exclusion).
4. **Content supplements are render-time only** — primary guide body in Firestore admin still shows old text; editors see supplements only on public site until manually merged in admin (optional).
5. **`/blog/casino-bookings-in-goa-complete-guide-prices-tips`** — verify slug is live and indexed (not validated in this session if not on blog index page 1–3).
6. **Duplicate H1 across non-Phase-1 pages** — e.g. multiple Russian blogs may still share similar titles until GSC data confirms retargeting worked.
7. **No automated live HTTP test in CI** — run post-deploy curl checks for all 16 redirect sources.

### Post-deploy verification checklist

```bash
node scripts/validate-seo-phase1.mjs
# After deploy, spot-check:
curl -I https://www.bookscubagoa.com/guides/russian-club-goa
curl -I https://www.bookscubagoa.com/blog/complete-guide-scuba-diving-goa
curl -I https://www.bookscubagoa.com/services/casino-bookings
```

Expected: first two return `308` or `301` to final URL; casino returns `200`.

---

**Phase 1 objective:** one primary URL per core intent + supporting long-tail pages + clear internal linking + no duplicate indexable content for the worst clusters. **Not claimed fully solved until production deploy + GSC re-crawl.**
