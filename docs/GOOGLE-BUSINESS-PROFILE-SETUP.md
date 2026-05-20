# Google Business Profile — auto-post blogs (step-by-step)

When blog automation publishes a new article, the site can also create an **Update** post on your **Google Business Profile** (Google Maps listing) with:

- Post title + short excerpt  
- Featured image (from the blog)  
- **Learn more** button → link to `/blog/your-slug`  

---

## What you need

1. **Owner or manager** access to your scuba business on [Google Business Profile](https://business.google.com/)  
2. A **Google Cloud** project (can be the same project as Firebase)  
3. **Vercel** environment variables on `bookscubagoa.com`  
4. About **15–20 minutes** for one-time setup  

---

## Step 1 — Google Cloud project & APIs

1. Open [Google Cloud Console](https://console.cloud.google.com/).  
2. Select your project (e.g. the same as Firebase `bookscubagoa`).  
3. Go to **APIs & Services → Library** and enable these **three** APIs (search each name exactly — Google does **not** list one called “Google Business API”):
   - **Google My Business API** — creates Update posts  
   - **My Business Account Management API** — lists accounts  
   - **My Business Business Information API** — lists locations  
   If search fails, try **“My Business”** or **“Business Profile”** and pick the names above.
4. Go to **APIs & Services → OAuth consent screen**:
   - User type: **External** (or Internal if Workspace-only)  
   - App name: `Book Scuba Goa Blog`  
   - Support email: your email  
   - Add scope: `https://www.googleapis.com/auth/business.manage`  
   - Add **Test users**: your Google account email (while app is in *Testing*)  
5. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**  
   - Name: `Book Scuba Goa GBP`  
   - **Authorized redirect URIs** — add **both**:
     - `https://bookscubagoa.com/api/admin/google-business/oauth-callback`  
     - `http://localhost:3000/api/admin/google-business/oauth-callback` (for local testing)  
6. Copy **Client ID** and **Client secret**.

---

## Step 2 — Vercel environment variables

In **Vercel → Project → Settings → Environment Variables** (Production), add:

| Variable | Value |
|----------|--------|
| `GOOGLE_BUSINESS_CLIENT_ID` | OAuth Client ID from Step 1 |
| `GOOGLE_BUSINESS_CLIENT_SECRET` | OAuth Client secret |

Optional (instead of using Admin “Connect” for refresh token):

| Variable | Value |
|----------|--------|
| `GOOGLE_BUSINESS_REFRESH_TOKEN` | Long-lived refresh token |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | Numeric account id |
| `GOOGLE_BUSINESS_LOCATION_ID` | Numeric location id |

Redeploy after saving env vars.

---

## Manual account and location IDs (when Load accounts fails)

Google’s **list accounts** and **list locations** APIs use a **small daily quota** per Cloud project. If **Load accounts** always fails with quota or rate limit (even after waiting 20–30 minutes), use one of these:

1. **Admin form** — On **`/admin/blog-automation`**, in **Google Business Profile**, use **Manual account and location IDs**: enter the numeric **Account ID** and **Location ID**, an optional **Location title**, then **Save manual IDs**. You still need **Connect Google account** so the server has a refresh token; **creating posts** does not require the listing APIs.
2. **Environment variables** — Set `GOOGLE_BUSINESS_ACCOUNT_ID` and `GOOGLE_BUSINESS_LOCATION_ID` in Vercel (optional table in Step 2).

**Finding IDs:** APIs use names like `accounts/{accountId}/locations/{locationId}`. You only need the two numeric segments. You can paste the full `accounts/…/locations/…` string into the Admin manual ID fields; the server normalizes it on save. If unsure, search your Cloud project’s **APIs & Services → Credentials** logs or use Google’s documentation for Business Profile resource names.

---

## Step 3 — Connect in Admin (recommended)

1. Deploy the latest site code.  
2. Sign in at **`/admin/login`**.  
3. Open **`/admin/blog-automation`**.  
4. Scroll to **Google Business Profile**.  
5. Click **Connect Google account** → sign in with the Google account that **owns/manages** your scuba listing.  
6. Click **Load accounts** → pick your account.  
7. Click your **business location** (e.g. “Scuba Diving … Goa”).  
8. Click **Send test post** → check [Google Business Profile](https://business.google.com/) → **Updates** — you should see the test.  
9. Turn on **Auto-post each new blog to Google Business**.  

---

## Step 4 — Verify with a real blog

1. In **Blog automation**, click **Generate 1 post now** (or wait for cron).  
2. After publish, open your Google Business Profile → **Updates**.  
3. You should see a new post with image + **Learn more** linking to the blog.  

---

## How it works (technical)

- After each successful blog publish, the server calls Google’s **localPosts** API.  
- Each blog is posted **once** (`googleBusinessPostName` stored on the blog document).  
- If auto-post is **disabled**, blogs still publish on the website only.  
- Errors are shown in Admin under **Google Business Profile → Last error**.

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| “Client ID not configured” | Add env vars in Vercel and redeploy |
| “Access blocked” / consent screen | Add your Gmail as **Test user** on OAuth consent screen |
| “invalid_state” on redirect | Connect again from Admin (state expires in 15 min) |
| “Quota” / rate limit / “Permission denied” | If it is **Load accounts** only, use **Manual IDs** or env vars (listing quota). Otherwise ensure the three Business APIs are enabled and the signed-in user is **owner/manager** of the listing |
| Post not showing | Google can take a few minutes; check **Updates** on mobile Maps app too |
| Image missing | Image URL must be **public HTTPS** (Firebase Storage URLs work) |

---

## Production access (Google verification)

While the OAuth app is in **Testing**, only test users you added can connect.

For long-term use with any manager account, submit the app for **Google verification** in Cloud Console (OAuth consent screen → Publish app). Google may review the `business.manage` scope.

---

## Security notes

- **Client secret** and **refresh token** stay on the server (Vercel env / Firestore admin doc). Never put them in the public website code.  
- Only signed-in **admins** can connect Google or enable auto-post.
