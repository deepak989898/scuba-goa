# SEO Keyword Cannibalization Audit — Book Scuba Goa

**Website:** https://www.bookscubagoa.com  
**Business:** Book Scuba Goa (scuba diving, water sports, tours, nightlife & casino bookings — Baga, North Goa)  
**Audit date:** 6 September 2026  
**Scope:** Live `/blog/`, `/guides/`, `/services/`, and key landing pages (`/`, `/booking`)  
**Method:** Production HTML metadata scrape (title, H1, meta description, canonical) + codebase SEO architecture review  
**Important:** **No pages were changed, deleted, redirected, or merged as part of this audit.**

---

## Executive summary

Book Scuba Goa has grown a large content footprint through **AI blog automation** and **SEO guide pages**, layered on top of a smaller set of **editorial pillar blogs**. The site is **not** suffering from random word overlap — the real problem is **intent collision**: multiple URLs targeting the same primary keyword with nearly identical titles, H1s, and meta descriptions.

### Severity overview

| Severity | Cluster | Issue |
|----------|---------|--------|
| **Critical** | Russian nightlife | 2 guides share the **same H1**; 10+ blog URLs compete for “Russian night club Goa” |
| **High** | Scuba “ultimate guide” | 6+ URLs compete for “scuba diving in Goa” / “ultimate guide” |
| **High** | Scuba pricing | 5+ URLs compete for “scuba diving price Goa” |
| **Medium** | Water sports | 4 guides/blogs + service page overlap on “water sports Goa” |
| **Medium** | Casino (Majestic Pride) | 3 blogs duplicate “Majestic Pride Casino Goa” intent |
| **Low–Medium** | Scuba safety | 2 URLs overlap on beginner safety tips |
| **Low** | Geographic (Vagator, Baga) | Related but mostly distinct if differentiated |

### Recommended primary pages (one per cluster)

| Cluster | Primary URL | Role |
|---------|-------------|------|
| Scuba booking (transactional) | `/services/scuba-diving` + `/booking` | Convert & rank for “book scuba Goa” |
| Scuba hub (informational) | `/guides/scuba-diving-in-goa` | Main “scuba diving in Goa” guide |
| Scuba pricing | `/blog/scuba-diving-price-guide-2026` | Price intent (pillar; strongest editorial depth) |
| Scuba best time | `/blog/best-time-for-scuba-diving-in-goa` | Seasonality intent |
| Scuba safety | `/blog/is-scuba-diving-safe` | Safety / beginner confidence |
| Scuba dive sites | `/blog/top-5-scuba-diving-spots-in-goa` | Sites / Grande Island list intent |
| Scuba Baga | `/guides/scuba-diving-in-baga-goa` | Location-specific scuba (Baga) |
| Russian nightlife hub | `/guides/russian-night-club-goa` | Category hub (after deduping twin guide) |
| Russian club pricing | `/guides/russian-club-goa-price` | “Russian club Goa price / entry fee” |
| Club Ruskii (venue) | `/guides/club-ruskii-reviews` | Venue review (unique; keep) |
| Nightlife booking | `/services/night-club` | Transactional nightlife |
| Water sports hub | `/guides/water-sports-goa` | Informational water sports |
| Water sports booking | `/services/water-sports` | Transactional |
| Dolphin trips | `/services/dolphin-trip` + `/blog/dolphin-sighting-goa` | Book vs plan (distinct intents) |
| Casino hub | `/blog/casino-bookings-in-goa-complete-guide-prices-tips` | General casino booking guide |
| North Goa sightseeing | `/services/north-goa-tour` | Tours (not nightlife) |

---

## Methodology & cannibalization rules used

A page pair was flagged as **cannibalization** only when:

1. **Primary search intent** overlaps (e.g. both target “Russian night club Goa” nightlife planning, not just mention “Goa”).
2. **Target keyword** overlap is significant (head term or close variant in title/H1/meta).
3. **SERP substitution risk** is high — Google could reasonably rank either URL for the same query.

Pages with shared vocabulary but **different intent** (e.g. “scuba safety” vs “scuba price”) were **not** flagged as cannibalization — only noted as **cluster neighbors** needing internal links.

---

## Site architecture notes

- **Blogs** (`/blog/[slug]`): Firestore `blogPosts` — mix of legacy pillars + AI-generated posts.
- **Guides** (`/guides/[slug]`): Firestore `seoPages` — mostly AI SEO landing pages.
- **Services** (`/services/[slug]`): Firestore `services` — commercial landing pages.
- **Redirects exist** for some legacy slugs (`src/lib/blog-redirects.ts`) but **most duplicate AI URLs are still indexable**.
- **`/services/casino-bookings` returns 404** on production while casino blogs still exist — broken commercial landing page.

---

# Topic clusters

## Cluster A — Scuba diving (core informational)

