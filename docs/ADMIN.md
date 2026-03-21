# Admin: packages, services, bookings & analytics

## Two product types

| What | Firestore collection | Admin URL |
|------|----------------------|-----------|
| **Packages** (homepage “Live packages”, cart packages) | `packages` | `/admin/packages` |
| **Services** (home cards + `/services` list + detail pages) | `services` | `/admin/services` |
| **Bookings** (paid orders) | `bookings` | `/admin/bookings` |
| **Analytics** (page views / sessions sample) | `pageViews` | `/admin/analytics` |
| **Reviews** (moderated ratings) | `ratings` | `/admin/ratings` |

---

## Services (editable in admin — **new**)

1. Log in at **`/admin/login`**.
2. Open **`/admin/services`**.
3. **Add:** fill **Slug** (URL segment, e.g. `scuba-diving`), title, prices, image URL, includes, badges, **Sort order** (lower = higher on page).
4. **Edit:** click **Edit** — slug cannot be renamed in-place (disabled); to rename, delete and add a new slug, or change slug only with the dashboard warning when creating a new doc.
5. **Delete:** removes that document; if the collection becomes empty, the **site falls back** to defaults in `src/data/services.ts`.

**Rules:** Deploy `firestore.rules` so `services/{slug}` is readable by anyone and writable only by admins (same as `packages`).

---

## Packages

Same as before: **`/admin/packages`** — add / edit / delete rows in `packages`.

---

## Bookings

**`/admin/bookings`** — shows documents created by `/api/razorpay/verify` when `FIREBASE_SERVICE_ACCOUNT_KEY` is set on the server.

**Razorpay test mode** does not block Firestore writes; if bookings stay empty after a successful payment, the usual cause is the service account key missing on the host (or wrong project).

---

## Analytics

**`/admin/analytics`** — reads `pageViews` (written by `POST /api/analytics/track` when the same Admin SDK env is set). Deploy updated `firestore.rules` so admins can read `pageViews`.

---

## Login

Firebase **Authentication** (email/password) + Firestore **`admins/{yourUid}`** — see main README.
