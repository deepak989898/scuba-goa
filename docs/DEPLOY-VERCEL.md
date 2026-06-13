# Deploy on Vercel — step by step

This site is a **Next.js** app. Vercel runs `npm run build` and hosts the API routes (`/api/razorpay/*`) on serverless functions.

---

## 1. Push code to GitHub

- Create a repo and push your project (do **not** commit `.env.local` — it stays private on your PC).

---

## 2. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) → sign in (GitHub is easiest).
2. **Add New…** → **Project** → **Import** your repository.
3. **Framework Preset:** Next.js (auto-detected).
4. **Root Directory:** leave default (folder with `package.json`).
5. **Build Command:** `npm run build` (default).
6. **Output:** leave default (Next.js handles this).
7. Click **Deploy** (first deploy may fail until env vars are added — that’s OK).

---

## 3. Environment variables (required)

Go to **Project → Settings → Environment Variables**.

Add **every** variable your app needs. Use **Production** (and **Preview** if you want branch previews to work).

### Site & contact

| Name | Example | Notes |
|------|---------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://bookscubagoa.com` | Your canonical live URL (no trailing slash). |
| `NEXT_PUBLIC_CONTACT_PHONE_PRIMARY` | `918354075026` | Primary call/contact number, country code + number, no `+`. Used for `tel:` links **and** as the default WhatsApp messaging number. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `918354075026` | Optional. Country code + number, no `+`. Leave unset to share the primary line; set to a different number if WhatsApp lives on a separate handset. |
| `NEXT_PUBLIC_CONTACT_PHONE_SECOND` | `919217290871` | Optional secondary call line shown in footer / contact page. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `support@bookscubagoa.com` | Optional; shown in footer. |

### Firebase (client)

Copy from Firebase Console → Project settings → Your apps → Web app config:

| Name |
|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | (optional) |

### Firebase Admin (server — saves bookings after payment)

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Entire service account JSON as **one line** (from Firebase → Project settings → Service accounts → Generate new private key). |

### Razorpay — **three separate variables** (this is where people mix things up)

From [Razorpay Dashboard](https://dashboard.razorpay.com/) → **Account & Settings** → **API Keys** (same mode: **Test** or **Live**).

You will see:

1. **Key ID** — short, starts with `rzp_test_` or `rzp_live_`
2. **Key Secret** — long random string (shown once when generated)

Set **exactly** this:

| Variable | What to paste |
|----------|----------------|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | **Key ID** only (e.g. `rzp_test_abc123...`) |
| `RAZORPAY_KEY_ID` | **The same Key ID again** — copy-paste the **same value** as `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| `RAZORPAY_KEY_SECRET` | **Key Secret** only — the long secret (different from Key ID) |

**Important:**

- `RAZORPAY_KEY_ID` is **not** the secret. It is the **same Key ID** twice: once for the browser (`NEXT_PUBLIC_…`) and once for the server (`RAZORPAY_KEY_ID`).
- If you only set `NEXT_PUBLIC_RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` but leave `RAZORPAY_KEY_ID` empty or different, orders will fail or the API will return an error.

**Test mode:** turn on **Test mode** in Razorpay, then use **test** Key ID + **test** secret together. Pay with [Razorpay test cards](https://razorpay.com/docs/payments/payments/test-card-details/), not real cards.

### Email confirmations (GoDaddy Titan SMTP or Resend)

After a successful Razorpay verify, the server sends a confirmation email if configured.

**Recommended — GoDaddy Titan SMTP** (uses your `support@bookscubagoa.com` mailbox):

| Name | Purpose |
|------|---------|
| `MAIL_SMTP_HOST` | `smtp.secureserver.net` |
| `MAIL_SMTP_PORT` | `465` (SSL) |
| `MAIL_SMTP_USER` | Full mailbox address, e.g. `support@bookscubagoa.com` |
| `MAIL_SMTP_PASS` | **Titan webmail login password** (same as secureserver.titan.email — not an app password) |
| `MAIL_FROM` | From address, e.g. `support@bookscubagoa.com` |
| `BOOKING_ADMIN_NOTIFY_EMAIL` | **To** address for staff “new booking” emails (defaults to contact email) |
| `ADMIN_NOTIFY_EMAIL` | Optional extra BCC on customer confirmations |

**GoDaddy DNS** (fixes Titan “set SPF records” warning): Email & Office → Set Mail Destination → TXT `@` = `v=spf1 include:secureserver.net -all`, plus MX records per GoDaddy help.

**Alternative — Resend API** (only if `MAIL_SMTP_HOST` is not set):

| Name | Purpose |
|------|---------|
| `RESEND_API_KEY` | API key from [Resend](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `support@bookscubagoa.com` |

**Firebase:** No SMTP env vars. Firebase Auth is admin login only; outbound mail is sent from Vercel via Titan or Resend.

### OpenAI (AI Help button — optional)

| Name | Purpose |
|------|---------|
| `OPENAI_API_KEY` | Server-side only — enables `/api/chat` for the **AI Help** widget. Create a key at [OpenAI API keys](https://platform.openai.com/api-keys). |

**Security:** Add the key only in **Vercel → Environment Variables** (and `.env.local` on your PC). **Never** commit keys to Git or paste them in public chats. If a key is exposed, **revoke** it in OpenAI and create a new one.

Redeploy after adding `OPENAI_API_KEY`.

---

## 4. Redeploy after changing env

**Deployments** → open the latest deployment → **⋯** → **Redeploy** (or push a new commit).

Env vars are baked in at **build time** for `NEXT_PUBLIC_*` and available at **runtime** for server vars — always redeploy after edits.

---

## 5. Firebase Auth — allow your Vercel domain

Firebase Console → **Authentication** → **Settings** → **Authorized domains** → add:

- `bookscubagoa.com`
- `www.bookscubagoa.com` (if you use `www`)
- your Vercel preview domain (optional, for preview auth testing)

---

## 6. Custom domain (optional)

Vercel → **Project** → **Settings** → **Domains** → add your domain and follow DNS instructions.

Then set `NEXT_PUBLIC_SITE_URL` to your canonical domain (for example `https://bookscubagoa.com`) and redeploy.

---

## Quick checklist

- [ ] All `NEXT_PUBLIC_FIREBASE_*` set  
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` set (bookings + analytics page views in Firestore)  
- [ ] `MAIL_SMTP_*` set on Vercel (Titan SMTP) **or** `RESEND_API_KEY` (Resend)  
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID` = Key ID  
- [ ] `RAZORPAY_KEY_ID` = **same** Key ID as above  
- [ ] `RAZORPAY_KEY_SECRET` = Key Secret  
- [ ] `NEXT_PUBLIC_SITE_URL` = your live URL  
- [ ] Redeploy  
- [ ] Firebase authorized domains include Vercel URL  

More on Razorpay: [docs/RAZORPAY-TEST.md](RAZORPAY-TEST.md)

Worldwide / legal basics: [docs/PUBLISH-WORLDWIDE.md](PUBLISH-WORLDWIDE.md)