**Primary keyword:** scuba diving in Goa  
**Primary page:** `/guides/scuba-diving-in-goa`  
**Commercial canonical:** `/services/scuba-diving`

| URL | Cannibalization? | Notes |
|-----|------------------|-------|
| `/guides/scuba-diving-in-goa` | — | **PRIMARY informational hub** |
| `/services/scuba-diving` | No (transactional) | Different intent: book & packages |
| `/` | No | Brand + commercial homepage |
| `/booking` | No | Checkout intent |

**Cannibalization within cluster (high):**

| URL | Action | Target / canonical |
|-----|--------|-------------------|
| `/blog/complete-guide-scuba-diving-goa` | MERGE | → `/guides/scuba-diving-in-goa` |
| `/blog/complete-guide-to-scuba-diving-in-goa-1` | MERGE | → `/guides/scuba-diving-in-goa` |
| `/blog/a-complete-guide-to-scuba-diving-in-goa` | MERGE | → `/guides/scuba-diving-in-goa` |
| `/blog/best-scuba-diving-in-goa` | UPDATE | Keep as “best scuba / operator choice” — retarget away from generic hub |
| `/guides/best-scuba-diving-goa` | UPDATE | Differentiate as **beginner** angle or merge into hub |

**Duplicate H1 detected:**  
`Explore Scuba Diving in Goa: Your Ultimate Guide` appears on **3 blog URLs** — classic cannibalization.

---

## Cluster B — Scuba diving price

**Primary keyword:** scuba diving price Goa  
**Primary page:** `/blog/scuba-diving-price-guide-2026` (pillar; deepest content)

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/blog/scuba-diving-price-guide-2026` | — | **KEEP (primary)** |
| `/guides/scuba-diving-in-goa-price` | Yes | UPDATE or MERGE → pillar |
| `/guides/scuba-diving-goa-price` | Yes | MERGE (North Goa price variant too thin) |
| `/guides/scuba-diving-goa-price-booking` | Yes | MERGE → pillar + `/booking` |
| `/blog/goa-scuba-diving-price-under-5000` | Partial | UPDATE — long-tail “under ₹5000”; link to pillar, don’t compete on main price term |

---

## Cluster C — Scuba best time & weather

**Primary keyword:** best time for scuba diving in Goa  
**Primary page:** `/blog/best-time-for-scuba-diving-in-goa`

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/blog/best-time-for-scuba-diving-in-goa` | — | **KEEP (primary)** |
| `/blog/is-scuba-diving-in-goa-open-in-rainy-season-goa` | No | **KEEP** — monsoon sub-intent; link to best-time pillar |
| `/blog/goa-monsoon-adventures` | No | Broader monsoon travel (if published) |

---

## Cluster D — Scuba safety & beginners

**Primary keyword:** is scuba diving safe in Goa / beginner scuba safety  
**Primary page:** `/blog/is-scuba-diving-safe`

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/blog/is-scuba-diving-safe` | — | **KEEP (primary safety)** |
| `/blog/scuba-diving-safety-tips-for-beginners-2` | **Yes** | UPDATE or MERGE — overlaps safety + tips |
| `/blog/can-non-swimmers-do-scuba-diving-in-goa-in-goa` | No | **KEEP** — non-swimmer sub-intent |
| `/blog/first-time-scuba-myths` | No | **KEEP** — myth-busting angle |
| `/blog/goa-vs-andaman-scuba-for-beginners` | No | **KEEP** — destination comparison |
| `/blog/best-place-for-beginner-scuba-in-india` | Partial | UPDATE — India-wide; point to Goa hub |

---

## Cluster E — Scuba sites, Grande Island & island combo

| Primary intent | Primary page |
|----------------|--------------|
| Dive sites list | `/blog/top-5-scuba-diving-spots-in-goa` |
| Grande Island focus | `/blog/exploring-grand-island-scuba-diving-guide` |
| Scuba + island package | `/blog/scuba-diving-with-island-trip-goa` |

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/blog/top-5-scuba-diving-spots-in-goa` | — | **KEEP (sites primary)** |
| `/blog/best-islands-scuba-diving-goa-1` | **Yes** | MERGE → top-5 or Grand Island guide |
| `/blog/exploring-grand-island-scuba-diving-guide` | Partial | UPDATE — narrow to Grande Island only |
| `/blog/scuba-diving-with-island-trip-goa` | No | **KEEP** — package/combo intent |

---

## Cluster F — Scuba in Baga / beach activities

