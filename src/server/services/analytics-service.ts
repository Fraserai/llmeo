import { PromptIntent, type Business, type CitationSource, type Mention, type PromptCategory, type PromptRun, type Recommendation } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type PromptRunWithRelations = PromptRun & {
  prompt: {
    text: string;
    intent: PromptIntent;
    category: PromptCategory;
  };
  result: {
    summary: string;
    sentimentLabel: string;
    mentions: Mention[];
    citationSources: CitationSource[];
  } | null;
  engine: {
    name: string;
    slug: string;
  };
};

export function calculateVisibilityScores(promptRuns: PromptRunWithRelations[]) {
  if (!promptRuns.length) {
    return {
      visibilityScore: 0,
      competitorGapScore: 0,
      opportunityScore: 0,
      promptCoverage: 0,
      citationCoverage: 0,
      winRate: 0,
      shareOfVisibility: 0,
    };
  }

  const targetWins = promptRuns.filter((run) => run.userAppeared);
  const competitorDominance = promptRuns.filter((run) => run.competitorAppeared && !run.userAppeared);
  const citations = promptRuns.flatMap((run) => run.result?.citationSources ?? []);
  const targetMentions = promptRuns.flatMap((run) =>
    (run.result?.mentions ?? []).filter((mention) => mention.mentionType === "TARGET"),
  );
  const competitorMentions = promptRuns.flatMap((run) =>
    (run.result?.mentions ?? []).filter((mention) => mention.mentionType === "COMPETITOR"),
  );
  const distinctPromptCategories = new Set(promptRuns.map((run) => run.prompt.category.slug));
  const rankingValues = targetWins
    .map((run) => (run.rankPosition ? Math.max(0, 4 - run.rankPosition) / 3 : 0))
    .filter((value) => value >= 0);

  const mentionPresence = (targetWins.length / promptRuns.length) * 30;
  const rankingScore =
    (rankingValues.reduce((sum, value) => sum + value, 0) / Math.max(rankingValues.length, 1)) * 20;
  const citationScore = (Math.min(citations.length / promptRuns.length, 1) || 0) * 15;
  const shareOfVisibility =
    (targetMentions.length / Math.max(targetMentions.length + competitorMentions.length, 1)) * 100;
  const shareScore = (shareOfVisibility / 100) * 20;
  const promptCoverage = (distinctPromptCategories.size / 6) * 100;
  const coverageScore = (promptCoverage / 100) * 15;

  const visibilityScore = Math.min(
    100,
    Math.round(mentionPresence + rankingScore + citationScore + shareScore + coverageScore),
  );
  const competitorGapScore = Math.round((competitorDominance.length / promptRuns.length) * 100);
  const opportunityScore = Math.round(
    Math.min(100, 100 - visibilityScore * 0.55 + competitorGapScore * 0.45),
  );
  const winRate = Math.round((targetWins.length / promptRuns.length) * 100);
  const citationCoverage = Math.round((citations.length / promptRuns.length) * 100);

  return {
    visibilityScore,
    competitorGapScore,
    opportunityScore,
    promptCoverage: Math.round(promptCoverage),
    citationCoverage,
    winRate,
    shareOfVisibility: Math.round(shareOfVisibility),
  };
}

export async function refreshBusinessSnapshot(businessId: string) {
  const runs = await prisma.promptRun.findMany({
    where: { businessId, status: "COMPLETED" },
    include: {
      prompt: {
        include: {
          category: true,
        },
      },
      result: {
        include: {
          mentions: true,
          citationSources: true,
        },
      },
      engine: true,
    },
  });

  const scores = calculateVisibilityScores(runs);

  await prisma.visibilitySnapshot.create({
    data: {
      businessId,
      ...scores,
    },
  });

  return scores;
}

