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
3. Go to **APIs & Services → Library** and enable:
   - **Google My Business API** (for creating posts)  
   - **My Business Account Management API** (list accounts)  
   - **My Business Business Information API** (list locations)  
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
| “Quota” or “Permission denied” | Ensure APIs are enabled; account must be **owner/manager** of the listing |
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