**Primary keyword:** scuba diving Baga Goa  
**Primary page:** `/guides/scuba-diving-in-baga-goa`

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/guides/scuba-diving-in-baga-goa` | — | **KEEP (primary)** |
| `/blog/scuba-diving-booking-baga` | **Yes** | MERGE or REDIRECT → Baga guide + `/booking` |
| `/blog/baga-beach-activities` | Partial | **UPDATE** — broaden to all Baga activities; one scuba link only |

---

## Cluster G — Russian nightlife (CRITICAL)

**Primary keywords:** Russian night club Goa, Russian club Goa, Russian nightlife Goa  
**Primary hub:** `/guides/russian-night-club-goa` (after fixing duplicate with `/guides/russian-club-goa`)  
**Venue-specific:** `/guides/club-ruskii-reviews`  
**Price intent:** `/guides/russian-club-goa-price`  
**Booking:** `/services/night-club`

### Critical finding: duplicate guides

| URL | H1 (live) | Issue |
|-----|-----------|-------|
| `/guides/russian-club-goa` | Experience the Best of Russian Nightlife in Goa | **Identical H1** |
| `/guides/russian-night-club-goa` | Experience the Best of Russian Nightlife in Goa | **Identical H1** |

These two guides are **direct cannibalization** — same intent, same headline, same meta theme.

### Russian nightlife blog overlap

| URL | Suggested keyword focus | Cannibalization | Action |
|-----|-------------------------|-----------------|--------|
| `/blog/russian-night-club-in-goa-complete-guide` | Russian night club guide | Yes | MERGE → hub guide |
| `/blog/russian-night-club-in-goa-goa-same-day-booking` | Same-day booking | Partial | UPDATE — keep only if unique; else MERGE |
| `/blog/russian-night-club-in-goa-price-in-grande-island` | Price (confused with Grande Island) | Yes | REDIRECT — misleading slug/intent |
| `/blog/russian-night-club-near-baga-calangute-itinerary-cost-honest-review` | Baga/Calangute itinerary | Partial | **KEEP** — geographic angle; retitle for clarity |
| `/blog/russian-night-club-in-goa-in-goa-with-hotel-pickup` | Hotel pickup | Partial | UPDATE — support page; link to hub |
| `/blog/russian-club-goa-entry-fee` | Entry fee | Yes | MERGE → `/guides/russian-club-goa-price` |
| `/blog/best-russian-night-club-in-goa-package-vs-cheap-option-goa` | Premium vs budget | No | **KEEP** — comparison intent |
| `/blog/discount-tire` | Russian night club (off-topic slug) | Yes | REDIRECT → hub or Ruskii |
| `/blog/rusian-beach-club-disco-calangute` | Calangute disco venue | Partial | UPDATE — venue-specific; link Ruskii/hub |
| `/blog/nightlife-in-baga` | Baga nightlife general | Partial | UPDATE — not Russia-specific; internal link to hub |
| `/blog/nightlife-goa-responsibly` | Clubs, pubs & casinos | No | **KEEP** — broader responsible nightlife |

**Recommended internal links to add (cluster-wide):**  
Hub guide → Ruskii review → price guide → `/services/night-club` → `/booking`

---

## Cluster H — Water sports

**Primary keyword:** water sports Goa  
**Primary page:** `/guides/water-sports-goa` (info) + `/services/water-sports` (book)

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/guides/water-sports-goa` | — | **KEEP (primary guide)** |
| `/services/water-sports` | No | Transactional |
| `/guides/goa-water-sports-package` | Partial | UPDATE — combo/scuba package angle only |
| `/blog/cheap-water-sports-goa` | No | **KEEP** — budget/hidden fees angle |
| `/blog/exploring-goa-best-water-sports-activities` | Yes | MERGE → water-sports guide |
| `/blog/why-goa-is-the-ultimate-destination-for-water-sports` | Yes | MERGE → water-sports guide |
| `/blog/banana-boat-near-water-sports-in-goa-goa` | No | **KEEP** — single-activity long-tail |

---

## Cluster I — Casino

