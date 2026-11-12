import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  EngineMode,
  MentionType,
  PrismaClient,
  PromptIntent,
  PromptSource,
  PromptStatus,
  PromptRunStatus,
  RecommendationEffort,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
  ReportStatus,
  WorkspaceRole,
} from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const categories = [
  {
    slug: "local-discovery",
    name: "Local discovery",
    description: "Prompts where people ask who offers services in a suburb, city, or state.",
    sortOrder: 1,
  },
  {
    slug: "best-top",
    name: "Best / top intent",
    description: "Prompts that look for the best or top-rated providers.",
    sortOrder: 2,
  },
  {
    slug: "comparison",
    name: "Comparison prompts",
    description: "Prompts comparing multiple providers or alternatives.",
    sortOrder: 3,
  },
  {
    slug: "category",
    name: "Category prompts",
    description: "Prompts for category-level discovery without a direct brand comparison.",
    sortOrder: 4,
  },
  {
    slug: "trust-reputation",
    name: "Trust / reputation",
    description: "Prompts focused on reliability, reviews, safety, and expertise.",
    sortOrder: 5,
  },
  {
    slug: "solution-selection",
    name: "Solution selection",
    description: "Prompts where users need help choosing the right type of solution.",
    sortOrder: 6,
  },
];

const engines = [
  {
    slug: "chatgpt-style",
    name: "ChatGPT-style answer source",
    provider: "OpenAI-compatible",
    mode: EngineMode.MOCK,
    metadata: { answerShape: "conversational", supportsCitations: true },
  },
  {
    slug: "perplexity-style",
    name: "Perplexity-style answer source",
    provider: "Search-grounded",
    mode: EngineMode.MOCK,
    metadata: { answerShape: "search-grounded", supportsCitations: true },
  },
  {
    slug: "gemini-style",
    name: "Gemini-style answer source",
    provider: "Google-compatible",
    mode: EngineMode.MOCK,
    metadata: { answerShape: "summary-first", supportsCitations: true },
  },
];

const prompts = [
  {
    categorySlug: "local-discovery",
    intent: PromptIntent.LOCAL_DISCOVERY,
    text: "Who are the best emergency plumbers in Brisbane Northside?",
  },
  {
    categorySlug: "best-top",
    intent: PromptIntent.BEST_OF,
    text: "Best plumbers in Brisbane for hot water repairs",
  },
  {
    categorySlug: "comparison",
    intent: PromptIntent.COMPARISON,
    text: "Southern Coast Plumbing vs Harbour Flow Plumbing for strata maintenance",
  },
  {
    categorySlug: "category",
    intent: PromptIntent.CATEGORY,
    text: "Which plumbing companies in Brisbane help with commercial maintenance?",
  },
  {
    categorySlug: "trust-reputation",
    intent: PromptIntent.TRUST,
    text: "Who should I trust for blocked drain repairs in North Lakes?",
  },
  {
    categorySlug: "solution-selection",
    intent: PromptIntent.SOLUTION_SELECTION,
    text: "Who should I choose for emergency plumber services near Redcliffe?",
  },
  {
    categorySlug: "comparison",
    intent: PromptIntent.COMPARISON,
    text: "Which is better for hot water emergencies in Brisbane: Southern Coast Plumbing or Aussie Drain & Hot Water?",
  },
  {
    categorySlug: "category",
    intent: PromptIntent.CATEGORY,
    text: "Top-rated Queensland plumbers for commercial sites and strata managers",
  },
];

