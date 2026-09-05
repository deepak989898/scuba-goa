import type { AgentId, CommandCenterAgentMeta } from "@/lib/command-center/types";

export const AGENT_REGISTRY: CommandCenterAgentMeta[] = [
  {
    id: "seo",
    name: "SEO Agent",
    description: "Rankings, metadata, internal linking, content clusters",
    adminPath: "/admin/seo-intelligence",
    cronPath: "/api/cron/seo-weekly",
    cronSchedule: "0 5 * * 1",
    pipelineFn: "runSeoWeeklyPipeline",
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    description: "Traffic, anomalies, funnels, user behavior",
    adminPath: "/admin/ai-analytics",
    cronPath: "/api/cron/analytics-daily",
    cronSchedule: "0 4 * * *",
    pipelineFn: "runAiAnalyticsDailyPipeline",
  },
  {
    id: "booking",
    name: "Booking Agent",
    description: "Abandoned checkouts, payment issues, recovery WhatsApp",
    adminPath: "/admin/recovery-agent",
    cronPath: "/api/cron/recovery-hourly",
    cronSchedule: "45 4 * * *",
    pipelineFn: "runRecoveryAgentPipeline",
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    description: "Campaigns, ads, social content, performance",
    adminPath: "/admin/marketing-engine",
    cronPath: "/api/cron/marketing-daily",
    cronSchedule: "0 6 * * *",
    pipelineFn: "runMarketingEnginePipeline",
  },
  {
    id: "reputation",
    name: "Reputation Agent",
    description: "Reviews, satisfaction, trust-building suggestions",
    adminPath: "/admin/ratings",
    pipelineFn: "runReputationAgent",
  },
  {
    id: "competitor",
    name: "Competitor Agent",
    description: "Competitor SEO, pricing patterns, marketing trends",
    adminPath: "/admin/marketing-engine#competitor-reports",
    pipelineFn: "runCompetitorAgent",
  },
  {
    id: "pricing",
    name: "Pricing Agent",
    description: "Weekly AI market pricing suggestions & approvals",
    adminPath: "/admin/pricing-agent",
    pipelineFn: "runPricingAgent",
  },
];

export function getAgentMeta(id: AgentId): CommandCenterAgentMeta | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}