**Primary keyword:** casino Goa / casino bookings Goa  
**Primary page:** `/blog/casino-bookings-in-goa-complete-guide-prices-tips`

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/blog/casino-bookings-in-goa-complete-guide-prices-tips` | — | **KEEP (primary)** |
| `/services/casino-bookings` | — | **FIX 404** — should be commercial landing |
| `/blog/do-i-need-license-for-bigdaddy-casino-in-goa-in-goa` | No | **KEEP** — BigDaddy license FAQ |
| `/blog/bigdaddy-casino-age-limit-goa` | No | **KEEP** — age limit FAQ |
| `/blog/majestic-pride-casino-in-goa-in-palolem` | Yes (group) | MERGE Majestic Pride trio |
| `/blog/season-for-majestic-pride-casino-in-goa-in-goa` | Yes | MERGE |
| `/blog/where-to-do-majestic-pride-casino-in-goa-in-goa` | Yes | MERGE |
| `/blog/nightlife-goa-responsibly` | No | Cross-link only |

---

## Cluster J — Dolphin trips

**Primary keyword:** dolphin trip Goa  
**Primary page:** `/services/dolphin-trip` (book) + `/blog/dolphin-sighting-goa` (planning)

| URL | Cannibalization? | Action |
|-----|------------------|--------|
| `/services/dolphin-trip` | — | **KEEP (primary commercial)** |
| `/blog/dolphin-sighting-goa` | No | **KEEP** — etiquette & timing intent |

No significant cannibalization within cluster.

---

## Cluster K — Geography: Vagator, Calangute, Baga, North Goa

| URL | Intent | Cannibalization | Action |
|-----|--------|-----------------|--------|
| `/blog/best-beaches-in-vagator` | Vagator beaches | No | **KEEP** |
| `/blog/nightlife-in-baga` | Baga nightlife | Partial (vs Russian hub) | UPDATE — Baga-focused only |
| `/blog/russian-night-club-near-baga-calangute-itinerary-cost-honest-review` | Baga/Calangute Russian clubs | Partial | **KEEP** with clearer title |
| `/blog/rusian-beach-club-disco-calangute` | Calangute venue | Partial | UPDATE venue focus |
| `/services/north-goa-tour` | North Goa sightseeing | No | **KEEP** — different from beach guides |

**No dedicated Vagator/Calangute landing pages** — opportunity, not cannibalization.

---

## Cluster L — Long-tail / low cannibalization (keep)

| URL | Intent | Action |
|-----|--------|--------|
| `/blog/goa-scuba-trip-from-chandigarh` | Travel from Chandigarh | KEEP |
| `/blog/cheap-scuba-diving-palolem` | Palolem/South Goa scuba | KEEP (location-specific) |
| `/blog/goa-vs-andaman-scuba-for-beginners` | Destination comparison | KEEP |
| `/blog/family-friendly-activities-goa` | Family activities | KEEP |
| `/blog/dudhsagar-trip-guide` | Dudhsagar | KEEP |
| `/blog/scuba-diving-in-goa-for-couples` | Couples scuba | KEEP (if live) |
| `/blog/family-scuba-goa-beginner-guide` | Family scuba | KEEP (if live) |

---

# Page-by-page audit

Below: **G** = Guide, **B** = Blog, **S** = Service, **L** = Landing.

### Legend — recommended action

- **KEEP** — correct intent ownership  
- **UPDATE** — keep URL; change title/H1/meta/body to unique intent  
- **MERGE** — consolidate content into primary; eventually redirect  
- **REDIRECT** — duplicate/thin/misleading slug  

---

## Guides (12 live)

### 1. `/guides/scuba-diving-in-goa`

| Field | Value |
|-------|-------|
| **URL** | https://www.bookscubagoa.com/guides/scuba-diving-in-goa |
| **Page title** | Unveil the Wonders of Scuba Diving in Goa: Packages & Tips |
| **H1** | Unveil the Wonders of Scuba Diving in Goa: Packages & Tips |
| **Meta title** | Scuba Diving in Goa: Discover Packages & Essential Tips \| Book Scuba Goa |
| **Meta description** | Explore Goa's underwater paradise with our scuba diving packages… |
| **Main topic** | General scuba diving in Goa |
| **Primary intent** | Informational — plan & understand scuba in Goa |
| **Primary keyword** | scuba diving in Goa |
| **Secondary keywords** | scuba packages Goa, beginner scuba Goa, book scuba Goa |
| **Related keywords** | Grande Island, Baga scuba, try dive Goa |
| **Similarity** | High overlap with 6+ blog “ultimate guide” posts |
| **Cannibalization** | **Yes** — hub competes with multiple blogs |
| **Action** | **KEEP** as **primary informational hub** |
| **Canonical target** | Self (hub) |
| **Internal links to add** | → `/services/scuba-diving`, `/blog/scuba-diving-price-guide-2026`, `/blog/best-time-for-scuba-diving-in-goa`, `/blog/is-scuba-diving-safe`, `/guides/scuba-diving-in-baga-goa` |

---

### 2. `/guides/best-scuba-diving-goa`

| Field | Value |
|-------|-------|
| **URL** | https://www.bookscubagoa.com/guides/best-scuba-diving-goa |
| **Page title** | Beginner Scuba Diving in Goa: Your Ultimate Guide |
| **H1** | Beginner Scuba Diving in Goa: Your Ultimate Guide |
| **Meta title** | Beginner Scuba Diving in Goa \| Dive Into Adventure \| Book Scuba Goa |
| **Meta description** | Discover the best beginner scuba diving packages in Goa… |
| **Main topic** | Beginner scuba |
| **Primary intent** | Informational — first-time divers |
| **Primary keyword** | beginner scuba diving Goa |
| **Secondary keywords** | first scuba Goa, try dive beginner |
| **Related keywords** | non-swimmer scuba, scuba safety |
| **Similarity** | Overlaps scuba hub + `/blog/best-scuba-diving-in-goa` |
| **Cannibalization** | **Partial** |
| **Action** | **UPDATE** — own “beginner” intent; differentiate H1 from hub |
| **Canonical target** | Self after rewrite |
| **Internal links to add** | → `/blog/is-scuba-diving-safe`, `/blog/can-non-swimmers-do-scuba-diving-in-goa-in-goa`, `/services/scuba-diving` |

---

### 3. `/guides/scuba-diving-in-goa-price`

| Field | Value |
|-------|-------|
| **URL** | https://www.bookscubagoa.com/guides/scuba-diving-in-goa-price |
| **H1** | Scuba Diving in Goa: Prices, Packages & Booking Tips for 2026 |
| **Meta title** | Scuba Diving in Goa: 2026 Prices & Packages Guide \| Book Scuba Goa |
| **Main topic** | Scuba pricing |
| **Primary intent** | Commercial investigation — price comparison |
| **Primary keyword** | scuba diving price Goa |
| **Cannibalization** | **Yes** — competes with price pillar blog + 2 other price guides |
| **Action** | **MERGE** → `/blog/scuba-diving-price-guide-2026` |
| **Canonical target** | `/blog/scuba-diving-price-guide-2026` |
| **Internal links** | → `/booking`, `/services/scuba-diving` |

---

### 4. `/guides/scuba-diving-goa-price`

| Field | Value |
|-------|-------|
| **H1** | Scuba Diving In North Goa Price |
| **Primary keyword** | scuba diving north Goa price |
| **Cannibalization** | **Yes** — thin variant of price cluster |
| **Action** | **MERGE** → price pillar |
| **Canonical target** | `/blog/scuba-diving-price-guide-2026` |

---

### 5. `/guides/scuba-diving-goa-price-booking`

| Field | Value |
|-------|-------|
| **H1** | Affordable Scuba Diving in Goa: Prices & Booking Guide 2026 |
| **Cannibalization** | **Yes** |
| **Action** | **MERGE** → price pillar + `/booking` |
| **Canonical target** | `/blog/scuba-diving-price-guide-2026` |

---

### 6. `/guides/scuba-diving-in-baga-goa`

| Field | Value |
|-------|-------|
| **H1** | Discover Scuba Diving in Baga Goa: Exciting Island Packages |
| **Primary keyword** | scuba diving Baga Goa |
| **Cannibalization** | **Partial** with `/blog/scuba-diving-booking-baga` |
| **Action** | **KEEP** — primary Baga scuba page |
| **Canonical target** | Self |
| **Internal links** | → `/services/scuba-diving`, `/blog/scuba-diving-with-island-trip-goa`, `/blog/baga-beach-activities` |

---

### 7. `/guides/water-sports-goa`

| Field | Value |
|-------|-------|
| **H1** | Unforgettable Water Sports in Goa: Prices & Best Activities |
| **Primary keyword** | water sports Goa |
| **Cannibalization** | **Partial** with 2 water-sports blogs |
| **Action** | **KEEP** — primary water sports guide |
| **Canonical target** | Self |
| **Internal links** | → `/services/water-sports`, `/blog/cheap-water-sports-goa` |

---

### 8. `/guides/goa-water-sports-package`

| Field | Value |
|-------|-------|
| **H1** | Goa Water Sports Package: Scuba Diving & Thrilling Adventures |
| **Primary keyword** | Goa water sports package |
| **Cannibalization** | **Partial** — combo package vs general water sports |
| **Action** | **UPDATE** — focus on combo packages only |
| **Canonical target** | Self (combo intent) |

---

### 9. `/guides/russian-night-club-goa`

| Field | Value |
|-------|-------|
| **H1** | Experience the Best of Russian Nightlife in Goa |
| **Primary keyword** | Russian night club Goa |
| **Cannibalization** | **Yes** — duplicate H1 with `/guides/russian-club-goa` + 8+ blogs |
| **Action** | **KEEP** as **primary nightlife hub** (choose this URL over russian-club-goa) |
| **Canonical target** | Self |
| **Internal links** | → `/guides/club-ruskii-reviews`, `/guides/russian-club-goa-price`, `/services/night-club` |

---

### 10. `/guides/russian-club-goa`

| Field | Value |
|-------|-------|
| **H1** | Experience the Best of Russian Nightlife in Goa (**duplicate**) |
| **Cannibalization** | **Yes — critical duplicate of #9** |
| **Action** | **REDIRECT** → `/guides/russian-night-club-goa` |
| **Canonical target** | `/guides/russian-night-club-goa` |

---

### 11. `/guides/russian-club-goa-price`

| Field | Value |
|-------|-------|
| **H1** | Discover Russian Club Goa Prices: Entry Fees & Packages |
| **Primary keyword** | Russian club Goa price |
| **Cannibalization** | **Partial** with `/blog/russian-club-goa-entry-fee` |
| **Action** | **KEEP** — primary price page |
| **Canonical target** | Self |
| **Internal links** | → `/guides/russian-night-club-goa`, `/services/night-club` |

---

### 12. `/guides/club-ruskii-reviews`

| Field | Value |
|-------|-------|
| **H1** | Club Ruskii Goa Review 2026: Entry Fee, Timings, Location & Booking |
| **Primary keyword** | Club Ruskii Goa review |
| **Cannibalization** | **No** — unique venue intent |
| **Action** | **KEEP** |
| **Canonical target** | Self |
| **Internal links** | → `/guides/russian-club-goa-price`, `/services/night-club` |

---

## Blogs — high-priority pages (cannibalization flagged)

### B1. `/blog/scuba-diving-price-guide-2026` — **KEEP (price primary)**

| Field | Value |
|-------|-------|
| **H1** | Your Ultimate 2026 Scuba Diving Price Guide for Goa |
| **Intent** | Price research + inclusions |
| **Cannibalization** | Target of 3 guide duplicates |
| **Action** | **KEEP** |
| **Links to add** | → `/booking`, `/services/scuba-diving`, `/guides/scuba-diving-in-goa` |

### B2. `/blog/best-time-for-scuba-diving-in-goa` — **KEEP (season primary)**

| H1 | Best Time for Scuba Diving in Goa: Your Essential Guide |
| **Cannibalization** | No direct duplicate |
| **Action** | **KEEP** |

### B3. `/blog/is-scuba-diving-safe` — **KEEP (safety primary)**

| H1 | Is Scuba Diving Safe for Beginners? Your Essential Guide |
| **Action** | **KEEP** |

### B4. `/blog/scuba-diving-safety-tips-for-beginners-2` — **UPDATE/MERGE**

| H1 | Top 10 Scuba Diving Safety Tips for Beginners in Goa |
| **Cannibalization** | **Yes** with `is-scuba-diving-safe` |
| **Action** | **MERGE** into safety pillar OR narrow to “10 tips checklist” only |
| **Canonical** | `/blog/is-scuba-diving-safe` if merged |

### B5–B7. Ultimate guide trio — **MERGE**

| URL | Shared H1 pattern |
|-----|-------------------|
| `/blog/complete-guide-scuba-diving-goa` | Explore Scuba Diving in Goa: Your Ultimate Guide |
| `/blog/complete-guide-to-scuba-diving-in-goa-1` | Same H1 |
| `/blog/a-complete-guide-to-scuba-diving-in-goa` | Same H1 |

**Action:** **MERGE** all → `/guides/scuba-diving-in-goa`

### B8–B14. Russian night club blog set — **MERGE/REDIRECT (most)**

| URL | Action | Target |
|-----|--------|--------|
| `russian-night-club-in-goa-complete-guide` | MERGE | `/guides/russian-night-club-goa` |
| `russian-night-club-in-goa-goa-same-day-booking` | UPDATE or MERGE | Hub (if keeping: unique “same day” title) |
| `russian-night-club-in-goa-price-in-grande-island` | REDIRECT | Hub (slug misleading) |
| `russian-night-club-near-baga-calangute-itinerary-cost-honest-review` | KEEP | Self — Baga/Calangute angle |
| `russian-night-club-in-goa-in-goa-with-hotel-pickup` | UPDATE | Support page |
| `russian-club-goa-entry-fee` | MERGE | `/guides/russian-club-goa-price` |
| `discount-tire` | REDIRECT | Ruskii or hub |
| `best-russian-night-club-in-goa-package-vs-cheap-option-goa` | KEEP | Premium vs budget |

### B15–B17. Water sports blogs — **MERGE duplicates**

| URL | Action |
|-----|--------|
| `exploring-goa-best-water-sports-activities` | MERGE → `/guides/water-sports-goa` |
| `why-goa-is-the-ultimate-destination-for-water-sports` | MERGE → `/guides/water-sports-goa` |
| `cheap-water-sports-goa` | KEEP |

### B18–B20. Majestic Pride casino — **MERGE**

All three → single Majestic Pride guide or section inside casino hub.

---

## Blogs — full inventory (47 URLs found on production)

| # | URL | Primary keyword (suggested) | Cannibalization | Action |
|---|-----|------------------------------|-----------------|--------|
| 1 | `/blog/a-complete-guide-to-scuba-diving-in-goa` | scuba diving Goa guide | Yes | MERGE |
| 2 | `/blog/baga-beach-activities` | Baga beach activities | Partial | UPDATE |
| 3 | `/blog/banana-boat-near-water-sports-in-goa-goa` | banana boat Goa | No | KEEP |
| 4 | `/blog/best-beaches-in-vagator` | beaches Vagator | No | KEEP |
| 5 | `/blog/best-islands-scuba-diving-goa-1` | scuba islands Goa | Yes | MERGE |
| 6 | `/blog/best-place-for-beginner-scuba-in-india` | beginner scuba India | Partial | UPDATE |
| 7 | `/blog/best-russian-night-club-in-goa-package-vs-cheap-option-goa` | Russian club packages | No | KEEP |
| 8 | `/blog/best-scuba-diving-in-goa` | best scuba Goa | Partial | UPDATE |
| 9 | `/blog/best-time-for-scuba-diving-in-goa` | best time scuba Goa | No | **KEEP** |
| 10 | `/blog/bigdaddy-casino-age-limit-goa` | BigDaddy age limit | No | KEEP |
| 11 | `/blog/can-non-swimmers-do-scuba-diving-in-goa-in-goa` | non-swimmer scuba | No | KEEP |
| 12 | `/blog/casino-bookings-in-goa-complete-guide-prices-tips` | casino bookings Goa | No | **KEEP** |
| 13 | `/blog/cheap-scuba-diving-palolem` | scuba Palolem | No | KEEP |
| 14 | `/blog/cheap-water-sports-goa` | cheap water sports | No | KEEP |
| 15 | `/blog/complete-guide-scuba-diving-goa` | scuba guide | Yes | MERGE |
| 16 | `/blog/complete-guide-to-scuba-diving-in-goa-1` | scuba guide | Yes | MERGE |
| 17 | `/blog/discount-tire` | Russian nightclub | Yes | REDIRECT |
| 18 | `/blog/do-i-need-license-for-bigdaddy-casino-in-goa-in-goa` | BigDaddy license | No | KEEP |
| 19 | `/blog/dolphin-sighting-goa` | dolphin sighting Goa | No | KEEP |
| 20 | `/blog/dudhsagar-trip-guide` | Dudhsagar trip | No | KEEP |
| 21 | `/blog/exploring-goa-best-water-sports-activities` | water sports Goa | Yes | MERGE |
| 22 | `/blog/exploring-grand-island-scuba-diving-guide` | Grand Island scuba | Partial | UPDATE |
| 23 | `/blog/family-friendly-activities-goa` | family activities Goa | No | KEEP |
| 24 | `/blog/goa-scuba-diving-price-under-5000` | scuba under 5000 | Partial | UPDATE |
| 25 | `/blog/goa-scuba-trip-from-chandigarh` | scuba trip Chandigarh | No | KEEP |
| 26 | `/blog/goa-vs-andaman-scuba-for-beginners` | Goa vs Andaman scuba | No | KEEP |
| 27 | `/blog/is-scuba-diving-in-goa-open-in-rainy-season-goa` | scuba monsoon | No | KEEP |
| 28 | `/blog/is-scuba-diving-safe` | scuba safety Goa | No | **KEEP** |
| 29 | `/blog/majestic-pride-casino-in-goa-in-palolem` | Majestic Pride casino | Yes | MERGE |
| 30 | `/blog/nightlife-goa-responsibly` | Goa nightlife guide | No | KEEP |
| 31 | `/blog/nightlife-in-baga` | Baga nightlife | Partial | UPDATE |
| 32 | `/blog/rusian-beach-club-disco-calangute` | Russian club Calangute | Partial | UPDATE |
| 33 | `/blog/russian-club-goa-entry-fee` | Russian club entry fee | Yes | MERGE |
| 34 | `/blog/russian-night-club-in-goa-complete-guide` | Russian nightclub guide | Yes | MERGE |
| 35 | `/blog/russian-night-club-in-goa-goa-same-day-booking` | same day club booking | Partial | UPDATE |
| 36 | `/blog/russian-night-club-in-goa-in-goa-with-hotel-pickup` | club hotel pickup | Partial | UPDATE |
| 37 | `/blog/russian-night-club-in-goa-price-in-grande-island` | Russian club price | Yes | REDIRECT |
| 38 | `/blog/russian-night-club-near-baga-calangute-itinerary-cost-honest-review` | Baga Calangute club | Partial | KEEP |
| 39 | `/blog/scuba-diving-booking-baga` | scuba booking Baga | Yes | MERGE |
| 40 | `/blog/scuba-diving-price-guide-2026` | scuba price Goa | No | **KEEP** |
| 41 | `/blog/scuba-diving-safety-tips-for-beginners-2` | scuba safety tips | Yes | MERGE/UPDATE |
| 42 | `/blog/scuba-diving-with-island-trip-goa` | scuba island trip | No | KEEP |
| 43 | `/blog/season-for-majestic-pride-casino-in-goa-in-goa` | Majestic Pride season | Yes | MERGE |
| 44 | `/blog/top-5-scuba-diving-spots-in-goa` | scuba spots Goa | No | **KEEP** |
| 45 | `/blog/where-to-do-majestic-pride-casino-in-goa-in-goa` | Majestic Pride location | Yes | MERGE |
| 46 | `/blog/why-goa-is-the-ultimate-destination-for-water-sports` | water sports Goa | Yes | MERGE |
| 47 | `/blog/first-time-scuba-myths` | scuba myths | No | KEEP (if indexed) |

*Additional legacy posts may exist beyond blog index pagination — verify in Firestore admin.*

---

## Services & landing pages

### `/services/scuba-diving` — **KEEP (commercial primary)**

| Field | Value |
|-------|-------|
| **H1** | Scuba Diving in Goa |
| **Meta title** | Scuba Diving in Goa — Prices, Packages & Beginner Experience |
| **Intent** | Transactional |
| **Cannibalization** | No — pairs with guides, not replaces |
| **Links to add** | → price pillar, best-time, `/booking` |

### `/services/water-sports` — **KEEP**

### `/services/dolphin-trip` — **KEEP**

### `/services/night-club` — **KEEP**

| H1 | Russian Night Club |
| **Note** | Aligns with Russian nightlife cluster — link from all nightlife content |

### `/services/casino-bookings` — **FIX (404)**

| Action | Restore service page or redirect to casino blog + booking |
| **Risk** | Commercial casino intent has no landing page |

### `/services/north-goa-tour` — **KEEP**

Sightseeing intent — distinct from Vagator beach blog.

### `/` (homepage) — **KEEP**

Primary brand + scuba commercial homepage.

### `/booking` — **KEEP**

Checkout — no SEO cannibalization issue.

---

# Internal linking strategy (audit recommendations only)

## Hub-and-spoke model

```
Homepage (/)
    ├── /services/scuba-diving  ← transactional
    ├── /guides/scuba-diving-in-goa  ← scuba hub
    │     ├── /blog/scuba-diving-price-guide-2026
    │     ├── /blog/best-time-for-scuba-diving-in-goa
    │     ├── /blog/is-scuba-diving-safe
    │     ├── /blog/top-5-scuba-diving-spots-in-goa
    │     └── /guides/scuba-diving-in-baga-goa
    ├── /guides/russian-night-club-goa  ← nightlife hub
    │     ├── /guides/club-ruskii-reviews
    │     ├── /guides/russian-club-goa-price
    │     └── /services/night-club
    └── /guides/water-sports-goa
          └── /services/water-sports