export async function refreshRecommendations({
  business,
  scores,
}: {
  business: Business;
  scores: ReturnType<typeof calculateVisibilityScores>;
}) {
  await prisma.recommendation.deleteMany({
    where: { businessId: business.id },
  });

  const recommendations: Omit<Recommendation, "id" | "createdAt" | "updatedAt">[] = [
    {
      businessId: business.id,
      title: `Strengthen local landing pages across ${business.targetLocations.slice(0, 2).join(" and ")}`,
      description:
        "Create or improve suburb-level pages with clear services, trust signals, and FAQs so AI engines have stronger local evidence to cite.",
      priority: scores.opportunityScore > 60 ? "HIGH" : "MEDIUM",
      effort: "QUICK_WIN",
      type: "LOCAL_PAGES",
      rationale: "Local discovery prompts are one of the fastest ways to lift prompt coverage and AI citations.",
      status: "OPEN",
    },
    {
      businessId: business.id,
      title: "Publish side-by-side comparison content against common alternatives",
      description:
        "Add honest comparison pages and structured FAQs that explain when customers should choose your business, a competitor, or another option.",
      priority: scores.competitorGapScore > 35 ? "HIGH" : "MEDIUM",
      effort: "MEDIUM",
      type: "COMPARISON_CONTENT",
      rationale: "Competitor wins usually cluster around comparison and best-of prompts.",
      status: "OPEN",
    },
    {
      businessId: business.id,
      title: "Improve entity clarity across your website and third-party sources",
      description:
        "Standardise business name, service areas, ABN details, reviews, and business profile descriptions so AI systems can reconcile your entity with confidence.",
      priority: scores.citationCoverage < 65 ? "HIGH" : "MEDIUM",
      effort: "QUICK_WIN",
      type: "ENTITY_CLARITY",
      rationale: "Citation coverage and entity consistency directly influence whether your brand is surfaced with confidence.",
      status: "OPEN",
    },
  ];

  await prisma.recommendation.createMany({
    data: recommendations,
  });
}

export async function getDashboardData(workspaceId: string) {
  const business = await prisma.business.findFirst({
    where: { workspaceId },
    include: {
      competitors: true,
      prompts: {
        include: {
          category: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      promptRuns: {
        include: {
          prompt: {
            include: {
              category: true,
            },
          },
          result: {
            include: {
              mentions: true,
              citationSources: true,
            },
          },
          engine: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      recommendations: {
        orderBy: {
          createdAt: "desc",
        },
      },
      snapshots: {
        orderBy: {
          createdAt: "asc",
        },
      },
      reports: {
        orderBy: {
          generatedAt: "desc",
        },
      },
    },
  });

  if (!business) {
    return null;
  }

  const scores = calculateVisibilityScores(business.promptRuns as PromptRunWithRelations[]);
  const topCompetitors = Object.entries(
    business.promptRuns
      .flatMap((run) => run.result?.mentions ?? [])
      .filter((mention) => mention.mentionType === "COMPETITOR")
      .reduce<Record<string, number>>((acc, mention) => {
        acc[mention.name] = (acc[mention.name] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .map(([name, mentions]) => ({ name, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 4);

  const topSources = Object.entries(
    business.promptRuns
      .flatMap((run) => run.result?.citationSources ?? [])
      .reduce<Record<string, number>>((acc, source) => {
        acc[source.domain] = (acc[source.domain] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const categoryPerformance = Object.values(
    business.promptRuns.reduce<Record<string, { name: string; wins: number; misses: number }>>(
      (acc, run) => {
        const key = run.prompt.category.slug;
        if (!acc[key]) {
          acc[key] = { name: run.prompt.category.name, wins: 0, misses: 0 };
        }

        if (run.userAppeared) {
          acc[key].wins += 1;
        } else {
          acc[key].misses += 1;
        }

        return acc;
      },
      {},
    ),
  );

  return {
    business,
    scores,
    topCompetitors,
    topSources,
    categoryPerformance,
    latestSnapshot: business.snapshots.at(-1) ?? null,
  };
}
