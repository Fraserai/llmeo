"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { normaliseDomain, slugify, splitLines } from "@/lib/utils";
import { refreshBusinessSnapshot, refreshRecommendations } from "@/server/services/analytics-service";
import { ensureSystemCatalog } from "@/server/services/catalog-service";
import { runMockEnginesForBusiness } from "@/server/services/engine-service";
import { requireSession, requireWorkspaceContext } from "@/server/auth/session";
import { createGeneratedPrompts, generatePromptsForBusiness } from "@/server/services/prompt-service";
import { bootstrapBusinessWorkspace } from "@/server/services/workspace-bootstrap-service";

const onboardingSchema = z.object({
  businessName: z.string().trim().min(2),
  websiteDomain: z.string().trim().min(4),
  industry: z.string().trim().min(2),
  category: z.string().trim().min(2),
  description: z.string().trim().min(20),
  states: z.string().trim().min(2),
  locations: z.string().trim().min(2),
  productsServices: z.string().trim().min(2),
  competitors: z.string().trim().optional(),
  customerKeywords: z.string().trim().min(2),
});

const promptSchema = z.object({
  categoryId: z.string().cuid(),
  text: z.string().trim().min(10),
});

const competitorSchema = z.object({
  name: z.string().trim().min(2),
});

export async function createBusinessProfileAction(formData: FormData) {
  const session = await requireSession();
  const parsed = onboardingSchema.parse({
    businessName: formData.get("businessName"),
    websiteDomain: formData.get("websiteDomain"),
    industry: formData.get("industry"),
    category: formData.get("category"),
    description: formData.get("description"),
    states: formData.get("states"),
    locations: formData.get("locations"),
    productsServices: formData.get("productsServices"),
    competitors: formData.get("competitors"),
    customerKeywords: formData.get("customerKeywords"),
  });

  await bootstrapBusinessWorkspace({
    workspaceId: session.user.workspaceId!,
    businessName: parsed.businessName,
    websiteDomain: parsed.websiteDomain,
    industry: parsed.industry,
    category: parsed.category,
    description: parsed.description,
    states: splitLines(parsed.states),
    locations: splitLines(parsed.locations),
    productsServices: splitLines(parsed.productsServices),
    competitors: splitLines(parsed.competitors ?? ""),
    customerKeywords: splitLines(parsed.customerKeywords),
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function addCustomPromptAction(formData: FormData) {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    redirect("/onboarding");
  }

  const parsed = promptSchema.parse({
    categoryId: formData.get("categoryId"),
    text: formData.get("text"),
  });

  await prisma.prompt.create({
    data: {
      businessId: business.id,
      categoryId: parsed.categoryId,
      text: parsed.text,
      source: "CUSTOM",
      status: "ACTIVE",
      intent: "CATEGORY",
    },
  });

  await rerunInsightsForBusiness(business.id);
  revalidatePath("/prompts");
}

export async function togglePromptStatusAction(formData: FormData) {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    redirect("/onboarding");
  }

  const promptId = z.string().cuid().parse(formData.get("promptId"));
  const nextStatus = z.enum(["ACTIVE", "PAUSED"]).parse(formData.get("nextStatus"));

  await prisma.prompt.updateMany({
    where: { id: promptId, businessId: business.id },
    data: { status: nextStatus },
  });

  revalidatePath("/prompts");
}

export async function generatePromptSetAction() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    redirect("/onboarding");
  }

  const competitors = await prisma.competitor.findMany({
    where: { businessId: business.id },
  });
  const { categories } = await ensureSystemCatalog();
  const generatedPrompts = generatePromptsForBusiness({
    name: business.name,
    industry: business.industry,
    category: business.category,
    targetLocations: business.targetLocations,
    productsServices: business.productsServices,
    customerKeywords: business.customerKeywords,
    competitors: competitors.map((competitor) => ({ name: competitor.name })),
  });

  const existingPromptTexts = new Set(
    (
      await prisma.prompt.findMany({
        where: { businessId: business.id },
        select: { text: true },
      })
    ).map((prompt) => prompt.text),
  );

  await createGeneratedPrompts({
    businessId: business.id,
    categories,
    generatedPrompts: generatedPrompts.filter((prompt) => !existingPromptTexts.has(prompt.text)),
  });

  await rerunInsightsForBusiness(business.id);
  revalidatePath("/prompts");
}

export async function addCompetitorAction(formData: FormData) {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    redirect("/onboarding");
  }

  const parsed = competitorSchema.parse({
    name: formData.get("name"),
  });

  await prisma.competitor.create({
    data: {
      businessId: business.id,
      name: parsed.name,
      websiteDomain: `${slugify(parsed.name)}.com.au`,
      locationsServed: business.targetLocations.slice(0, 2),
    },
  });

  await rerunInsightsForBusiness(business.id);
  revalidatePath("/competitors");
}

export async function refreshInsightsAction() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    redirect("/onboarding");
  }

  await rerunInsightsForBusiness(business.id);

  revalidatePath("/dashboard");
  revalidatePath("/prompts");
  revalidatePath("/competitors");
  revalidatePath("/sources");
  revalidatePath("/recommendations");
  revalidatePath("/reports");
}

export async function updateBusinessSettingsAction(formData: FormData) {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    redirect("/onboarding");
  }

  const parsed = onboardingSchema.parse({
    businessName: formData.get("businessName"),
    websiteDomain: formData.get("websiteDomain"),
    industry: formData.get("industry"),
    category: formData.get("category"),
    description: formData.get("description"),
    states: formData.get("states"),
    locations: formData.get("locations"),
    productsServices: formData.get("productsServices"),
    competitors: formData.get("competitors"),
    customerKeywords: formData.get("customerKeywords"),
  });

  const nextSlugBase = slugify(parsed.businessName);
  const slugCount = await prisma.business.count({
    where: {
      slug: {
        startsWith: nextSlugBase,
      },
      NOT: {
        id: business.id,
      },
    },
  });

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: parsed.businessName,
      slug: slugCount ? `${nextSlugBase}-${slugCount + 1}` : nextSlugBase,
      websiteDomain: normaliseDomain(parsed.websiteDomain),
      industry: parsed.industry,
      category: parsed.category,
      description: parsed.description,
      australianStates: splitLines(parsed.states),
      targetLocations: splitLines(parsed.locations),
      productsServices: splitLines(parsed.productsServices),
      customerKeywords: splitLines(parsed.customerKeywords),
    },
  });

  await prisma.competitor.deleteMany({
    where: { businessId: business.id },
  });
  const competitorNames = splitLines(parsed.competitors ?? "");
  if (competitorNames.length) {
    await prisma.competitor.createMany({
      data: competitorNames.map((name) => ({
        businessId: business.id,
        name,
        websiteDomain: `${slugify(name)}.com.au`,
        locationsServed: splitLines(parsed.locations).slice(0, 2),
      })),
    });
  }

  await rerunInsightsForBusiness(business.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

async function rerunInsightsForBusiness(businessId: string) {
  await runMockEnginesForBusiness(businessId);
  const scores = await refreshBusinessSnapshot(businessId);
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });
  await refreshRecommendations({ business, scores });
}
