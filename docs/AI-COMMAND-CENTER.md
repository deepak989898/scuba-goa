# Multi-Agent AI Command Center — Book Scuba Goa

Central orchestration hub where 7 specialized AI agents share insights, coordinate decisions, and manage tourism business growth autonomously.

## Architecture

```
Individual agent crons (04:00–06:00 UTC)
    → each agent writes to its Firestore collections

Command Center cron (06:15 UTC daily)
    → collectAgentSnapshots() — reads all agent outputs
    → runReputationAgent(), runCompetitorAgent(), runPricingAgent()
    → runMasterCoordinator() — OpenAI synthesizes cross-agent plan
    → conflict resolution, task queue, memory, alerts
    → commandCenterReports/{dateIst}

Admin: /admin/command-center
```

## AI agents

| Agent | Source | Admin |
|-------|--------|-------|
| SEO | `seo-agent` | `/admin/seo-agent` |
| Analytics | `ai-analytics` + `conversion-opt` | `/admin/ai-analytics` |
| Booking | `recovery-agent` | `/admin/recovery-agent` |
| Marketing | `marketing-engine` | `/admin/marketing-engine` |
| Reputation | `command-center/agents/reputation` | `/admin/ratings` |
| Competitor | `command-center/agents/competitor` | `/admin/marketing-engine` |
| Pricing | `command-center/agents/pricing` | `/admin/offers` |

## Firestore collections

| Collection | Purpose |
|------------|---------|
| `commandCenterRuns` | Orchestration run log |
| `commandCenterReports` | Daily master AI brief |
| `commandCenterTasks` | Priority task queue |
| `commandCenterAgentLogs` | Per-agent activity |
| `commandCenterInsights` | Cross-agent shared insights |
| `commandCenterDecisions` | Master AI decisions |
| `commandCenterAlerts` | Severity-ranked alerts |
| `commandCenterMemory` | Long-term memory by category |
| `commandCenter/settings` | Orchestration toggles |

### Memory categories

`business`, `seo`, `campaigns`, `bookings`, `customers`, `decisions` — rolling 90-entry history each.

## Orchestration features

- **Agent communication** — Master AI reads all snapshots and emits `commandCenterInsights` (fromAgent → toAgents)
- **Task queue** — Auto-syncs pending approvals from business + marketing agents; adds master AI tasks
- **Conflict prevention** — Blocks conflicting discount vs trust priorities
- **Approval workflow** — Surfaces pending actions; approve in respective agent dashboards
- **Rollback** — Business agent rollback remains at `/admin/business-agent`

## Daily cron schedule (UTC)

| Time | Agent |
|------|-------|
| 03:30 | Blog publish |
| 04:00 | Analytics + Conversion |
| 04:45 | Booking recovery |
| 05:00 Mon | SEO weekly |
| 05:30 | Business ops |
| 06:00 | Marketing engine |
| 06:15 | **Command center** |

## APIs

- `GET /api/admin/command-center/dashboard`
- `POST /api/admin/command-center/run`
- `POST /api/admin/command-center/settings`
- `GET /api/cron/command-center-daily`

## Environment

Uses existing `OPENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `CRON_SECRET`, optional `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, optional `SERPER_API_KEY`.

## Hobby plan note

All crons are once-per-day (or weekly for SEO). Recovery runs daily at 04:45 UTC, not hourly.
