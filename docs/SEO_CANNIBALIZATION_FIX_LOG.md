# SEO Cannibalization Fix Log — Phase 1

**Project:** Book Scuba Goa  
**Started:** 2026-09-06  
**Scope:** Phase 1 only (per approved audit)  
**Policy:** No Firestore document deletion; no blog body removal from database; redirects via permanent 301 in `next.config.ts`.

## Backup / safety strategy

- All redirect mappings live in version-controlled `src/lib/seo-cannibalization/redirects.ts`.
- Firestore documents for redirected URLs remain published; traffic is handled at HTTP layer.
- Metadata retargeting for surviving pages uses render-time patches (`metadata-patches.ts`) — does not overwrite Firestore until admin chooses to sync.
- Content supplements append only non-duplicate sections to primary guides at render time.
- Service catalog merge restores missing fallback slugs (e.g. `casino-bookings`) without deleting Firestore data.

---

## Change log

| # | Affected URL | Primary URL | Action | Reason | Redirect | Content preserved | Metadata changed | Internal links |
|---|--------------|-------------|--------|--------|----------|-------------------|------------------|----------------|
| 1 | `/guides/russian-club-goa` | `/guides/russian-night-club-goa` | 301 REDIRECT | Duplicate H1 & intent with night-club hub | Yes | N/A (hub is primary) | Hub unchanged | Hub links added |
| 2 | `/blog/complete-guide-scuba-diving-goa` | `/guides/scuba-diving-in-goa` | 301 REDIRECT | Ultimate guide cannibalization | Yes | Hub supplement section | — | Hub links |
| 3 | `/blog/complete-guide-to-scuba-diving-in-goa-1` | `/guides/scuba-diving-in-goa` | 301 REDIRECT | Same as #2 | Yes | Via hub supplement | — | — |
| 4 | `/blog/a-complete-guide-to-scuba-diving-in-goa` | `/guides/scuba-diving-in-goa` | 301 REDIRECT | Same as #2 | Yes | Via hub supplement | — | — |
| 5 | `/guides/scuba-diving-in-goa-price` | `/blog/scuba-diving-price-guide-2026` | 301 REDIRECT | Price intent ownership | Yes | Price pillar is primary | — | Price pillar links |
| 6 | `/guides/scuba-diving-goa-price` | `/blog/scuba-diving-price-guide-2026` | 301 REDIRECT | Price cannibalization | Yes | — | — | — |
| 7 | `/guides/scuba-diving-goa-price-booking` | `/blog/scuba-diving-price-guide-2026` | 301 REDIRECT | Price cannibalization | Yes | — | — | — |
| 8 | `/blog/goa-scuba-diving-price-under-5000` | (self) | RETARGET | Long-tail under ₹5000 | No | — | Title/H1/meta | Link to price pillar |
| 9 | `/blog/scuba-diving-safety-tips-for-beginners-2` | (self) | RETARGET | Checklist vs safety pillar | No | — | Title/H1/meta | Link to safety pillar |
| 10 | `/guides/best-scuba-diving-goa` | (self) | RETARGET | Beginner intent | No | — | H1/meta | Link to scuba hub |
| 11 | `/blog/best-scuba-diving-in-goa` | (self) | RETARGET | Choose best operator | No | — | Title/H1/meta | Link to hub + service |
| 12 | `/blog/scuba-diving-booking-baga` | `/guides/scuba-diving-in-baga-goa` | 301 REDIRECT | Duplicate Baga scuba intent | Yes | Baga guide primary | — | — |
| 13 | `/blog/exploring-goa-best-water-sports-activities` | `/guides/water-sports-goa` | 301 REDIRECT | Water sports hub | Yes | — | — | Hub links |
| 14 | `/blog/why-goa-is-the-ultimate-destination-for-water-sports` | `/guides/water-sports-goa` | 301 REDIRECT | Water sports hub | Yes | — | — | — |
| 15 | `/blog/russian-night-club-in-goa-complete-guide` | `/guides/russian-night-club-goa` | 301 REDIRECT | Duplicate hub | Yes | — | — | — |
| 16 | `/blog/russian-club-goa-entry-fee` | `/guides/russian-club-goa-price` | 301 REDIRECT | Price/entry fee intent | Yes | — | — | — |
| 17 | `/blog/russian-night-club-in-goa-price-in-grande-island` | `/guides/russian-night-club-goa` | 301 REDIRECT | Misleading slug; no unique intent | Yes | — | — | — |
| 18 | `/blog/discount-tire` | `/guides/russian-night-club-goa` | 301 REDIRECT | Off-topic slug; nightclub content | Yes | — | — | — |
| 19 | `/blog/season-for-majestic-pride-casino-in-goa-in-goa` | `/blog/majestic-pride-casino-in-goa-in-palolem` | 301 REDIRECT | Majestic Pride consolidation | Yes | Primary page | Primary retarget | — |
| 20 | `/blog/where-to-do-majestic-pride-casino-in-goa-in-goa` | `/blog/majestic-pride-casino-in-goa-in-palolem` | 301 REDIRECT | Majestic Pride consolidation | Yes | — | — | — |
| 21 | `/services/casino-bookings` | (self) | FIX 404 | Missing from live Firestore catalog | No | Fallback service merge | — | — |

### Retained Russian nightlife long-tail (metadata retarget only)

| URL | Intent |
|-----|--------|
| `/blog/russian-night-club-in-goa-goa-same-day-booking` | Same-day booking |
| `/blog/russian-night-club-in-goa-in-goa-with-hotel-pickup` | Hotel pickup |
| `/blog/russian-night-club-near-baga-calangute-itinerary-cost-honest-review` | Baga/Calangute itinerary |
| `/blog/best-russian-night-club-in-goa-package-vs-cheap-option-goa` | Premium vs budget |
| `/blog/nightlife-in-baga` | General Baga nightlife |
| `/blog/rusian-beach-club-disco-calangute` | Calangute venue |
