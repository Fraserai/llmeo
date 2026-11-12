import { PromptIntent, PromptSource, PromptStatus, type Business, type PromptCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { splitLines } from "@/lib/utils";

type GeneratorInput = Pick<
  Business,
  "name" | "industry" | "category" | "targetLocations" | "productsServices" | "customerKeywords"
> & {
  competitors?: { name: string }[];
};

type GeneratedPrompt = {
  categorySlug: string;
  text: string;
  intent: PromptIntent;
};

function uniquePrompts(prompts: GeneratedPrompt[]) {
  return prompts.filter(
    (prompt, index, array) => array.findIndex((item) => item.text === prompt.text) === index,
  );
}

export function generatePromptsForBusiness(input: GeneratorInput) {
  const locations = input.targetLocations.slice(0, 3);
  const services = input.productsServices.slice(0, 4);
  const keywords = input.customerKeywords.slice(0, 4);
  const competitors = input.competitors?.slice(0, 3) ?? [];
  const primaryLocation = locations[0] ?? "Australia";
  const secondaryLocation = locations[1] ?? primaryLocation;
  const primaryService = services[0] ?? input.category;
  const secondaryService = services[1] ?? input.category;
  const leadCompetitor = competitors[0]?.name;
  const alternateCompetitor = competitors[1]?.name;

  const prompts: GeneratedPrompt[] = [
    {
      categorySlug: "local-discovery",
      intent: PromptIntent.LOCAL_DISCOVERY,
      text: `Who are the best ${input.category.toLowerCase()} businesses in ${primaryLocation}?`,
    },
    {
      categorySlug: "local-discovery",
      intent: PromptIntent.LOCAL_DISCOVERY,
      text: `Which businesses offer ${primaryService.toLowerCase()} in ${secondaryLocation}?`,
    },
    {
      categorySlug: "best-top",
      intent: PromptIntent.BEST_OF,
      text: `Best ${input.category.toLowerCase()} providers in ${primaryLocation} for ${primaryService.toLowerCase()}`,
    },
    {
      categorySlug: "best-top",
      intent: PromptIntent.BEST_OF,
      text: `Top-rated Australian ${input.industry.toLowerCase()} brands for ${secondaryService.toLowerCase()}`,
    },
    {
      categorySlug: "comparison",
      intent: PromptIntent.COMPARISON,
      text: leadCompetitor
        ? `${input.name} vs ${leadCompetitor} for ${primaryService.toLowerCase()} in ${primaryLocation}`
        : `Which ${input.category.toLowerCase()} business should I choose in ${primaryLocation}?`,
    },
    {
      categorySlug: "comparison",
      intent: PromptIntent.COMPARISON,
      text:
        leadCompetitor && alternateCompetitor
          ? `Who is better in ${primaryLocation}: ${leadCompetitor}, ${alternateCompetitor}, or ${input.name}?`
          : `Which business stands out for ${secondaryService.toLowerCase()} in ${secondaryLocation}?`,
    },
    {
      categorySlug: "category",
      intent: PromptIntent.CATEGORY,
      text: `Which Australian businesses are known for ${primaryService.toLowerCase()} and ${secondaryService.toLowerCase()}?`,
    },
    {
      categorySlug: "category",
      intent: PromptIntent.CATEGORY,
      text: `Who are the leading ${input.category.toLowerCase()} providers serving ${primaryLocation}?`,
    },
    {
      categorySlug: "trust-reputation",
      intent: PromptIntent.TRUST,
      text: `Who should I trust in ${primaryLocation} for ${primaryService.toLowerCase()}?`,
    },
    {
      categorySlug: "trust-reputation",
      intent: PromptIntent.TRUST,
      text: `Which ${input.category.toLowerCase()} business in ${secondaryLocation} has the best reputation?`,
    },
    {
      categorySlug: "solution-selection",
      intent: PromptIntent.SOLUTION_SELECTION,
      text: `Who should I choose for ${secondaryService.toLowerCase()} in ${primaryLocation}?`,
    },
    {
      categorySlug: "solution-selection",
      intent: PromptIntent.SOLUTION_SELECTION,
      text: `What is the best option for ${primaryService.toLowerCase()} in ${secondaryLocation}?`,
    },
    ...keywords.map((keyword) => ({
      categorySlug: "category",
      intent: PromptIntent.CATEGORY,
      text: `Which businesses show up for "${keyword}" in AI answers?`,
    })),
  ];

  return uniquePrompts(prompts);
}

export async function createGeneratedPrompts({
  businessId,
  categories,
  generatedPrompts,
}: {
  businessId: string;
  categories: PromptCategory[];
  generatedPrompts: GeneratedPrompt[];
}) {
  const categoryMap = new Map(categories.map((category) => [category.slug, category.id]));

  for (const prompt of generatedPrompts) {
    await prisma.prompt.create({
      data: {
        businessId,
        categoryId: categoryMap.get(prompt.categorySlug)!,
        text: prompt.text,
        intent: prompt.intent,
        source: PromptSource.GENERATED,
        status: PromptStatus.ACTIVE,
      },
    });
  }
}

export async function addCustomPrompt({
  businessId,
  categoryId,
  text,
}: {
  businessId: string;
  categoryId: string;
  text: string;
}) {
  return prisma.prompt.create({
    data: {
      businessId,
      categoryId,
      text,
      intent: PromptIntent.CATEGORY,
      source: PromptSource.CUSTOM,
      status: PromptStatus.ACTIVE,
    },
  });
}

export function serialiseLines(value: string[]) {
  return value.join("\n");
}

export function deserialiseLines(value: string) {
  return splitLines(value);
}
