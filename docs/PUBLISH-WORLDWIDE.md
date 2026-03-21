# Publishing worldwide — what to know

Your site can be **hosted globally** (e.g. Vercel edge). Visitors from any country can open it. A few things to align with how you actually run the business:

## What already works globally

- **Vercel** serves the site worldwide over HTTPS.
- **Firebase** (Firestore, Auth) works internationally for read/write (subject to Firebase/Google terms).
- **Content** in English reaches a broad audience.

## Business & payments (India-focused today)

- **Razorpay** is built for **India** (INR, Indian banks, UPI). Foreign cards may work in limited cases; many international customers will need another payment method or manual invoicing.
- **WhatsApp** number is India-format; it works for chat worldwide if users have WhatsApp.
- **Prices** are in **₹ (INR)** — fine for a Goa-only operator; if you market globally, consider stating “India / Goa” clearly.

## Legal & trust (recommended before heavy marketing)

- Add a **Privacy policy** (what data you collect: bookings, email, phone, chat).
- Add **Terms of service** / cancellation rules for tours and dives.
- If you get **EU/UK** visitors, stricter **GDPR**-style disclosures and consent for cookies/analytics may apply.
- **OpenAI**: your API key is server-only; don’t expose it in the browser. Rotate keys if they ever leak.

## SEO & domain

- Set `NEXT_PUBLIC_SITE_URL` to your **canonical** URL (custom domain or `.vercel.app`).
- Add your domain in **Firebase → Authentication → Authorized domains**.

## Summary

**Yes, you can publish worldwide** in the sense that anyone can load the site. **Change or add** pages for privacy/terms, clarify that services are in **Goa, India**, and plan payments/WhatsApp for how you actually serve international clients.
