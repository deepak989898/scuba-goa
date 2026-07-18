# AI Pricing Agent

Weekly Goa market price research for existing active **services** (`priceFrom`) and **packages** (`price`). Suggestions require admin approval unless Auto Approve is enabled.

Live catalog prices never change from the browser. Cron and admin APIs run server-side only.

## Architecture summary

```
cron-job.org (Tue 00:30 UTC = 06:00 IST)
  → GET /api/cron/pricing-agent-weekly (+ Bearer CRON_SECRET)
  → scheduleCronTask → runPricingAgentPipeline()
      → list active packages + services (Firebase Admin)
      → Serper public SERP snippets (no login/CAPTCHA/private scrape)
      → deterministic stats + optional OpenAI structured JSON
      → safety caps (sources, confidence, ±% weekly, floor/margin)
      → save pricingSuggestions + competitorPriceSnapshots
      → auto-approve only if settings + package rules pass
      → applyLiveCatalogPrice() + packagePriceHistory + revalidatePath
```

Admin UI: `/admin/pricing-agent`  
Command Center agent card also links here.

## Files created

| Path | Role |
|------|------|
| `src/lib/pricing-agent/*` | Types, settings, catalog, market research, AI, safety, store, apply, pipeline, notify |
| `src/app/api/cron/pricing-agent-weekly/route.ts` | Weekly cron (202 + background) |
| `src/app/api/admin/pricing-agent/dashboard/route.ts` | Dashboard data |
| `src/app/api/admin/pricing-agent/settings/route.ts` | Settings get/save |
| `src/app/api/admin/pricing-agent/run/route.ts` | Manual / dry-run |
| `src/app/api/admin/pricing-agent/suggestion/route.ts` | Approve / reject / rollback |
| `src/app/admin/pricing-agent/page.tsx` | Admin UI |
| `scripts/test-pricing-agent-safety.mjs` | Safety unit checks |
| `docs/AI-PRICING-AGENT.md` | This doc |

## Files modified

- `src/components/admin/admin-nav.ts` — nav link
- `src/app/admin/page.tsx` — dashboard card
- `src/lib/command-center/agent-registry.ts` — Pricing Agent path
- `firestore.rules` — admin-read / server-write collections
- `docs/EXTERNAL-CRON-JOBS.md` — Tuesday job
- `.env.example` — pricing env notes
- `package.json` — `test:pricing-agent` script

## Database collections

| Collection / doc | Purpose |
|------------------|---------|
| `pricingAgent/settings` | Global rules, auto-approve, schedule metadata |
| `pricingAgent/runLock` | Prevent concurrent runs |
| `pricingRuns` | Run status + logs |
| `pricingSuggestions` | Per-package suggestions + workflow status |
| `competitorPriceSnapshots` | Competitor rows per suggestion |
| `packagePriceHistory` | Audit + rollback |
| `packagePricingRules` | Optional per-target overrides (`targetId` = `package:id` or `service:slug`) |

Client SDK: **read-only for admins**. Writes only via Admin SDK (API/cron).

No composite indexes required for current queries (equality + in-memory sort).

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Recommended | Recommendation reasons / normalization |
| `SERPER_API_KEY` or `SERP_API_KEY` | Yes for market data | Public Google results via Serper |
| `CRON_SECRET` | Yes | Cron auth |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Yes | Catalog updates |
| `AI_PRICING_OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `TELEGRAM_*` / `AI_ANALYTICS_REPORT_EMAIL` | Optional | Completion notifications |

## Scheduled job (cron-job.org)

- **URL:** `https://bookscubagoa.com/api/cron/pricing-agent-weekly`
- **Method:** `GET`
- **Header:** `Authorization: Bearer <CRON_SECRET>`
- **UTC cron:** `30 0 * * 2` → **Tuesday 06:00 Asia/Kolkata**
- Expect HTTP **202**; check Firestore `cronRunStatus/pricing-agent-weekly`

Do **not** add this to Vercel Hobby `vercel.json` (one-cron limit). Use external cron.

## Security rules

- Deploy: `firebase deploy --only firestore:rules`
- Admin panel APIs use `authenticateAdminRequest`
- Cron uses `verifyCronRequest` + run lock
- Competitor text is treated as untrusted; AI returns schema-validated JSON only
- Keys never shipped to the client

## Safety defaults

- Min **3** comparable sources
- Min **75%** confidence for auto-approve
- Max **±10%** change per run
- Emergency pause toggle
- Never updates past bookings (checkout uses cart `unitPrice` snapshot)

Leave **Auto Approve** off until you trust dry-run results.

## Testing

```bash
npm run test:pricing-agent
npx tsc --noEmit
npm run lint
npm run build
```

Manual:

1. Sign in at `/admin/login` → open `/admin/pricing-agent`
2. **Dry run** → confirm suggestions appear, live prices unchanged
3. Approve one suggestion → check package/service price + public page
4. Rollback from suggestion detail → price restored + history row
5. Trigger cron once with Bearer secret → expect 202 + `pricingRuns` doc

## Deploy

1. Push / deploy to Vercel
2. `firebase deploy --only firestore:rules`
3. Confirm `SERPER_API_KEY` + `OPENAI_API_KEY` + `CRON_SECRET` on Vercel
4. Create cron-job.org job (schedule above) and Test run
5. Dry run in admin, then enable Auto Approve only if desired

## Rollback (feature)

- **Price:** use Rollback on a history row in the admin UI (creates a new history entry)
- **Code:** revert the pricing-agent commit / redeploy previous Vercel deployment
- **Pause:** enable Emergency pause in AI Pricing settings (stops weekly auto updates)
- **Cron:** disable the cron-job.org job

## Scope notes / intentional limits

- Market data uses **public Serper snippets**, not deep HTML scraping of blocked sites
- Package-level rules are stored in Firestore (`packagePricingRules`); UI focuses on global settings + suggestion workflow
- Existing Command Center “pricing” snapshot still reports offers/conversion; live catalog changes go through this agent only
