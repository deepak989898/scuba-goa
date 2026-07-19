# Image Optimization Audit — Book Scuba Goa

**Site:** https://bookscubagoa.com  
**Stack:** Next.js 15 / React 19 / Firebase / Vercel  
**Audit date:** 2026-07-19  
**Scope:** Local repo assets + image rendering paths (remote Firestore/Storage URLs are inventory-only; bytes live in Firebase)

---

## 1. Executive summary

| Finding | Detail |
|--------|--------|
| Local raster assets | **12 files** under `public/` + `src/app/` (~**422 KB** total) |
| Local files > 300 KB | **0** |
| Local files > 1000 KB | **0** |
| Primary LCP risk | **Remote** hero / service / blog images from Firebase Storage & Unsplash — not local `/public` |
| Already in place | `next/image` AVIF+WebP, `CmsRemoteImage`, hero upload WebP compress (≤1200px / ≤200KB), blog branded WebP pipeline |
| Highest-impact gap | Admin uploads for **SEO pages** and **service media** still store raw JPG/PNG when falling back to client `uploadBytes` or uncompressed server save |

**Recommendation:** Keep local PNGs where PDF/schema need them; convert suitable leftovers with dry-run first; harden remaining admin upload paths to WebP; rely on Next.js optimizer for remote delivery.

---

## 2. Total local images found

**12 files** (scanned: `public/`, `src/app/` — excluding `node_modules`, `.next`, `.git`):

| Path | Type | Size | Dimensions | Alpha | Notes |
|------|------|------|------------|-------|-------|
| `public/munnar1.jpg` | JPG | 157.3 KB | 1000×667 | No | **No code references found** — unused candidate |
| `src/app/icon.png` | PNG | 63.0 KB | 512×512 | Yes | App icon |
| `src/app/icon.webp` | WebP | 59.4 KB | 512×512 | Yes | Sibling of icon.png |
| `public/book-scuba-goa-logo-transparent.png` | PNG | 34.6 KB | 650×238 | Yes | Header/Footer logo |
| `public/book-scuba-goa-logo-transparent.webp` | WebP | 23.9 KB | 650×238 | Yes | Prefer for UI |
| `src/app/favicon.ico` | ICO | 17.5 KB | — | — | **Do not convert** |
| `public/book-scuba-goa-logo.webp` | WebP | 17.4 KB | 1024×682 | No | OG/share sibling |
| `src/app/apple-icon.webp` | WebP | 15.3 KB | 180×180 | Yes | |
| `public/book-scuba-goa-logo.png` | PNG | 14.6 KB | 1024×682 | No | PDF + JSON-LD + OG fallback |
| `src/app/apple-icon.png` | PNG | 12.2 KB | 180×180 | Yes | |
| `public/blog-bar-host.png` | PNG | 3.2 KB | 280×48 | Yes | Blog brand bar (text) — **keep PNG** |
| `public/blog-watermark-tile.png` | PNG | 3.1 KB | 420×72 | Yes | Watermark tile — **keep PNG** |

### File type breakdown

| Ext | Count |
|-----|-------|
| `.png` | 6 |
| `.webp` | 4 |
| `.jpg` | 1 |
| `.ico` | 1 |
| `.svg` / `.gif` / `.avif` | 0 in these folders |

---

## 3. Large images (>300 KB / >1000 KB)

- **Local > 300 KB:** none  
- **Local > 1000 KB:** none  
- **Oversized local dimensions:** none remaining after prior logo/icon compression (`scripts/optimize-images.mjs`)

Remote Firebase/Unsplash originals may still be large; Next.js Image optimizer (AVIF/WebP + `deviceSizes`) mitigates delivery size when `CmsRemoteImage` / `next/image` is used.

---

## 4. Duplicate / sibling images

| Pair | Purpose |
|------|---------|
| `book-scuba-goa-logo-transparent.png` + `.webp` | UI prefers WebP; PNG kept for fallback / tooling |
| `book-scuba-goa-logo.png` + `.webp` | PNG required for `billPdf` + schema absolute URLs |
| `icon.png` + `icon.webp`, `apple-icon.png` + `.webp` | Next app icons |

`munnar1.jpg` appears orphaned (duplicate risk: none; cleanup candidate after verify).

---

## 5. Background images

| Location | Type |
|----------|------|
| `src/app/globals.css` (`body.site-3d`) | CSS **gradients only** — no photo URL |
| Hero | `CmsRemoteImage` / `<video>` — **not** CSS `background-image` |

---

## 6. Rendering paths

### `next/image` (via import or `CmsRemoteImage`)

