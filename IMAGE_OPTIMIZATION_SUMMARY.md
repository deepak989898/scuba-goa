# Image Optimization Summary — Book Scuba Goa

**Date:** 2026-07-19  
**Site:** https://bookscubagoa.com  
**Companion audit:** [IMAGE_OPTIMIZATION_AUDIT.md](./IMAGE_OPTIMIZATION_AUDIT.md)

---

## What was done (safe production-ready slice)

### Phase 1 — Audit
- Full local inventory of `public/` + `src/app/`
- Documented remote/Firebase/Unsplash usage, LCP hotspots, skip list
- Wrote `IMAGE_OPTIMIZATION_AUDIT.md`

### Phase 2 — Script
- Replaced/expanded `scripts/optimize-images.mjs`:
  - Allowlist: `public`, `src/app`
  - Skips `node_modules`, `.next`, `.git`, favicon, blog text tiles, existing WebP
  - Dry-run, audit, force, legacy-brand modes
  - Writes `scripts/image-optimize-report.json` / `scripts/image-audit-report.json`
- npm scripts:
  - `images:audit`
  - `images:optimize`
  - `images:optimize:dry-run`
  - `optimize:images` → legacy brand PNG+WebP re-compress

### Phase 2 dry-run result (measured)
| Item | Value |
|------|--------|
| Local files scanned | 12 |
| Total local size | **421.5 KB** |
| Files >300 KB / >1000 KB | **0 / 0** |
| Converted (candidates) | **1** (`public/munnar1.jpg` → `.webp`) |
| Before → after | **157.3 KB → 110.7 KB** |
| Saved | **46.6 KB (29.6%)** |
| Skipped | 11 (deny-list, already WebP, or WebP sibling exists) |

Applied conversion (originals kept): `public/munnar1.webp` created; `munnar1.jpg` retained (orphan — no active references).

### Phase 3 — Local references updated
| Change | Detail |
|--------|--------|
| Header logo | `/book-scuba-goa-logo-transparent.webp` |
| Footer logo | `/book-scuba-goa-logo-transparent.webp` |
| PNG logos kept | PDF (`billPdf`), JSON-LD / schema absolute PNG URLs |

**Not deleted:** any original JPG/PNG.

### Phase 4–6 — Next.js / LCP (already strong; small tweaks)
- `next.config.ts` already has `formats: ["image/avif","image/webp"]`, device sizes, 30-day `minimumCacheTTL`, remotePatterns
- Removed unnecessary `priority` on gallery lightbox + service media zoom (avoids competing with true LCP)
- Hero / About / blog / service first slide remain the priority images

### Phase 7 — Admin upload optimization
| Path | Change |
|------|--------|
| `src/lib/contentImageCompress.ts` | **New** — profiles: hero / featured / card / og / thumbnail → WebP |
| `POST /api/admin/media-image-upload` | **New** — auth + validate + compress + Storage |
| `POST /api/admin/seo-image-upload` | Now compresses to WebP (og/hero profiles) before save |
| Admin services media (`posts`) | Prefers media-image-upload when signed in; falls back to raw `uploadBytes` |
| Hero upload | Unchanged (already WebP ≤200KB via `heroImageCompress`) |
| Blog upload | Unchanged (already branded WebP) |

**Env vars:** none new (uses existing Firebase Admin + `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`).

---

## Old → new mapping

| Old | New | Status |
|-----|-----|--------|
| `/book-scuba-goa-logo-transparent.png` (UI) | `/book-scuba-goa-logo-transparent.webp` | Updated Header/Footer |
| `public/munnar1.jpg` | `public/munnar1.webp` | Sibling added; JPG kept; **unused in app** |
| Logo PNG (schema/PDF) | *(unchanged)* | Keep |
| `favicon.ico`, blog bar/watermark PNG | *(unchanged)* | Do not convert |

---

## Files modified / added

**Added**
- `IMAGE_OPTIMIZATION_AUDIT.md`
- `IMAGE_OPTIMIZATION_SUMMARY.md` (this file)
- `src/lib/contentImageCompress.ts`
- `src/app/api/admin/media-image-upload/route.ts`
- `public/munnar1.webp`
- `scripts/image-optimize-report.json` (generated)
- `scripts/image-audit-report.json` (generated)

**Updated**
- `scripts/optimize-images.mjs`
- `package.json` (image scripts)
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/components/GalleryPageContent.tsx`
- `src/components/ServiceMediaTabs.tsx`
- `src/app/api/admin/seo-image-upload/route.ts`
- `src/app/admin/services/page.tsx`

---

## Measured validation (this session)

| Check | Result |
|-------|--------|
| `npm run images:optimize:dry-run` | Pass — report written |
| `npm run images:optimize` | Pass — munnar1.webp written |
| `npx tsc --noEmit` | Pass |
| Lighthouse before/after | **Not run** — do not invent scores; measure on Vercel after deploy |

---

## Deployment steps

1. Commit changes (exclude secrets; reports optional).
2. Deploy to Vercel as usual.
3. Smoke-test: home hero, About hero, service detail, blog featured, gallery, Header/Footer logo.
4. Admin: upload SEO og/hero image → confirm `.webp` URL + `image/webp`.
5. Admin: service **posts** image upload while logged in → confirm compressed URL.

---

## Rollback steps

1. Header/Footer: revert `src` to `/book-scuba-goa-logo-transparent.png`.
2. SEO/media upload routes: revert to previous raw-save commits via git.
3. Delete `public/munnar1.webp` if unwanted (JPG still present).
4. No database migration was performed.

---

## Remaining recommendations (not done — intentional)

1. **Delete** `public/munnar1.jpg` (and optionally `.webp`) after confirming no external links.
2. Route hero/SEO **client fallback** `uploadBytes` through compress API only (today fallback can still store originals if server upload fails).
3. Re-encode historical Firebase objects in Storage (batch job) — out of scope; new uploads are optimized.
4. Run Lighthouse mobile on production home + scuba service page; record LCP/CLS in this doc.
5. Consider tightening `remotePatterns` from `hostname: "**"` to known CDNs if security policy requires it (would force more raw `<img>` fallbacks for odd hosts).

---

## Acceptance checklist

- [x] Suitable local images converted with Sharp (not renamed)
- [x] References for UI logos updated; PNG kept where required
- [x] No SVG/favicon/text tiles converted
- [x] Booking/Razorpay untouched
- [x] Design/layout unchanged
- [x] Hero already LCP-aware; lightbox priority reduced
- [x] Admin SEO + service post uploads compress where safe
- [x] Firebase/Unsplash continue via `next/image`
- [x] Typecheck passes; dry-run + convert measured
- [x] Rollback documented
- [ ] Full `next build` + Lighthouse after deploy (operator)
- [ ] Phase 14 delete unused JPG (operator after verify)
