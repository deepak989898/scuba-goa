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

## Reviews (ratings)

**`/admin/ratings`** — list all submissions. **Pending** reviews are hidden on the public site until you click to **approve**.

**Where approved reviews appear:** the **homepage** (`/`), section **“Guest reviews”** (anchor `#guest-reviews`), directly under **Trust**. Only documents with `approved: true` are loaded there; the UI shows an **Approved** badge on each card.

## Analytics

**`/admin/analytics`** — reads `pageViews` (written by `POST /api/analytics/track` when the same Admin SDK env is set). Shows **today (IST)** unique visitors, page views, **device type** breakdown (from User-Agent), and a recent log with device labels. Deploy updated `firestore.rules` so admins can read `pageViews`.

---

## If admin pages stay on “Loading…”

That usually means the Firestore **read failed** (often **permission denied**) and the UI used to hang before showing the error.

1. Deploy this repo’s **`firestore.rules`** — they must include **`ratings`** and **`pageViews`** so admins can read those collections (writes stay server-only where needed).
2. Run: `firebase deploy --only firestore:rules` (or paste rules in Firebase Console → Firestore → Rules → Publish).
3. Refresh **/admin/ratings** and **/admin/analytics**. If something still fails, the page now shows the Firestore error code (e.g. missing **index** — deploy indexes: see **[FIRESTORE-RULES-AND-INDEXES.md](./FIRESTORE-RULES-AND-INDEXES.md)**).

## Login

Firebase **Authentication** (email/password) + Firestore **`admins/{yourUid}`** — see main README.
