# Firestore rules and indexes — deploy guide

This project uses **Firestore** for packages, services, hero slides, homepage gallery, bookings, analytics, reviews, and admin access control. Rules live in **`firestore.rules`** at the repo root; composite query indexes live in **`firestore.indexes.json`**.

---

## Prerequisites

1. [Firebase CLI](https://firebase.google.com/docs/cli): `npm i -g firebase-tools`
2. Log in: `firebase login`
3. Select your project (replace with your project id if different):

   ```bash
   cd "path/to/Website ScubaDiving"
   firebase use bookscubagoa
   ```

4. Confirm **`firebase.json`** points at the same files (this repo already does):

   - `firestore.rules`
   - `firestore.indexes.json`

---

## What the rules do (summary)

| Collection      | Public read                         | Public write | Admin write                        |
|-----------------|-------------------------------------|--------------|------------------------------------|
| `packages`      | Yes                                 | No           | Yes (if `admins/{uid}` exists)     |
| `services`      | Yes                                 | No           | Yes                                |
| `heroSlides`    | Yes                                 | No           | Yes                                |
| `homeGallery`   | Yes                                 | No           | Yes                                |
| `ratings`       | Only docs with `approved == true`   | No           | Yes (approve/delete)               |
| `bookings`      | No                                  | No           | Read only (writes via Admin SDK)   |
| `pageViews`     | No                                  | No           | Read only (writes via Admin SDK)   |
| `admins`        | Own doc only                        | No           | No (manage in Console)             |

Reviews are **created** through **`POST /api/ratings`** (server/Admin SDK), not from the browser, so `ratings` has `allow create: if false` for clients.

After you change **`firestore.rules`**, deploy them (see below). The site will not match this behavior until rules are published.

---

## Deploy Firestore **rules**

From the repository root:

```bash
firebase deploy --only firestore:rules
```

**Alternative (Firebase Console):** **Build** → **Firestore Database** → **Rules** → paste the contents of `firestore.rules` → **Publish**.

**Verify:** Open the homepage guest reviews section and `/admin/*` while logged in as an admin. If rules are wrong, the browser console or the app will show permission errors.

---

## Deploy Firestore **indexes**

Composite indexes are required when a query combines a **filter** (`where`) with an **`orderBy`** on a different field. This app needs one for **approved reviews** on the homepage:

- Collection: `ratings`
- Filter: `approved == true`
- Order: `createdAt` descending  

That index is defined in **`firestore.indexes.json`**.

### Deploy from CLI (recommended)

```bash
firebase deploy --only firestore:indexes
```

Indexes often take **several minutes** to build. Check status in **Firebase Console** → **Firestore** → **Indexes**.

### If you skipped CLI deploy

When a query needs an index, the **browser devtools console** usually prints a URL to **create the index in one click** in Firebase Console. You can use that link instead; it is equivalent to adding the index manually.

### Other queries in this repo

- **Admin ratings** (`orderBy("createdAt")` only) and **admin analytics** (`pageViews` by `createdAt`) typically use **single-field** ordering. Firestore creates single-field indexes automatically, so they usually do not need an entry in `firestore.indexes.json`. If the Console ever asks for another composite index, add it to `firestore.indexes.json` and redeploy indexes (or use the provided link).

---

## Deploy rules and indexes together

```bash
firebase deploy --only firestore
```

This deploys **both** `firestore:rules` and `firestore:indexes` as configured in `firebase.json`.

---

## CI / team workflow

1. Commit changes to `firestore.rules` and `firestore.indexes.json` with the code that depends on them.
2. After merge to your main branch, run `firebase deploy --only firestore` (or split rules vs indexes) from a machine with Firebase CLI and permission to the project.
3. Until new indexes finish **building**, queries that need them may fail with `failed-precondition` — wait for the index status **Enabled** in the Console.

---

## Related docs

- [DEPLOY-FIREBASE.md](./DEPLOY-FIREBASE.md) — project setup, env vars, hosting.
- [ADMIN.md](./ADMIN.md) — admin panels and Firestore collections.
