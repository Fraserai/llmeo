import { randomBytes } from "node:crypto";

import { EngineMode, MentionType, PromptIntent, PromptRunStatus, PromptSource, PromptStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normaliseDomain, slugify } from "@/lib/utils";
import { analyzeProviderAnswer } from "@/server/services/audit-analyzer-service";
import { fetchHomepageSnapshot, inferProfileFromHomepage, validateAuditWebsiteUrl } from "@/server/services/audit-homepage-service";
import { generateAuditPromptPlan } from "@/server/services/audit-prompt-service";
import { getAuditProviders } from "@/server/services/audit-provider-service";
import { buildAuditReport } from "@/server/services/audit-report-service";
import { refreshBusinessSnapshot, refreshRecommendations } from "@/server/services/analytics-service";
import { ensureSystemCatalog } from "@/server/services/catalog-service";
import type { AuditProfile, AuditPromptPlanItem, ProviderAnswer } from "@/server/services/audit-types";

const AUDIT_CONCURRENCY = 3;

export async function createAuditFromWebsite(websiteUrl: string) {
  const url = validateAuditWebsiteUrl(websiteUrl);
  const shareToken = await createUniqueShareToken();

  const audit = await prisma.visibilityAudit.create({
    data: {
      shareToken,
      status: "created",
      websiteUrl: url.toString(),
      websiteDomain: normaliseDomain(url.hostname),
    },
  });

  try {
    await prisma.visibilityAudit.update({
      where: { id: audit.id },
      data: { status: "ingesting_homepage" },
    });

    const homepage = await fetchHomepageSnapshot(url);
    const profile = inferProfileFromHomepage(homepage);

    await prisma.visibilityAudit.update({
      where: { id: audit.id },
      data: {
        status: "profile_ready",
        websiteUrl: homepage.url,
        websiteDomain: homepage.domain,
        inferredProfileJson: profile,
      },
    });

    return shareToken;
  } catch (error) {
    await prisma.visibilityAudit.update({
      where: { id: audit.id },
      data: {
        status: "failed",
        reportJson: {
          error: error instanceof Error ? error.message : "Homepage ingestion failed.",
        },
      },
    });

    throw error;
  }
}

export async function getAuditForToken(shareToken: string) {
  return prisma.visibilityAudit.findUnique({
    where: { shareToken },
    include: {
      results: {
        orderBy: [{ promptCategory: "asc" }, { prompt: "asc" }, { engine: "asc" }],
      },
    },
  });
}

export async function runAuditFromProfile({
  shareToken,
  profile,
  email,
}: {
  shareToken: string;
  profile: AuditProfile;
  email?: string | null;
}) {
  await prepareAuditFromProfile({ shareToken, profile, email });
  return runPreparedAudit(shareToken);
}

export async function prepareAuditFromProfile({
  shareToken,
  profile,
  email,
}: {
  shareToken: string;
  profile: AuditProfile;
  email?: string | null;
}) {
  const audit = await prisma.visibilityAudit.findUniqueOrThrow({
    where: { shareToken },
  });

  const normalizedProfile = normalizeAuditProfile(profile);
  const promptPlan = generateAuditPromptPlan(normalizedProfile);

  await prisma.visibilityAudit.update({
    where: { id: audit.id },
    data: {
      status: "running_tests",
      email: email || audit.email,
      editedProfileJson: normalizedProfile,
      promptPlanJson: promptPlan,
      reportJson: null,
    },
  });

  await prisma.visibilityAuditResult.deleteMany({
    where: { auditId: audit.id },
  });

  return {
    promptCount: promptPlan.length,
    shareToken,
  };
}