```

## Priority links to add first

1. All Russian nightlife blogs → hub guide + Ruskii + price guide + night-club service  
2. All scuba “ultimate guide” blogs → `/guides/scuba-diving-in-goa`  
3. All price guides → `/blog/scuba-diving-price-guide-2026`  
4. Every commercial page → `/booking` with clear CTA  
5. Baga/Calangute nightlife → `/guides/club-ruskii-reviews` (venue) not random AI slugs  

---

# Priority action roadmap (no changes made yet)

### Phase 1 — Critical (Russian nightlife + scuba hub)

1. Choose **one** Russian hub URL (`/guides/russian-night-club-goa` recommended).  
2. Plan **redirect** `/guides/russian-club-goa` → hub (duplicate H1).  
3. Consolidate **8+ Russian nightclub blogs** into hub + Ruskii + price guide.  
4. Merge **3 “ultimate guide” scuba blogs** into `/guides/scuba-diving-in-goa`.  

### Phase 2 — High (pricing & safety)

5. Merge **3 scuba price guides** into price pillar blog.  
6. Resolve **safety tips vs is-scuba-diving-safe** overlap.  
7. Fix **`/services/casino-bookings` 404**.  

### Phase 3 — Medium (water sports, casino, islands)

8. Merge duplicate water-sports blogs.  
9. Merge Majestic Pride casino trio.  
10. Merge `best-islands-scuba` into top-5 spots or Grand Island guide.  

### Phase 4 — Ongoing governance

11. **Stop AI publishing** without keyword assignment to an existing cluster primary.  
12. Require **unique H1 + primary keyword** per new post in admin.  
13. Run quarterly cannibalization check before approving SEO Intelligence suggestions.  

---

# Appendix — duplicate H1 registry (live production)

| H1 text | URLs |
|---------|------|
| Experience the Best of Russian Nightlife in Goa | `/guides/russian-club-goa`, `/guides/russian-night-club-goa` |
| Explore Scuba Diving in Goa: Your Ultimate Guide | `/blog/complete-guide-scuba-diving-goa`, `/blog/complete-guide-to-scuba-diving-in-goa-1`, `/blog/a-complete-guide-to-scuba-diving-in-goa` |

---

**End of audit.**  
No content, URLs, redirects, or code were modified. Implementation should follow a separate approved plan per cluster.