Used widely: Header, Footer, Hero, Service cards/grids/detail gallery, Blog, Guides, Packages, Gallery, About, Related sidebar, Cart FAB, etc.

### Raw `<img>` (intentional / constrained)

| File | Reason |
|------|--------|
| `CmsRemoteImage.tsx` | Fallback if URL malformed (rare with `hostname: "**"`) |
| `MetaPixelRoot.tsx` | Tracking pixel |
| Admin gallery / hero / blog tables | Admin previews |
| Service media zoom | Some lightbox paths |

### Imported static modules

No webpack `import hero from './x.jpg'` pattern for content photos; local brand assets use public URLs (`/book-scuba-goa-logo-*.png`).

---

## 7. Remote image domains

Configured in `next.config.ts`:

```ts
remotePatterns: [
  { protocol: "https", hostname: "**", pathname: "/**" },
  { protocol: "http", hostname: "**", pathname: "/**" },
]
formats: ["image/avif", "image/webp"]
```

**Sources observed in code/data:**

- `images.unsplash.com` (fallbacks, demos, About, OG defaults, gallery defaults)
- `firebasestorage.googleapis.com` / `storage.googleapis.com` (admin uploads, blog branded images)
- Preconnect/dns-prefetch in `layout.tsx` for Unsplash + Firebase Storage

---

## 8. Images that should **not** be converted / deleted

| Asset | Why |
|-------|-----|
| `favicon.ico` | Browser/favicon contract |
| `blog-bar-host.png` | Small text graphic; PNG clarity for brand bar |
| `blog-watermark-tile.png` | Overlay tile; keep as authored |
| Logo **PNG** copies | `billPdf.ts`, SiteJsonLd, SEO schema absolute PNG URLs |
| SVG icons | Inline SVG in components (not separate files) |
| Animated GIF | None found locally |

---

## 9. LCP-likely pages & images

| Page | Likely LCP | Current treatment |
|------|------------|-------------------|
| `/` (home) | Hero slide image/video poster | `CmsRemoteImage` `priority` + `sizes="100vw"`; hero uploads compressed to WebP ≤200KB |
| `/services/[slug]` | Gallery first slide | `priority={idx === 0}`, shorter max-height |
| `/about` | Full-bleed Unsplash hero | `next/image` `priority`, `sizes="100vw"` |
| `/blog/[slug]` | Featured image | `CmsRemoteImage` `priority` |
| `/guides/[slug]` | Guide hero | `priority` |
| `/packages/[id]` | Package image | `priority` |
| `/booking` | Mostly form UI | Low image weight |
| `/gallery` | Grid (many) | Lazy except first few |

**Note:** Header logo uses `priority={!isHome}` so homepage does not compete with hero LCP — good.

---

## 10. Firebase / admin upload inventory

| Path | Compress today? |
|------|-----------------|
| `POST /api/admin/hero-media-upload` (poster/thumbnail) | **Yes** — `compressHeroBannerImage` → WebP |
| `POST /api/admin/blog-image-upload` | **Yes** — Sharp brand + WebP upload |
| Blog automation `images.ts` | **Yes** — max width 1200, q≈82 WebP |
| `POST /api/admin/seo-image-upload` | **No** — raw buffer save |
| Admin services media `uploadBytes` | **No** — raw client upload |
| Hero/SEO **client fallback** `uploadBytes` | **No** — bypasses server compress |

---

## 11. Files / pages affecting LCP (code hotspots)

- `src/components/HeroSlideBackground.tsx`
- `src/lib/hero-slides-default.ts` / `useHeroSlides.ts`
- `src/components/ServiceDetailGallery.tsx`
- `src/app/about/page.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/app/guides/[slug]/page.tsx`
- `src/components/CmsRemoteImage.tsx` + `next.config.ts` image settings

---

## 12. Phase-1 conclusions (safe next steps)

1. **Dry-run** `scripts/optimize-images.mjs` on allowlisted folders — report only.  
2. Convert **`munnar1.jpg` → WebP** only if retained; else list for deletion after verify.  
3. Point Header/Footer UI at **transparent WebP** (keep PNG for PDF/schema).  
4. Add WebP compress to **SEO image upload** + **service image posts** upload API.  
5. Do **not** delete PNG logos until PDF + OG/schema verified.  
6. Do **not** invent Lighthouse scores — measure after deploy.

---

## 13. Rollback path (local)

- Keep original PNG/JPG beside new WebP until Phase 14 cleanup.  
- Git history + `IMAGE_OPTIMIZATION_SUMMARY.md` mapping.  
- Revert logo `src` to `.png` if WebP fails in any browser (unlikely).
