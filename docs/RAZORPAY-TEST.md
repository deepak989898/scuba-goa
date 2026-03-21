# Razorpay test mode & fixing “Payment failed”

## 1. Use one mode everywhere (test **or** live)

You need **three** environment variables. Razorpay gives you **two** things on the dashboard: **Key ID** and **Key Secret**.

| Env var | Paste this |
|---------|------------|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | **Key ID** only (`rzp_test_…` or `rzp_live_…`) |
| `RAZORPAY_KEY_ID` | **The same Key ID again** — duplicate the value above (this is **not** the secret) |
| `RAZORPAY_KEY_SECRET` | **Key Secret** only — the long secret string (different from Key ID) |

**Common mistake:** Setting `NEXT_PUBLIC_RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` but forgetting `RAZORPAY_KEY_ID`, or setting `RAZORPAY_KEY_ID` to something other than the Key ID. The server must use the **same Key ID** as the browser to create orders.

These three must be from the **same** Razorpay mode:

| Env var | Role |
|---------|------|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Checkout popup (browser) |
| `RAZORPAY_KEY_ID` | **Must be identical** to `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| `RAZORPAY_KEY_SECRET` | Secret for **that same** key (test secret with test key) |

If `NEXT_PUBLIC_RAZORPAY_KEY_ID` is `rzp_test_…` but `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are **live**, the order or payment will fail.

**Vercel:** Project → Settings → Environment Variables → set all three for **Production** (and Preview if you use it).

This project’s API **rejects** create-order when `RAZORPAY_KEY_ID !== NEXT_PUBLIC_RAZORPAY_KEY_ID`.

## 2. Get test keys

1. [Razorpay Dashboard](https://dashboard.razorpay.com/) → switch to **Test mode** (toggle).
2. **Account & Settings** → **API Keys** → generate **Key ID** and **Key Secret** (test).
3. Paste into `.env.local` / Vercel:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret
```

Redeploy after changing env.

## 3. Pay with test cards only (in test mode)

In **test mode**, real bank cards usually fail. Use Razorpay’s **test card** numbers:

- Official list: [Test card details](https://razorpay.com/docs/payments/payments/test-card-details/)

Example (India, success):

- Card: `5262 9821 2345 6789` (or the latest success card from Razorpay docs)
- Any future **expiry**, any **CVV**, any name

Always take the **current** numbers from Razorpay’s docs—they update them.

## 4. After payment succeeds

- **Server** needs `FIREBASE_SERVICE_ACCOUNT_KEY` so `/api/razorpay/verify` can write to Firestore.
- If verify fails, you’ll see an error **in the page** (not only Razorpay’s popup).

## 5. Going live

Switch dashboard to **Live mode**, replace **all three** keys with **live** `rzp_live_…` + live secret, redeploy, and complete Razorpay KYC.
