import { prisma } from "@/lib/prisma";
import { normaliseDomain, slugify } from "@/lib/utils";
import { refreshBusinessSnapshot, refreshRecommendations } from "@/server/services/analytics-service";
import { ensureSystemCatalog } from "@/server/services/catalog-service";
import { runMockEnginesForBusiness } from "@/server/services/engine-service";
import { createGeneratedPrompts, generatePromptsForBusiness } from "@/server/services/prompt-service";

type OnboardingInput = {
  workspaceId: string;
  businessName: string;
  websiteDomain: string;
  industry: string;
  category: string;
  description: string;
  states: string[];
  locations: string[];
  productsServices: string[];
  competitors: string[];
  customerKeywords: string[];
};

export async function bootstrapBusinessWorkspace(input: OnboardingInput) {
  const existingBusiness = await prisma.business.findFirst({
    where: { workspaceId: input.workspaceId },
  });

  if (existingBusiness) {
    await prisma.promptResult.deleteMany({
      where: {
        promptRun: {
          businessId: existingBusiness.id,
        },
      },
    });
    await prisma.promptRun.deleteMany({ where: { businessId: existingBusiness.id } });
    await prisma.prompt.deleteMany({ where: { businessId: existingBusiness.id } });
    await prisma.competitor.deleteMany({ where: { businessId: existingBusiness.id } });
    await prisma.recommendation.deleteMany({ where: { businessId: existingBusiness.id } });
    await prisma.visibilitySnapshot.deleteMany({ where: { businessId: existingBusiness.id } });
    await prisma.report.deleteMany({ where: { businessId: existingBusiness.id } });
    await prisma.business.delete({
      where: { id: existingBusiness.id },
    });
  }

  const slugBase = slugify(input.businessName);
  const existingSlugCount = await prisma.business.count({
    where: {
      slug: {
        startsWith: slugBase,
      },
    },
  });

  const business = await prisma.business.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.businessName,
      slug: existingSlugCount ? `${slugBase}-${existingSlugCount + 1}` : slugBase,
      websiteDomain: normaliseDomain(input.websiteDomain),
      industry: input.industry,
      category: input.category,
      description: input.description,
      australianStates: input.states,
      targetLocations: input.locations,
      productsServices: input.productsServices,
      customerKeywords: input.customerKeywords,
      onboardingDone: true,
    },
  });

  await prisma.competitor.createMany({
    data: input.competitors.map((competitor) => ({
      businessId: business.id,
      name: competitor,
      websiteDomain: `${slugify(competitor)}.com.au`,
      locationsServed: input.locations.slice(0, 2),
    })),
  });

  const { categories } = await ensureSystemCatalog();
  const competitors = await prisma.competitor.findMany({
    where: { businessId: business.id },
  });

  const generatedPrompts = generatePromptsForBusiness({
    name: business.name,
    industry: business.industry,
    category: business.category,
    targetLocations: business.targetLocations,
    productsServices: business.productsServices,
    customerKeywords: business.customerKeywords,
    competitors: competitors.map((competitor) => ({ name: competitor.name })),
  });

  await createGeneratedPrompts({
    businessId: business.id,
    categories,
    generatedPrompts,
  });

  await runMockEnginesForBusiness(business.id);
  const scores = await refreshBusinessSnapshot(business.id);
  await refreshRecommendations({ business, scores });

  await prisma.report.create({
    data: {
      businessId: business.id,
      name: "Initial AI visibility baseline",
      summary:
        "This baseline report was generated so the workspace starts with LLMEO insights and action points.",
      periodStart: new Date(),
      periodEnd: new Date(),
    },
  });

  return business;
}
