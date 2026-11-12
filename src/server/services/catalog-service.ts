import { EngineMode } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const categorySeed = [
  {
    slug: "local-discovery",
    name: "Local discovery",
    description: "Prompts where customers ask who services a location or suburb.",
    sortOrder: 1,
  },
  {
    slug: "best-top",
    name: "Best / top intent",
    description: "Prompts asking for the best, top, or leading providers.",
    sortOrder: 2,
  },
  {
    slug: "comparison",
    name: "Comparison prompts",
    description: "Prompts that compare a business against competitors or alternatives.",
    sortOrder: 3,
  },
  {
    slug: "category",
    name: "Category prompts",
    description: "Prompts that seek general providers in the category.",
    sortOrder: 4,
  },
  {
    slug: "trust-reputation",
    name: "Trust / reputation",
    description: "Prompts about reputation, credibility, and trust signals.",
    sortOrder: 5,
  },
  {
    slug: "solution-selection",
    name: "Solution selection",
    description: "Prompts focused on choosing the right supplier or solution.",
    sortOrder: 6,
  },
];

const engineSeed = [
  {
    slug: "chatgpt-style",
    name: "ChatGPT-style answer source",
    provider: "Conversational AI",
    mode: EngineMode.MOCK,
    metadata: { engineClass: "assistant", supportsCitations: true },
  },
  {
    slug: "google-ai-overview-style",
    name: "Google AI Overview-style source",
    provider: "Search AI",
    mode: EngineMode.MOCK,
    metadata: { engineClass: "search-summary", supportsCitations: true },
  },
  {
    slug: "perplexity-style",
    name: "Perplexity-style answer source",
    provider: "Grounded search",
    mode: EngineMode.MOCK,
    metadata: { engineClass: "research", supportsCitations: true },
  },
  {
    slug: "gemini-style",
    name: "Gemini-style source",
    provider: "Multimodal search",
    mode: EngineMode.MOCK,
    metadata: { engineClass: "answer-engine", supportsCitations: true },
  },
];

export async function ensureSystemCatalog() {
  const existingCategories = await prisma.promptCategory.count();
  const existingEngines = await prisma.engine.count();

  if (!existingCategories) {
    await prisma.promptCategory.createMany({ data: categorySeed });
  }

  if (!existingEngines) {
    await prisma.engine.createMany({ data: engineSeed });
  }

  const [categories, engines] = await Promise.all([
    prisma.promptCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.engine.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return { categories, engines };
}
