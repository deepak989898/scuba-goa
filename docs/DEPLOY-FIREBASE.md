# Deploy Book Scuba Goa — Firebase (`bookscubagoa`) + Razorpay

Your app is **Next.js** with **API routes** (Razorpay order + verify). Classic **Firebase Hosting** is for static sites only. Use one of these:

| Approach | Best for |
|----------|----------|
| **A. Firebase App Hosting** | Everything on Google; Git-connected builds |
| **B. Vercel** + Firebase (Firestore/Auth) | Fastest path for Next.js + secrets |

---

## Before anything (one-time in Firebase Console)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **bookscubagoa**.
2. **Build** → **Firestore Database** → create database (production mode) → deploy rules (see repo `firestore.rules`).
3. **Build** → **Authentication** → **Sign-in method** → enable **Email/Password**.
4. **Authentication** → **Settings** → **Authorized domains** → add your production domain (e.g. `yourapp.web.app`, `yourdomain.com`, and `localhost` for dev).
5. Create an **admin user**: Authentication → Add user (email + password).
6. **Firestore** → add collection `admins` → document ID = that user’s **UID** (from Authentication users list). Fields e.g. `{ "email": "you@email.com" }`.

---

## Finish `.env.local` (and hosting env vars)

1. **Razorpay Key Secret**  
   [Razorpay Dashboard](https://dashboard.razorpay.com/) → **Account & Settings** → **API Keys** → copy **Key secret** → set in `.env.local`:
   ```env
   RAZORPAY_KEY_SECRET=your_live_secret_here
   ```
   Never put the secret in client code or Git.

2. **Firebase Admin (bookings after payment)**  
   Firebase Console → **Project settings** (gear) → **Service accounts** → **Generate new private key** → download JSON.  
   Minify to **one line** and set as `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local` (same for production hosting secrets). Escape newlines in `private_key` as `\n` inside the JSON string.

3. **`NEXT_PUBLIC_SITE_URL`**  
   Set to your real public URL after first deploy (important for SEO / metadata).

---

## A) Firebase App Hosting (Next.js on Google)

Official guide: [Get started with App Hosting](https://firebase.google.com/docs/app-hosting/get-started).

1. Install CLI: `npm i -g firebase-tools` then `firebase login`.
2. In Firebase Console → **Build** → **App Hosting** → **Get started** → connect your **Git** repo (GitHub/GitLab/Bitbucket).
3. Root directory: repo root (where `package.json` is). Build command: `npm ci && npm run build` (or as suggested by the wizard).
4. In App Hosting → your **backend** → **Environment variables / secrets**, add every variable from `.env.local` that the app needs (especially `RAZORPAY_KEY_SECRET`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXT_PUBLIC_*`).

5. Deploy Firestore rules from your machine (optional):
   ```bash
   cd "path/to/Website ScubaDiving"
   firebase use bookscubagoa
   firebase deploy --only firestore:rules
   ```

---

## B) Vercel (recommended simplicity for Next.js)

1. Push code to GitHub (do **not** commit `.env.local`).
2. [Vercel](https://vercel.com/) → **Add New Project** → import repo.
3. Framework: Next.js. Build: default `npm run build`.
4. **Settings** → **Environment Variables**: paste all keys from `.env.local` (Production + Preview as needed).
5. Deploy. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL or custom domain.

Firebase **Firestore** and **Auth** keep using project **bookscubagoa**; only hosting changes.

---

## After deploy

1. **Razorpay**: Ensure **live** mode matches keys; complete KYC if checkout fails.
2. **Test**: `/booking` → small real payment or Razorpay test flow if you also keep test keys in a separate preview env.
3. **Firestore**: Confirm `packages` collection exists (seed via `node scripts/seed-firestore.mjs` with `FIREBASE_SERVICE_ACCOUNT_KEY` set, or use **Admin** UI).
4. **Security**: You shared live keys in chat before—consider **rotating** Razorpay keys if this chat isn’t private; restrict Firebase API key by **HTTP referrer** in Google Cloud Console if you want extra hardening.

---

## Quick local test

```bash
npm run dev
```

Open `http://localhost:3000` — Firebase works if `NEXT_PUBLIC_FIREBASE_*` is set; payments need `RAZORPAY_*` and booking persistence needs `FIREBASE_SERVICE_ACCOUNT_KEY`.