export async function runPreparedAudit(shareToken: string) {
  const audit = await prisma.visibilityAudit.findUniqueOrThrow({
    where: { shareToken },
  });

  if (["completed", "completed_partial"].includes(audit.status) && audit.reportJson) {
    return audit.status;
  }

  const normalizedProfile = profileFromAudit(audit.editedProfileJson) ?? profileFromAudit(audit.inferredProfileJson);

  if (!normalizedProfile) {
    await prisma.visibilityAudit.update({
      where: { id: audit.id },
      data: {
        status: "failed",
        reportJson: {
          error: "Business profile is missing. Return to the review step and try again.",
        },
      },
    });

    return "failed";
  }

  const existingPromptPlan = promptPlanFromAudit(audit.promptPlanJson);
  const promptPlan = existingPromptPlan.length ? existingPromptPlan : generateAuditPromptPlan(normalizedProfile);
  const providers = getAuditProviders();

  await prisma.visibilityAudit.update({
    where: { id: audit.id },
    data: {
      status: "running_tests",
      editedProfileJson: normalizedProfile,
      promptPlanJson: promptPlan,
      reportJson: null,
    },
  });

  await prisma.visibilityAuditResult.deleteMany({
    where: { auditId: audit.id },
  });

  const jobs = promptPlan.flatMap((prompt) =>
    providers.map((provider) => ({
      prompt,
      provider,
    })),
  );

  await mapWithConcurrency(jobs, AUDIT_CONCURRENCY, async ({ prompt, provider }) => {
    const providerAnswer = await provider.run({ prompt, profile: normalizedProfile });
    const row = await createRawResultRow({
      auditId: audit.id,
      prompt,
      providerAnswer,
    });

    if (!providerAnswer.rawAnswer || providerAnswer.error) {
      return;
    }

    const analysis = analyzeProviderAnswer({ providerAnswer, profile: normalizedProfile });

    await prisma.visibilityAuditResult.update({
      where: { id: row.id },
      data: {
        targetMentioned: analysis.targetMentioned,
        targetRecommended: analysis.targetRecommended,
        rankPosition: analysis.rankPosition,
        competitorsMentionedJson: analysis.competitorsMentioned,
        competitorsRecommendedJson: analysis.competitorsRecommended,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
      },
    });
  });

  await prisma.visibilityAudit.update({
    where: { id: audit.id },
    data: { status: "analyzing_results" },
  });

  const results = await prisma.visibilityAuditResult.findMany({
    where: { auditId: audit.id },
    orderBy: [{ promptCategory: "asc" }, { prompt: "asc" }, { engine: "asc" }],
  });
  const report = buildAuditReport({ profile: normalizedProfile, results });
  const successfulResults = results.filter((result) => !result.error).length;
  const failedResults = results.length - successfulResults;
  const finalStatus = successfulResults === 0 ? "failed" : failedResults > 0 ? "completed_partial" : "completed";

  await prisma.visibilityAudit.update({
    where: { id: audit.id },
    data: {
      status: finalStatus,
      reportJson: report,
    },
  });

  return finalStatus;
}

export async function claimAuditIntoWorkspace({
  shareToken,
  workspaceId,
  email,
}: {
  shareToken: string;
  workspaceId: string;
  email?: string | null;
}) {
  const audit = await prisma.visibilityAudit.findUnique({
    where: { shareToken },
    include: { results: true },
  });

  if (!audit) {
    return null;
  }

  const existingBusiness = await prisma.business.findFirst({
    where: { workspaceId },
  });

  await prisma.visibilityAudit.update({
    where: { id: audit.id },
    data: {
      claimedWorkspaceId: workspaceId,
      email: email ?? audit.email,
    },
  });

  if (existingBusiness) {
    return existingBusiness;
  }

  const profile = profileFromAudit(audit.editedProfileJson) ?? profileFromAudit(audit.inferredProfileJson);

  if (!profile) {
    return null;
  }

  const slugBase = slugify(profile.businessName);
  const existingSlugCount = await prisma.business.count({
    where: {
      slug: {
        startsWith: slugBase,
      },
    },
  });

  const business = await prisma.business.create({
    data: {
      workspaceId,
      name: profile.businessName,
      slug: existingSlugCount ? `${slugBase}-${existingSlugCount + 1}` : slugBase,
      websiteDomain: profile.websiteDomain,
      industry: profile.industry,
      category: profile.category,
      description: profile.description,
      australianStates: inferStates(profile.locations),
      targetLocations: profile.locations,
      productsServices: profile.productsServices,
      customerKeywords: profile.customerKeywords,
      onboardingDone: true,
    },
  });

  await createCompetitorsFromAudit({
    businessId: business.id,
    locations: profile.locations,
    profileCompetitors: profile.competitors,
    results: audit.results,
  });

  const { categories } = await ensureSystemCatalog();
  const promptPlan = promptPlanFromAudit(audit.promptPlanJson);
  const createdPrompts = await createBusinessPromptsFromAudit({
    businessId: business.id,
    promptPlan,
    categories,
  });
  const engines = await ensureAuditEngines();

  await createPromptRunsFromAudit({
    businessId: business.id,
    results: audit.results,
    promptByText: createdPrompts,
    engineBySlug: engines,
  });

  const scores = await refreshBusinessSnapshot(business.id);
  await refreshRecommendations({ business, scores });

  await prisma.report.create({
    data: {
      businessId: business.id,
      name: "Initial AI visibility audit",
      summary:
        "This baseline report was created from the free AI visibility audit and its individual prompt results.",
      periodStart: audit.createdAt,
      periodEnd: new Date(),
    },
  });

  return business;
}

