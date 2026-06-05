import type {
  BusinessAgentAction,
  BusinessAgentActionRisk,
} from "@/lib/business-agent/types";
import { stripUndefinedDeep } from "@/lib/firestore-json";

export type CollectionAllowedPatch = {
  collection: BusinessAgentAction["target"]["collection"];
  safeFields: string[];
  requiresApprovalFields: string[];
};

const ALLOWED: CollectionAllowedPatch[] = [
  {
    collection: "seoPages",
    safeFields: ["metaTitle", "metaDescription"],
    requiresApprovalFields: ["headline", "bodyContent", "bookingOption", "keywords"],
  },
  {
    collection: "services",
    safeFields: ["short"],
    requiresApprovalFields: ["title", "detailContent", "active"],
  },
  {
    collection: "blogPosts",
    safeFields: ["metaTitle", "metaDescription"],
    requiresApprovalFields: ["content", "faqs", "title", "keywords", "excerpt"],
  },
];

function findAllowed(collection: BusinessAgentAction["target"]["collection"]) {
  return ALLOWED.find((x) => x.collection === collection);
}

export function validatePatchFields(opts: {
  action: BusinessAgentAction;
  patch: Record<string, unknown>;
}): { safePatch: Record<string, unknown>; requiresApprovalPatch: Record<string, unknown> } {
  const { action, patch } = opts;
  const allowed = findAllowed(action.target.collection);
  if (!allowed) {
    throw new Error(`No allowed patch config for collection: ${action.target.collection}`);
  }

  const safePatch: Record<string, unknown> = {};
  const requiresApprovalPatch: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (allowed.safeFields.includes(k)) safePatch[k] = v;
    else if (allowed.requiresApprovalFields.includes(k)) requiresApprovalPatch[k] = v;
    else {
      throw new Error(`Field not allowed by safety layer: ${action.target.collection}.${k}`);
    }
  }

  return {
    safePatch: stripUndefinedDeep(safePatch),
    requiresApprovalPatch: stripUndefinedDeep(requiresApprovalPatch),
  };
}

export function computeActionRiskFromPatch(opts: {
  action: BusinessAgentAction;
  patch: Record<string, unknown>;
}): BusinessAgentActionRisk {
  const { patch, action } = opts;
  const allowed = findAllowed(action.target.collection);
  if (!allowed) return "requires_approval";
  const keys = Object.keys(patch);
  const hasRequires = keys.some((k) => allowed.requiresApprovalFields.includes(k));
  return hasRequires ? "requires_approval" : "safe";
}

export function enforceSeoStringConstraints(opts: {
  collection: BusinessAgentAction["target"]["collection"];
  patch: Record<string, unknown>;
}): Record<string, unknown> {
  const { collection, patch } = opts;
  const out: Record<string, unknown> = { ...patch };

  if (collection === "seoPages" || collection === "blogPosts") {
    if (typeof out.metaTitle === "string") out.metaTitle = out.metaTitle.trim().slice(0, 60);
    if (typeof out.metaDescription === "string")
      out.metaDescription = out.metaDescription.trim().slice(0, 155);
  }

  if (collection === "services") {
    if (typeof out.short === "string") out.short = out.short.trim().slice(0, 240);
  }

  if (collection === "seoPages") {
    if (typeof out.headline === "string") out.headline = out.headline.trim().slice(0, 90);
    if (typeof out.bookingOption === "string")
      out.bookingOption = out.bookingOption.trim().slice(0, 160);
    if (typeof out.bodyContent === "string")
      out.bodyContent = out.bodyContent.trim().slice(0, 12000);
    if (Array.isArray(out.keywords)) {
      out.keywords = out.keywords
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, 18);
    }
  }

  if (collection === "blogPosts") {
    if (typeof out.title === "string") out.title = out.title.trim().slice(0, 120);
    if (typeof out.excerpt === "string") out.excerpt = out.excerpt.trim().slice(0, 200);
    if (typeof out.content === "string") out.content = out.content.trim().slice(0, 22000);
  }

  return stripUndefinedDeep(out);
}

