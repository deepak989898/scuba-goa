# Book Scuba Goa — Premium booking site

Next.js 15 (App Router) + Tailwind CSS + Firebase (Firestore + Auth) + Razorpay + Framer Motion. Built for **scuba diving Goa**, **water sports Goa booking**, **Goa tour packages**, casinos, clubs, pubs, disco, flyboarding, and bungee.

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill env vars (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_*` Firebase | Client SDK (homepage packages, admin UI) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Server JSON string — **writes paid bookings** from `/api/razorpay/verify` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Server order creation + signature verify |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Checkout popup (same as key id, public) |
| `OPENAI_API_KEY` | Optional AI concierge |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | International digits, no `+` (e.g. `919217290871` for +91 92172 90871) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO / sitemap |

## Firebase setup

1. Create a Firebase project → enable **Firestore** + **Authentication** (Email/Password).
2. Deploy `firestore.rules` (Console → Firestore → Rules).
3. Create user in **Authentication**.
4. In Firestore, add document `admins/{thatUserUid}` with e.g. `{ "email": "you@domain.com" }`.
5. Paste web app config into `NEXT_PUBLIC_FIREBASE_*`.
6. For bookings persistence: Project settings → Service account → Generate key → minify JSON into **one line** in `FIREBASE_SERVICE_ACCOUNT_KEY` (escape newlines in `private_key` as `\n`).

### Seed packages (optional)

```bash
set FIREBASE_SERVICE_ACCOUNT_KEY={...json...}
node scripts/seed-firestore.mjs
```

## Razorpay

Use **test keys** from the Razorpay dashboard first. Production: swap to live keys and complete KYC.

## Deploy

See **[docs/DEPLOY-FIREBASE.md](docs/DEPLOY-FIREBASE.md)** for Firebase (`bookscubagoa`), Razorpay secrets, **Firebase App Hosting** vs **Vercel**, and Firestore rules deploy.

- **Vercel**: connect repo, add env vars (mirror `.env.local`), deploy.
- **Firebase App Hosting**: Git-connected Next.js on Google ([official guide](https://firebase.google.com/docs/app-hosting/get-started)); add the same env vars in the backend settings.

## Pages

- Marketing: `/`, `/about`, `/contact`, `/services`, `/services/[slug]`, `/booking`, `/blog`, `/blog/[slug]`
- Admin: `/admin/login`, `/admin`, `/admin/packages`, `/admin/bookings`
- SEO: `/sitemap.xml`, `/robots.txt`

## Performance

- `next/image` with remote patterns (Unsplash / Cloudinary / Firebase Storage).
- Lazy-loaded gallery and service cards.
- Keep third-party scripts to Razorpay checkout + optional analytics.