export function profileFromAudit(value: unknown): AuditProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const profile = value as Partial<AuditProfile>;

  if (!profile.businessName || !profile.websiteDomain) {
    return null;
  }

  return normalizeAuditProfile({
    businessName: profile.businessName,
    websiteUrl: profile.websiteUrl ?? `https://${profile.websiteDomain}`,
    websiteDomain: profile.websiteDomain,
    industry: profile.industry ?? "Business services",
    category: profile.category ?? "Business",
    description: profile.description ?? "",
    locations: profile.locations ?? ["Australia"],
    productsServices: profile.productsServices ?? [profile.category ?? "Core service"],
    competitors: profile.competitors ?? [],
    customerKeywords: profile.customerKeywords ?? [],
  });
}

export function promptPlanFromAudit(value: unknown): AuditPromptPlanItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AuditPromptPlanItem => {
    const candidate = item as Partial<AuditPromptPlanItem>;
    return Boolean(candidate.id && candidate.text && candidate.category);
  });
}

export function normalizeAuditProfile(profile: AuditProfile): AuditProfile {
  const websiteUrl = profile.websiteUrl.trim();
  const websiteDomain = normaliseDomain(profile.websiteDomain || safeDomainFromUrl(websiteUrl) || "");

  return {
    businessName: profile.businessName.trim(),
    websiteUrl,
    websiteDomain,
    industry: profile.industry.trim() || "Business services",
    category: profile.category.trim() || "Business",
    description: profile.description.trim() || `${profile.businessName.trim()} provides ${profile.category.trim()} services.`,
    locations: cleanStringArray(profile.locations, ["Australia"]),
    productsServices: cleanStringArray(profile.productsServices, [profile.category.trim() || "Core service"]),
    competitors: cleanStringArray(profile.competitors, []),
    customerKeywords: cleanStringArray(profile.customerKeywords, [profile.category.trim() || "Business"]),
  };
}

async function createRawResultRow({
  auditId,
  prompt,
  providerAnswer,
}: {
  auditId: string;
  prompt: AuditPromptPlanItem;
  providerAnswer: ProviderAnswer;
}) {
  return prisma.visibilityAuditResult.create({
    data: {
      auditId,
      prompt: prompt.text,
      promptCategory: prompt.category,
      engine: providerAnswer.engine,
      model: providerAnswer.model,
      rawAnswer: providerAnswer.rawAnswer,
      answerExcerpt: providerAnswer.answerExcerpt,
      sourcesJson: providerAnswer.sources,
      sourceStatus: providerAnswer.sourceStatus,
      competitorsMentionedJson: [],
      competitorsRecommendedJson: [],
      error: providerAnswer.error,
      latencyMs: providerAnswer.latencyMs,
    },
  });
}

async function createUniqueShareToken() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(12).toString("hex");
    const existing = await prisma.visibilityAudit.findUnique({
      where: { shareToken: token },
    });

    if (!existing) {
      return token;
    }
  }

  return randomBytes(18).toString("hex");
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) {
        await handler(item);
      }
    }
  });

  await Promise.all(workers);
}