const runBlueprints = [
  {
    promptIndex: 0,
    engineSlug: "chatgpt-style",
    rawAnswer:
      "For Brisbane Northside emergency plumbing, Southern Coast Plumbing is a strong option alongside Harbour Flow Plumbing and Northside Rapid Plumbing. Southern Coast stands out for quick response windows, hot water expertise, and clear service area coverage.",
    answerTone: "positive",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 1,
    summary: "Southern Coast Plumbing is mentioned first for emergency plumbing on Brisbane Northside.",
    sentimentLabel: "positive",
    mentions: [
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Harbour Flow Plumbing",
        domain: "harbourflow.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 2,
        sentiment: "positive",
      },
      {
        name: "Northside Rapid Plumbing",
        domain: "northsiderapid.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 3,
        sentiment: "neutral",
      },
    ],
    sources: [
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/emergency-plumber-brisbane",
        title: "Emergency plumber Brisbane Northside",
      },
      {
        domain: "productreview.com.au",
        url: "https://www.productreview.com.au/listings/southern-coast-plumbing",
        title: "Southern Coast Plumbing reviews",
      },
    ],
  },
  {
    promptIndex: 0,
    engineSlug: "perplexity-style",
    rawAnswer:
      "Emergency plumbers serving Brisbane Northside include Harbour Flow Plumbing, Southern Coast Plumbing, and Aussie Drain & Hot Water. Harbour Flow is cited for fast dispatch, while Southern Coast is noted for broader suburb coverage and hot water systems.",
    answerTone: "mixed",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 2,
    summary: "Southern Coast Plumbing appears but trails Harbour Flow Plumbing.",
    sentimentLabel: "mixed",
    mentions: [
      {
        name: "Harbour Flow Plumbing",
        domain: "harbourflow.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 2,
        sentiment: "positive",
      },
      {
        name: "Aussie Drain & Hot Water",
        domain: "aussiedrainhotwater.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 3,
        sentiment: "neutral",
      },
    ],
    sources: [
      {
        domain: "harbourflow.com.au",
        url: "https://harbourflow.com.au/brisbane-emergency-plumber",
        title: "Brisbane emergency plumber",
      },
      {
        domain: "truelocal.com.au",
        url: "https://www.truelocal.com.au/business/southern-coast-plumbing",
        title: "True Local listing",
      },
    ],
  },
  {
    promptIndex: 1,
    engineSlug: "chatgpt-style",
    rawAnswer:
      "For hot water repairs in Brisbane, Harbour Flow Plumbing and Southern Coast Plumbing are usually strong picks. Harbour Flow is mentioned first thanks to comparison content and review-rich service pages.",
    answerTone: "mixed",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 2,
    summary: "Southern Coast Plumbing shows up, but a competitor is preferred first.",
    sentimentLabel: "mixed",
    mentions: [
      {
        name: "Harbour Flow Plumbing",
        domain: "harbourflow.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 2,
        sentiment: "positive",
      },
    ],
    sources: [
      {
        domain: "harbourflow.com.au",
        url: "https://harbourflow.com.au/hot-water-brisbane",
        title: "Hot water repairs Brisbane",
      },
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/hot-water-systems",
        title: "Hot water systems and repairs",
      },
    ],
  },
  {
    promptIndex: 2,
    engineSlug: "gemini-style",
    rawAnswer:
      "For strata maintenance, Southern Coast Plumbing is presented as the better fit because of commercial maintenance coverage, while Harbour Flow Plumbing looks more residentially focused.",
    answerTone: "positive",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 1,
    summary: "Southern Coast Plumbing wins direct comparison intent on a commercial prompt.",
    sentimentLabel: "positive",
    mentions: [
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Harbour Flow Plumbing",
        domain: "harbourflow.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 2,
        sentiment: "neutral",
      },
    ],
    sources: [
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/commercial-plumbing",
        title: "Commercial plumbing maintenance",
      },
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/strata-services",
        title: "Strata plumbing services",
      },
    ],
  },
  {
    promptIndex: 3,
    engineSlug: "perplexity-style",
    rawAnswer:
      "Commercial plumbing support in Brisbane is often associated with Southern Coast Plumbing, Aussie Drain & Hot Water, and Flowline Projects. Southern Coast has the clearest maintenance positioning.",
    answerTone: "positive",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 1,
    summary: "Southern Coast Plumbing is the strongest mention for commercial maintenance prompts.",
    sentimentLabel: "positive",
    mentions: [
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Aussie Drain & Hot Water",
        domain: "aussiedrainhotwater.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 2,
        sentiment: "neutral",
      },
      {
        name: "Flowline Projects",
        domain: "flowlineprojects.com.au",
        mentionType: MentionType.THIRD_PARTY,
        rank: 3,
        sentiment: "neutral",
      },
    ],
    sources: [
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/commercial-plumbing",
        title: "Commercial plumbing maintenance",
      },
      {
        domain: "linkedin.com",
        url: "https://www.linkedin.com/company/southern-coast-plumbing",
        title: "LinkedIn company profile",
      },
    ],
  },
  {
    promptIndex: 4,
    engineSlug: "chatgpt-style",
    rawAnswer:
      "For blocked drain repairs around North Lakes, Northside Rapid Plumbing and Harbour Flow Plumbing are more commonly surfaced than Southern Coast Plumbing because they have suburb-specific drain pages and stronger review coverage.",
    answerTone: "negative",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 3,
    summary: "Southern Coast Plumbing appears late for a trust-oriented local query.",
    sentimentLabel: "negative",
    mentions: [
      {
        name: "Northside Rapid Plumbing",
        domain: "northsiderapid.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Harbour Flow Plumbing",
        domain: "harbourflow.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 2,
        sentiment: "positive",
      },
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 3,
        sentiment: "neutral",
      },
    ],
    sources: [
      {
        domain: "northsiderapid.com.au",
        url: "https://northsiderapid.com.au/blocked-drains-north-lakes",
        title: "Blocked drains North Lakes",
      },
      {
        domain: "google.com",
        url: "https://www.google.com/maps/place/Southern+Coast+Plumbing",
        title: "Google Business Profile",
      },
    ],
  },
  {
    promptIndex: 5,
    engineSlug: "gemini-style",
    rawAnswer:
      "If you need an emergency plumber near Redcliffe, Southern Coast Plumbing and Harbour Flow Plumbing are both credible. Southern Coast edges ahead because it covers Redcliffe, North Lakes, and surrounding suburbs with 24/7 emergency content.",
    answerTone: "positive",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 1,
    summary: "Southern Coast Plumbing wins on solution-selection intent.",
    sentimentLabel: "positive",
    mentions: [
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Harbour Flow Plumbing",
        domain: "harbourflow.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 2,
        sentiment: "positive",
      },
    ],
    sources: [
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/redcliffe-emergency-plumber",
        title: "Emergency plumber Redcliffe",
      },
      {
        domain: "facebook.com",
        url: "https://www.facebook.com/southerncoastplumbing",
        title: "Facebook profile",
      },
    ],
  },
  {
    promptIndex: 6,
    engineSlug: "perplexity-style",
    rawAnswer:
      "For Brisbane hot water emergencies, Aussie Drain & Hot Water is usually the first recommendation, with Southern Coast Plumbing as a solid alternative. Aussie Drain & Hot Water has more explicit hot water comparison content.",
    answerTone: "mixed",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 2,
    summary: "Southern Coast Plumbing loses some high-intent comparison visibility.",
    sentimentLabel: "mixed",
    mentions: [
      {
        name: "Aussie Drain & Hot Water",
        domain: "aussiedrainhotwater.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 2,
        sentiment: "positive",
      },
    ],
    sources: [
      {
        domain: "aussiedrainhotwater.com.au",
        url: "https://aussiedrainhotwater.com.au/hot-water-brisbane",
        title: "Brisbane hot water specialists",
      },
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/hot-water-systems",
        title: "Hot water systems and repairs",
      },
    ],
  },
  {
    promptIndex: 7,
    engineSlug: "chatgpt-style",
    rawAnswer:
      "Top-rated Queensland plumbers for strata and commercial sites include Southern Coast Plumbing, Flowline Projects, and Harbour Flow Plumbing. Southern Coast is strongest when local coverage and service breadth are weighed together.",
    answerTone: "positive",
    userAppeared: true,
    competitorAppeared: true,
    rankPosition: 1,
    summary: "Southern Coast Plumbing performs strongly for broader commercial category prompts.",
    sentimentLabel: "positive",
    mentions: [
      {
        name: "Southern Coast Plumbing",
        domain: "southerncoastplumbing.com.au",
        mentionType: MentionType.TARGET,
        rank: 1,
        sentiment: "positive",
      },
      {
        name: "Flowline Projects",
        domain: "flowlineprojects.com.au",
        mentionType: MentionType.THIRD_PARTY,
        rank: 2,
        sentiment: "neutral",
      },
      {
        name: "Harbour Flow Plumbing",
        domain: "harbourflow.com.au",
        mentionType: MentionType.COMPETITOR,
        rank: 3,
        sentiment: "positive",
      },
    ],
    sources: [
      {
        domain: "southerncoastplumbing.com.au",
        url: "https://southerncoastplumbing.com.au/commercial-plumbing",
        title: "Commercial plumbing maintenance",
      },
      {
        domain: "industrytop5.com.au",
        url: "https://industrytop5.com.au/listing/southern-coast-plumbing",
        title: "Industry Top 5 listing",
      },
    ],
  },
];

