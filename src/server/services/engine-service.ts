import { MentionType, PromptIntent, PromptRunStatus, type Business, type Competitor, type Engine, type Prompt } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normaliseDomain } from "@/lib/utils";

type EngineExecutionResult = {
  rawAnswer: string;
  answerTone: string;
  userAppeared: boolean;
  competitorAppeared: boolean;
  rankPosition: number | null;
  summary: string;
  sentimentLabel: string;
  mentions: {
    name: string;
    domain: string | null;
    mentionType: MentionType;
    rank: number | null;
    sentiment: string;
  }[];
  sources: {
    domain: string;
    url: string;
    title: string;
  }[];
};

function stableScore(seed: string) {
  return [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function domainToUrl(domain: string, path: string) {
  return `https://${domain.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function intentLabel(intent: PromptIntent) {
  switch (intent) {
    case PromptIntent.BEST_OF:
      return "best-of";
    case PromptIntent.COMPARISON:
      return "comparison";
    case PromptIntent.LOCAL_DISCOVERY:
      return "local";
    case PromptIntent.TRUST:
      return "trust";
    case PromptIntent.SOLUTION_SELECTION:
      return "solution";
    default:
      return "category";
  }
}

function buildMockExecution({
  business,
  competitors,
  prompt,
  engine,
}: {
  business: Business;
  competitors: Competitor[];
  prompt: Prompt;
  engine: Engine;
}): EngineExecutionResult {
  const seed = stableScore(`${prompt.text}-${engine.slug}-${business.name}`);
  const targetRank = (seed % 3) + 1;
  const targetWins = seed % 5 !== 0;
  const topCompetitor = competitors[seed % Math.max(competitors.length, 1)];
  const secondaryCompetitor = competitors[(seed + 1) % Math.max(competitors.length, 1)];
  const answerTone = targetWins ? "positive" : "mixed";
  const summary = targetWins
    ? `${business.name} is surfaced strongly for this ${intentLabel(prompt.intent)} prompt.`
    : `${business.name} appears, but competitors are still commanding more attention.`;

  const mentions = [
    ...(targetWins
      ? [
          {
            name: business.name,
            domain: business.websiteDomain,
            mentionType: MentionType.TARGET,
            rank: 1,
            sentiment: "positive",
          },
        ]
      : topCompetitor
        ? [
            {
              name: topCompetitor.name,
              domain: topCompetitor.websiteDomain ?? null,
              mentionType: MentionType.COMPETITOR,
              rank: 1,
              sentiment: "positive",
            },
          ]
        : []),
    ...(targetWins
      ? topCompetitor
        ? [
            {
              name: topCompetitor.name,
              domain: topCompetitor.websiteDomain ?? null,
              mentionType: MentionType.COMPETITOR,
              rank: 2,
              sentiment: "neutral",
            },
          ]
        : []
      : [
          {
            name: business.name,
            domain: business.websiteDomain,
            mentionType: MentionType.TARGET,
            rank: targetRank,
            sentiment: "positive",
          },
        ]),
    ...(secondaryCompetitor && secondaryCompetitor.id !== topCompetitor?.id
      ? [
          {
            name: secondaryCompetitor.name,
            domain: secondaryCompetitor.websiteDomain ?? null,
            mentionType: MentionType.COMPETITOR,
            rank: 3,
            sentiment: "neutral",
          },
        ]
      : []),
  ];

  const targetMention = mentions.find((mention) => mention.mentionType === MentionType.TARGET);
  const competitorMention = mentions.some((mention) => mention.mentionType === MentionType.COMPETITOR);
  const domain = normaliseDomain(business.websiteDomain);

  return {
    rawAnswer: `${engine.name} highlights ${mentions
      .map((mention) => mention.name)
      .join(", ")} for the prompt "${prompt.text}". ${summary}`,
    answerTone,
    userAppeared: Boolean(targetMention),
    competitorAppeared: competitorMention,
    rankPosition: targetMention?.rank ?? null,
    summary,
    sentimentLabel: targetWins ? "positive" : "mixed",
    mentions,
    sources: [
      {
        domain,
        url: domainToUrl(domain, `${intentLabel(prompt.intent)}-${slugSuffix(prompt.text)}`),
        title: `${business.name} ${intentLabel(prompt.intent)} page`,
      },
      {
        domain: "google.com",
        url: `https://www.google.com/search?q=${encodeURIComponent(business.name)}`,
        title: `${business.name} business profile`,
      },
      ...(topCompetitor?.websiteDomain
        ? [
            {
              domain: normaliseDomain(topCompetitor.websiteDomain),
              url: domainToUrl(normaliseDomain(topCompetitor.websiteDomain), slugSuffix(prompt.text)),
              title: `${topCompetitor.name} comparison page`,
            },
          ]
        : []),
    ],
  };
}

function slugSuffix(promptText: string) {
  return promptText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function runMockEnginesForBusiness(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      competitors: true,
      prompts: {
        where: { status: "ACTIVE" },
      },
    },
  });

  if (!business) {
    return;
  }

  const engines = await prisma.engine.findMany({
    where: { isActive: true },
  });

  await prisma.promptResult.deleteMany({
    where: {
      promptRun: {
        businessId,
      },
    },
  });

  await prisma.promptRun.deleteMany({
    where: { businessId },
  });

  for (const prompt of business.prompts) {
    for (const engine of engines.slice(0, 3)) {
      const execution = buildMockExecution({
        business,
        competitors: business.competitors,
        prompt,
        engine,
      });

      await prisma.promptRun.create({
        data: {
          businessId,
          promptId: prompt.id,
          engineId: engine.id,
          status: PromptRunStatus.COMPLETED,
          rawAnswer: execution.rawAnswer,
          answerTone: execution.answerTone,
          userAppeared: execution.userAppeared,
          competitorAppeared: execution.competitorAppeared,
          rankPosition: execution.rankPosition,
          engineMetadata: {
            providerMode: engine.mode,
            mocked: true,
          },
          completedAt: new Date(),
          result: {
            create: {
              summary: execution.summary,
              sentimentLabel: execution.sentimentLabel,
              confidenceScore: 0.78,
              mentions: {
                create: execution.mentions,
              },
              citationSources: {
                create: execution.sources,
              },
            },
          },
        },
      });
    }
  }
}
