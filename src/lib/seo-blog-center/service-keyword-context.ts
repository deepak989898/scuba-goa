import type { ResearchInput } from "@/lib/seo-blog-center/providers/types";

const STOP_WORDS = new Set([
  "goa",
  "india",
  "in",
  "the",
  "a",
  "an",
  "of",
  "for",
  "to",
  "and",
  "or",
  "book",
  "best",
  "top",
  "near",
  "from",
  "with",
  "how",
  "what",
  "is",
  "it",
  "hire",
  "online",
  "package",
  "packages",
]);

export type ServiceVertical =
  | "scuba"
  | "water_sports"
  | "casino"
  | "nightlife"
  | "tour"
  | "adventure"
  | "other";

const SCUBA_STRONG =
  /\b(scuba diving|scuba diver|padi certification|underwater diving|discover scuba)\b/i;
const SCUBA_PRIMARY = /\b(scuba|diving|snorkel|padi|underwater)\b/i;

export function inferServiceVertical(
  serviceSlug: string,
  serviceName: string,
): ServiceVertical {
  const s = `${serviceSlug} ${serviceName}`.toLowerCase();
  if (/casino/.test(s)) return "casino";
  if (/night.?club|disco|pub/.test(s)) return "nightlife";
  if (/scuba|diving|snorkel/.test(s)) return "scuba";
  if (/water.?sport|parasail|jet.?ski|banana|bumper/.test(s)) return "water_sports";
  if (/tour|dudhsagar|sightseeing/.test(s)) return "tour";
  if (/bungee|flyboard/.test(s)) return "adventure";
  return "other";
}

export function isScubaService(input: ResearchInput): boolean {
  return inferServiceVertical(input.serviceSlug, input.serviceName) === "scuba";
}