function cleanStringArray(value: string[], fallback: string[]) {
  const cleaned = Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
  return cleaned.length ? cleaned : fallback;
}

function safeDomainFromUrl(value: string) {
  try {
    return normaliseDomain(new URL(value).hostname);
  } catch {
    return null;
  }
}

function inferStates(locations: string[]) {
  const joined = locations.join(" ").toLowerCase();
  const states = [
    ["QLD", ["brisbane", "queensland", "gold coast", "sunshine coast", "cairns", "townsville"]],
    ["NSW", ["sydney", "new south wales", "newcastle"]],
    ["VIC", ["melbourne", "victoria", "geelong"]],
    ["WA", ["perth", "western australia"]],
    ["SA", ["adelaide", "south australia"]],
    ["TAS", ["hobart", "tasmania"]],
    ["ACT", ["canberra", "act"]],
    ["NT", ["darwin", "northern territory"]],
  ] as const;

  const matches = states
    .filter(([, keywords]) => keywords.some((keyword) => joined.includes(keyword)))
    .map(([state]) => state);

  return matches.length ? matches : ["AUS"];
}

async function createCompetitorsFromAudit({
  businessId,
  locations,
  profileCompetitors,
  results,
}: {
  businessId: string;
  locations: string[];
  profileCompetitors: string[];
  results: { competitorsMentionedJson: unknown; competitorsRecommendedJson: unknown }[];
}) {
  const answerCompetitors = results.flatMap((result) => [
    ...jsonStringArray(result.competitorsMentionedJson),
    ...jsonStringArray(result.competitorsRecommendedJson),
  ]);
  const names = Array.from(new Set([...answerCompetitors, ...profileCompetitors])).slice(0, 8);

  if (!names.length) {
    return;
  }

  await prisma.competitor.createMany({
    data: names.map((name) => ({
      businessId,
      name,
      websiteDomain: `${slugify(name)}.com.au`,
      locationsServed: locations.slice(0, 2),
    })),
  });
}

async function createBusinessPromptsFromAudit({
  businessId,
  promptPlan,
  categories,
}: {
  businessId: string;
  promptPlan: AuditPromptPlanItem[];
  categories: { id: string; slug: string }[];
}) {
  const categoryByAuditSlug = new Map([
    ["local_discovery", "local-discovery"],
    ["best_top", "best-top"],
    ["problem_solution", "solution-selection"],
    ["comparison", "comparison"],
    ["trust_validation", "trust-reputation"],
    ["category_specific", "category"],
  ]);
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const created = new Map<string, string>();

  for (const prompt of promptPlan) {
    const categorySlug = categoryByAuditSlug.get(prompt.category) ?? "category";
    const promptRecord = await prisma.prompt.create({
      data: {
        businessId,
        categoryId: categoryIdBySlug.get(categorySlug) ?? categoryIdBySlug.get("category")!,
        text: prompt.text,
        intent: intentForAuditCategory(prompt.category),
        source: PromptSource.IMPORTED,
        status: PromptStatus.ACTIVE,
      },
    });
    created.set(prompt.text, promptRecord.id);
  }

  return created;
}

async function ensureAuditEngines() {
  const engines = [
    {
      slug: "openai-chatgpt",
      name: "ChatGPT",
      provider: "OpenAI",
      mode: EngineMode.LIVE,
      metadata: { source: "audit" },
    },
    {
      slug: "gemini-google-search",
      name: "Gemini",
      provider: "Google",
      mode: EngineMode.LIVE,
      metadata: { source: "audit", grounding: "best_effort" },
    },
    {
      slug: "mock-chatgpt",
      name: "Mock ChatGPT",
      provider: "Local mock",
      mode: EngineMode.MOCK,
      metadata: { source: "audit" },
    },
    {
      slug: "mock-gemini",
      name: "Mock Gemini",
      provider: "Local mock",
      mode: EngineMode.MOCK,
      metadata: { source: "audit" },
    },
  ];

  for (const engine of engines) {
    await prisma.engine.upsert({
      where: { slug: engine.slug },
      update: {
        name: engine.name,
        provider: engine.provider,
        mode: engine.mode,
        isActive: true,
        metadata: engine.metadata,
      },
      create: {
        slug: engine.slug,
        name: engine.name,
        provider: engine.provider,
        mode: engine.mode,
        metadata: engine.metadata,
      },
    });
  }

  return new Map(
    (
      await prisma.engine.findMany({
        where: {
          slug: {
            in: engines.map((engine) => engine.slug),
          },
        },
      })
    ).map((engine) => [engine.slug, engine.id]),
  );
}

