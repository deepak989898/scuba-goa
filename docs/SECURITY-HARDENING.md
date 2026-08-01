# Security hardening (bookscubagoa.com)

Based on the Website Security Agent report (2026-08-01). App/header fixes ship in the repo; **DNS/email** items must be set in your DNS host (GoDaddy / Cloudflare / etc.).

## Fixed in the Next.js / Vercel app

After deploy, these response headers should appear on HTML and API responses:

| Header | Value / intent |
|--------|----------------|
| `Content-Security-Policy` | Allow-list for GA4, Clarity, Meta, Razorpay, Firebase |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (+ CSP `frame-ancestors 'none'`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera/mic/geo off |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` (OAuth/checkout safe) |
| `Access-Control-Allow-Origin` | Own site only (not `*`) |

Probe paths (`/phpinfo.php`, `/wp-config.php.bak`) are rewritten to a soft **404** when they reach the app. If Vercel WAF still returns **403**, that is platform mitigation — acceptable.

## DNS — GoDaddy (Resend + GoDaddy mail already in use)

**Do not change** website records: `A @` → Vercel IP, `CNAME www` → `vercel-dns-…`.

**Already OK for Resend reports** (leave as-is):

| Record | Purpose |
|--------|---------|
| TXT `@` `resend-domain-verification=…` | Resend domain ownership |
| TXT `resend._domainkey` | Resend DKIM |
| TXT `send` SPF (+ MX `send` → Amazon SES) | Resend bounce / return-path |
| TXT `_dmarc` | DMARC already present (`p=reject`) |
| MX `@` → `secureserver.net` | GoDaddy inbox (receive mail) |

### Only change if missing: root SPF on `@`

Security scanners look for SPF on **`@` (root)**. Resend uses the **`send`** subdomain SPF (already set) — that is enough for Resend API mail. Still add **one** root SPF so GoDaddy mailbox send + anti-spoofing scan cleanly:

- Type: **TXT**
- Name: **`@`**
- Value (exactly one SPF on `@` — do not create a second `v=spf1`):

```txt
v=spf1 include:secureserver.net ~all
```

That authorises GoDaddy mail for `@bookscubagoa.com`. Do **not** remove Resend’s `send` SPF.

### Optional: CAA

```txt
0 issue "letsencrypt.org"
0 issuewild "letsencrypt.org"
```

### Cleanup (only if you still see two SPFs on `send`)

Keep **one** TXT on name `send` starting with `v=spf1`. Prefer the Resend/GoDaddy chain record if Resend dashboard shows Verified. Delete a duplicate second `v=spf1` on `send`.

## Re-scan

Redeploy production, wait for CDN cache purge / new deployment, then re-run the security agent against `https://www.bookscubagoa.com`.

**Note:** Ranking/booking impact is unrelated. This is defensive configuration only.