async function main() {
  await prisma.promptResult.deleteMany();
  await prisma.promptRun.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.report.deleteMany();
  await prisma.visibilitySnapshot.deleteMany();
  await prisma.prompt.deleteMany();
  await prisma.promptCategory.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.business.deleteMany();
  await prisma.engine.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  await prisma.promptCategory.createMany({ data: categories });
  await prisma.engine.createMany({ data: engines });

  const categoryMap = new Map(
    (await prisma.promptCategory.findMany()).map((category) => [category.slug, category.id]),
  );
  const engineMap = new Map((await prisma.engine.findMany()).map((engine) => [engine.slug, engine.id]));

  const workspace = await prisma.workspace.create({
    data: {
      name: "Southern Coast Workspace",
      slug: "southern-coast-workspace",
    },
  });

  const user = await prisma.user.create({
    data: {
      name: "Olivia Harper",
      email: "demo@ausllmeo.com.au",
      passwordHash: await hash("Demo123!", 10),
      defaultWorkspaceId: workspace.id,
      memberships: {
        create: {
          workspaceId: workspace.id,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });

  const business = await prisma.business.create({
    data: {
      workspaceId: workspace.id,
      name: "Southern Coast Plumbing",
      slug: "southern-coast-plumbing",
      websiteDomain: "southerncoastplumbing.com.au",
      industry: "Home services",
      category: "Plumbing",
      description:
        "Southern Coast Plumbing is an Australian plumbing business focused on emergency response, hot water systems, blocked drains, commercial maintenance, and strata support across Brisbane's northside.",
      australianStates: ["QLD"],
      targetLocations: ["Brisbane CBD, QLD", "North Lakes, QLD", "Redcliffe, QLD", "Chermside, QLD"],
      productsServices: [
        "Emergency plumbing",
        "Blocked drains",
        "Hot water system repairs",
        "Commercial maintenance",
        "Strata plumbing",
      ],
      customerKeywords: [
        "emergency plumber brisbane northside",
        "blocked drains north lakes",
        "hot water plumber redcliffe",
        "commercial plumber brisbane",
      ],
      onboardingDone: true,
    },
  });

  await prisma.competitor.createMany({
    data: [
      {
        businessId: business.id,
        name: "Harbour Flow Plumbing",
        websiteDomain: "harbourflow.com.au",
        description: "Well-cited Brisbane plumbing competitor with comparison content and suburb landing pages.",
        locationsServed: ["Brisbane CBD, QLD", "Chermside, QLD", "North Lakes, QLD"],
      },
      {
        businessId: business.id,
        name: "Northside Rapid Plumbing",
        websiteDomain: "northsiderapid.com.au",
        description: "Northside-focused emergency plumbing business with suburb-specific blocked drain content.",
        locationsServed: ["North Lakes, QLD", "Redcliffe, QLD"],
      },
      {
        businessId: business.id,
        name: "Aussie Drain & Hot Water",
        websiteDomain: "aussiedrainhotwater.com.au",
        description: "Competitor with strong hot water emergency positioning.",
        locationsServed: ["Brisbane CBD, QLD", "Redcliffe, QLD"],
      },
    ],
  });

  const createdPrompts = [];

  for (const prompt of prompts) {
    const created = await prisma.prompt.create({
      data: {
        businessId: business.id,
        categoryId: categoryMap.get(prompt.categorySlug)!,
        text: prompt.text,
        intent: prompt.intent,
        source: PromptSource.GENERATED,
        status: PromptStatus.ACTIVE,
      },
    });

    createdPrompts.push(created);
  }

  for (const blueprint of runBlueprints) {
    await prisma.promptRun.create({
      data: {
        businessId: business.id,
        promptId: createdPrompts[blueprint.promptIndex].id,
        engineId: engineMap.get(blueprint.engineSlug)!,
        status: PromptRunStatus.COMPLETED,
        rawAnswer: blueprint.rawAnswer,
        answerTone: blueprint.answerTone,
        userAppeared: blueprint.userAppeared,
        competitorAppeared: blueprint.competitorAppeared,
        rankPosition: blueprint.rankPosition,
        engineMetadata: {
          providerStatus: "mocked",
          locale: "en-AU",
        },
        completedAt: new Date(),
        result: {
          create: {
            summary: blueprint.summary,
            sentimentLabel: blueprint.sentimentLabel,
            confidenceScore: 0.81,
            mentions: {
              create: blueprint.mentions,
            },
            citationSources: {
              create: blueprint.sources,
            },
          },
        },
      },
    });
  }

  await prisma.visibilitySnapshot.createMany({
    data: [
      {
        businessId: business.id,
        visibilityScore: 68,
        competitorGapScore: 37,
        opportunityScore: 74,
        promptCoverage: 72,
        citationCoverage: 64,
        winRate: 58,
        shareOfVisibility: 61,
        createdAt: new Date("2026-04-09T09:00:00.000Z"),
      },
      {
        businessId: business.id,
        visibilityScore: 72,
        competitorGapScore: 33,
        opportunityScore: 69,
        promptCoverage: 75,
        citationCoverage: 67,
        winRate: 61,
        shareOfVisibility: 64,
        createdAt: new Date("2026-04-16T09:00:00.000Z"),
      },
      {
        businessId: business.id,
        visibilityScore: 76,
        competitorGapScore: 29,
        opportunityScore: 63,
        promptCoverage: 79,
        citationCoverage: 71,
        winRate: 66,
        shareOfVisibility: 68,
        createdAt: new Date("2026-04-23T09:00:00.000Z"),
      },
    ],
  });

  await prisma.recommendation.createMany({
    data: [
      {
        businessId: business.id,
        title: "Build suburb-specific blocked drain pages for North Lakes and nearby suburbs",
        description:
          "Trust-focused local prompts are leaning to competitors with suburb pages. Create service pages for blocked drains and emergency work across North Lakes, Redcliffe, and Chermside.",
        priority: RecommendationPriority.HIGH,
        effort: RecommendationEffort.QUICK_WIN,
        type: RecommendationType.LOCAL_PAGES,
        rationale: "Competitors are winning trust and local discovery prompts by surfacing stronger suburb relevance.",
        status: RecommendationStatus.OPEN,
      },
      {
        businessId: business.id,
        title: "Add explicit comparison content for hot water and emergency response",
        description:
          "Comparison prompts cite competitors with better side-by-side positioning. Publish comparison-friendly pages that explain response times, licences, warranties, and service-area depth.",
        priority: RecommendationPriority.HIGH,
        effort: RecommendationEffort.MEDIUM,
        type: RecommendationType.COMPARISON_CONTENT,
        rationale: "High-intent prompt losses are clustered around comparison and best-of prompts.",
        status: RecommendationStatus.OPEN,
      },
      {
        businessId: business.id,
        title: "Strengthen third-party source presence across Australian directories",
        description:
          "Expand and standardise profiles across Google Business Profile, ProductReview, True Local, and industry directories to improve citation coverage.",
        priority: RecommendationPriority.MEDIUM,
        effort: RecommendationEffort.QUICK_WIN,
        type: RecommendationType.SOURCE_PRESENCE,
        rationale: "Citation coverage is improving, but directory presence still lags competitors.",
        status: RecommendationStatus.OPEN,
      },
    ],
  });

  await prisma.report.create({
    data: {
      businessId: business.id,
      name: "April 2026 AI visibility summary",
      summary:
        "Southern Coast Plumbing is visible in most prompt clusters, with strongest performance in commercial and solution-selection prompts. The biggest gaps remain in suburb-specific blocked drain queries and comparison-led hot water prompts.",
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-23T23:59:59.000Z"),
      status: ReportStatus.GENERATED,
      generatedAt: new Date("2026-04-23T10:00:00.000Z"),
    },
  });

  console.log(`Seeded AUS LLMEO demo user: ${user.email} / Demo123!`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