async function createPromptRunsFromAudit({
  businessId,
  results,
  promptByText,
  engineBySlug,
}: {
  businessId: string;
  results: {
    id: string;
    prompt: string;
    engine: string;
    rawAnswer: string | null;
    sentiment: string | null;
    targetMentioned: boolean | null;
    targetRecommended: boolean | null;
    rankPosition: number | null;
    error: string | null;
    sourceStatus: string;
    confidence: number | null;
    competitorsMentionedJson: unknown;
    sourcesJson: unknown;
    answerExcerpt: string | null;
  }[];
  promptByText: Map<string, string>;
  engineBySlug: Map<string, string>;
}) {
  for (const result of results) {
    const promptId = promptByText.get(result.prompt);
    const engineId = engineBySlug.get(result.engine);

    if (!promptId || !engineId) {
      continue;
    }

    await prisma.promptRun.create({
      data: {
        businessId,
        promptId,
        engineId,
        status: result.error ? PromptRunStatus.FAILED : PromptRunStatus.COMPLETED,
        rawAnswer: result.rawAnswer,
        answerTone: result.sentiment,
        userAppeared: Boolean(result.targetMentioned),
        competitorAppeared: jsonStringArray(result.competitorsMentionedJson).length > 0,
        rankPosition: result.rankPosition,
        engineMetadata: {
          auditResultId: result.id,
          sourceStatus: result.sourceStatus,
          targetRecommended: result.targetRecommended,
          error: result.error,
        },
        completedAt: new Date(),
        ...(result.error
          ? {}
          : {
              result: {
                create: {
                  summary: result.answerExcerpt ?? "Audit answer captured.",
                  sentimentLabel: result.sentiment ?? "neutral",
                  confidenceScore: result.confidence,
                  mentions: {
                    create: [
                      ...(result.targetMentioned
                        ? [
                            {
                              name: "Target business",
                              mentionType: MentionType.TARGET,
                              rank: result.rankPosition,
                              sentiment: result.sentiment,
                            },
                          ]
                        : []),
                      ...jsonStringArray(result.competitorsMentionedJson).map((name, index) => ({
                        name,
                        mentionType: MentionType.COMPETITOR,
                        rank: index + 1,
                        sentiment: "neutral",
                      })),
                    ],
                  },
                  citationSources: {
                    create: sourcesFromJson(result.sourcesJson),
                  },
                },
              },
            }),
      },
    });
  }
}

function intentForAuditCategory(category: string) {
  switch (category) {
    case "local_discovery":
      return PromptIntent.LOCAL_DISCOVERY;
    case "best_top":
      return PromptIntent.BEST_OF;
    case "comparison":
      return PromptIntent.COMPARISON;
    case "trust_validation":
      return PromptIntent.TRUST;
    case "problem_solution":
      return PromptIntent.SOLUTION_SELECTION;
    default:
      return PromptIntent.CATEGORY;
  }
}

function jsonStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function sourcesFromJson(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((source) => {
      const candidate = source as { domain?: unknown; url?: unknown; title?: unknown };
      return typeof candidate.domain === "string"
        ? {
            domain: candidate.domain,
            url: typeof candidate.url === "string" ? candidate.url : null,
            title: typeof candidate.title === "string" ? candidate.title : null,
          }
        : null;
    })
    .filter((source): source is { domain: string; url: string | null; title: string | null } => Boolean(source));
}
