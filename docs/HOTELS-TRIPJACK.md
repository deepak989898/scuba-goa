# TripJack Hotels (Goa only) — Book Scuba Goa

Isolated hotels module for **Goa, India** only. Does not change scuba/tour booking flows.

## Architecture

```
Browser → Vercel (Next.js API routes) → DigitalOcean VPS proxy (static IP) → TripJack HMS
                ↓
           Firestore (catalog cache + hotelBookings)
                ↓
           Razorpay (payment — no TripJack book/confirm on success)
```

- **TRIPJACK_API_KEY** lives **only** on the DigitalOcean VPS (`tripjack-proxy/`).
- Vercel uses `TRIPJACK_PROXY_BASE_URL=http://YOUR_DO_STATIC_IP:4000`.
- Live prices from TripJack when proxy is up; otherwise cached `priceFrom` in `tripjackHotelCatalog`.

## Customer flow

1. `/hotels` — search (destination locked Goa)
2. `/hotels/results` — listing with live/cached prices
3. `/hotels/detail/[hid]` — rooms & rates
4. `/hotels/guests` — guest details
5. `/hotels/review` — summary + optional TripJack review/lock
6. `/hotels/payment` — Razorpay
7. `/hotels/booking-success` — receipt; status `pending_admin_confirmation`

**After Razorpay verify:** payment marked paid, **no** TripJack book/confirm API call.

## Admin

- `/admin/hotel-bookings` — list, filter, **Mark confirmed** with supplier voucher/notes
- **Sync Goa catalog** — calls `/api/admin/hotels/catalog-sync` (TripJack mapping/content → Firestore)

## Firestore collections

| Collection | Purpose |
|------------|---------|
| `tripjackHotelCatalog` | Cached Goa hotels (images, locality, cached price) |
| `tripjackHotelDestinations` | Goa `hids[]` index |
| `hotelBookings` | Hotel orders (separate from scuba `bookings`) |
| `tripjackHotelCatalogMeta/sync` | Last sync metadata |

## Vercel environment variables

```env
TRIPJACK_PROXY_BASE_URL=http://YOUR_DIGITALOCEAN_STATIC_IP:4000
NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED=true
TRIPJACK_HOTEL_ENV=staging
# Existing Firebase + Razorpay vars (see .env.example)
```

## DigitalOcean VPS setup

1. Create Droplet with static IP.
2. Copy `tripjack-proxy/` to the server.
3. `cp .env.example .env` — set `TRIPJACK_API_KEY` and HMS base.
4. `npm install && npm start` (use pm2/systemd in production).
5. Open port 4000 only to Vercel IPs or restrict via firewall + allow your Vercel egress if needed.
6. Set Vercel `TRIPJACK_PROXY_BASE_URL` to `http://STATIC_IP:4000`.

Adjust upstream HMS paths in `tripjack-proxy/server.mjs` to match your TripJack HMS documentation.

## Goa-only rule

Search, listing, and catalog sync filter to Goa. Users cannot pick Mumbai/Delhi or other cities.

## Manual confirmation policy

Customer success = **payment received**. Hotel supplier confirmation is done manually by admin after voucher from hotel/partner.