export function extractServiceCoreTokens(input: ResearchInput): string[] {
  const raw = `${input.seedKeyword} ${input.serviceName}`.toLowerCase();
  const cleaned = raw
    .replace(/\bin\s+goa\b/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return [...new Set(cleaned)];
}

export function keywordMatchesSelectedService(
  keyword: string,
  input: ResearchInput,
): boolean {
  const l = keyword.toLowerCase().trim();
  if (!l || l.length < 3) return false;

  const vertical = inferServiceVertical(input.serviceSlug, input.serviceName);
  const coreTokens = extractServiceCoreTokens(input);

  if (coreTokens.length > 0) {
    const hasCore = coreTokens.some((t) => l.includes(t));
    if (!hasCore) return false;
  }

  if (vertical === "casino" || vertical === "nightlife" || vertical === "tour") {
    if (SCUBA_STRONG.test(l)) return false;
    if (
      SCUBA_PRIMARY.test(l) &&
      !coreTokens.some((t) => /\b(scuba|diving|snorkel|padi)\b/.test(t))
    ) {
      return false;
    }
  }

  if (vertical === "scuba") {
    if (
      /\b(casino|night.?club|pub crawl|disco entry)\b/.test(l) &&
      !SCUBA_PRIMARY.test(l)
    ) {
      return false;
    }
  }

  if (vertical === "water_sports") {
    if (/\b(casino|night.?club)\b/.test(l) && !/\b(water sport|parasail|jet ski|banana)\b/.test(l)) {
      return false;
    }
  }

  return true;
}

export function buildRelevanceHaystack(
  input: Pick<ResearchInput, "serviceName" | "seedKeyword" | "serviceSlug">,
): string {
  const base = `${input.seedKeyword} ${input.serviceName}`.toLowerCase();
  const vertical = inferServiceVertical(input.serviceSlug, input.serviceName);
  const extras: Record<ServiceVertical, string> = {
    scuba: "scuba diving snorkeling padi underwater grande island boat",
    water_sports: "water sports parasailing jet ski banana boat bumper ride",
    casino: "casino booking chips poker cruise offshore onshore big daddy deltin",
    nightlife: "night club disco pub guest list vip table party",
    tour: "tour sightseeing beach fort cab pickup heritage",
    adventure: "bungee flyboarding thrill adventure",
    other: "booking package goa experience",
  };
  return `${base} goa ${extras[vertical]}`.trim();
}

const GOA_PLACES = [
  "Baga",
  "Calangute",
  "Candolim",
  "North Goa",
  "South Goa",
  "Palolem",
  "Panjim",
] as const;

export function buildServiceSeedQueries(input: ResearchInput): string[] {
  const base = (input.seedKeyword || input.serviceName).trim();
  const core = base.replace(/\s+in\s+goa$/i, "").trim();
  if (!core) return [];

  const seeds = new Set<string>();
  seeds.add(core);
  seeds.add(`${core} Goa`);
  seeds.add(`${core} in Goa`);
  seeds.add(`${core} price Goa`);
  seeds.add(`${core} booking Goa`);
  seeds.add(`book ${core} Goa`);
  seeds.add(`best ${core} Goa`);
  seeds.add(`${core} package Goa`);

  for (const place of GOA_PLACES) {
    seeds.add(`${core} ${place}`);
    seeds.add(`${core} in ${place}`);
  }

  const vertical = inferServiceVertical(input.serviceSlug, input.serviceName);
  if (vertical === "casino") {
    seeds.add("big daddy casino goa");
    seeds.add("deltin casino goa");
    seeds.add("offshore casino goa");
    seeds.add("casino entry package goa");
    seeds.add("casino cruise goa");
  }
  if (vertical === "nightlife") {
    seeds.add("night club goa");
    seeds.add("club entry goa");
    seeds.add("vip table goa nightclub");
  }
  if (vertical === "scuba") {
    seeds.add("scuba diving goa price");
    seeds.add("grande island scuba");
    seeds.add("padi scuba goa");
  }

  return [...seeds];
}

export function getNearbyActivities(
  serviceSlug: string,
  serviceName: string,
): readonly string[] {
  const v = inferServiceVertical(serviceSlug, serviceName);
  switch (v) {
    case "scuba":
      return [
        "parasailing",
        "jet ski",
        "banana boat",
        "dolphin trip",
        "snorkeling",
        "island hopping",
      ];
    case "water_sports":
      return ["scuba diving", "dolphin trip", "boat cruise", "kayaking", "flyboarding"];
    case "casino":
      return ["night club", "pub crawl", "boat cruise", "dinner cruise"];
    case "nightlife":
      return ["pub crawl", "casino", "beach party", "live music"];
    case "tour":
      return ["water sports", "scuba diving", "dolphin trip", "beach hopping"];
    default:
      return ["boat cruise", "beach activities", "local sightseeing"];
  }
}

export function getComparisonKeywords(base: string, input: ResearchInput): string[] {
  const v = inferServiceVertical(input.serviceSlug, input.serviceName);
  const common = [
    `North Goa vs South Goa ${base}`,
    `best ${base} package vs budget option Goa`,
  ];
  switch (v) {
    case "scuba":
      return [
        ...common,
        `${base} vs snorkeling Goa`,
        `Grande Island vs Bat Island ${base}`,
        `PADI vs Discover Scuba Goa`,
      ];
    case "casino":
      return [
        ...common,
        `offshore casino vs onshore casino Goa`,
        `${base} vs land casino Goa`,
        `Big Daddy vs Deltin casino Goa`,
        `casino entry packages vs VIP Goa`,
      ];
    case "nightlife":
      return [
        ...common,
        `night club vs pub Goa`,
        `VIP table vs guest list Goa`,
        `North Goa clubs vs South Goa clubs`,
      ];
    case "water_sports":
      return [
        ...common,
        `parasailing vs jet ski Goa`,
        `${base} combo vs single activity Goa`,
      ];
    default:
      return common;
  }
}

export function getPackageKeywords(base: string, input: ResearchInput): string[] {
  const common = [
    `${base} package Goa`,
    `${base} packages with pickup`,
    `${base} combo package Goa`,
    `${base} family package Goa`,
    `${base} couple package Goa`,
    `${base} inclusions exclusions Goa`,
    `${base} full day package Goa`,
  ];
  const v = inferServiceVertical(input.serviceSlug, input.serviceName);
  if (v === "scuba") {
    common.push(`Grande Island ${base} package`);
  }
  if (v === "casino") {
    common.push(
      `${base} entry with dinner`,
      `${base} chips package Goa`,
      `${base} VIP entry Goa`,
    );
  }
  return common;
}

export function getQuestionKeywords(base: string, input: ResearchInput): string[] {
  const v = inferServiceVertical(input.serviceSlug, input.serviceName);
  const common = [
    `how much does ${base} cost in Goa`,
    `how to book ${base} in Goa`,
    `what is included in ${base} Goa`,
    `how long is ${base} in Goa`,
  ];
  if (v === "scuba" || v === "water_sports") {
    common.push(
      `is ${base} safe in Goa`,
      `what to wear for ${base} in Goa`,
      `can non swimmers do ${base} in Goa`,
    );
  }
  if (v === "casino") {
    common.push(
      `${base} age limit Goa`,
      `is ${base} legal in Goa`,
      `what to wear for ${base} Goa`,
      `casino dress code Goa`,
    );
  }
  if (v === "nightlife") {
    common.push(
      `${base} dress code Goa`,
      `${base} age limit Goa`,
      `best time for ${base} Goa`,
    );
  }
  return common;
}
