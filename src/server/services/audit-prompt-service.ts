import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";
import type { AuditProfile, AuditPromptPlanItem, AuditPromptCategory } from "@/server/services/audit-types";

type PromptBlueprint = {
  category: AuditPromptCategory;
  text: string;
};

export function generateAuditPromptPlan(profile: AuditProfile) {
  const location = profile.locations[0] ?? "Australia";
  const secondaryLocation = profile.locations[1] ?? location;
  const category = profile.category || profile.industry || "business";
  const services = profile.productsServices.length ? profile.productsServices : [category];
  const primaryService = services[0] ?? category;
  const secondaryService = services[1] ?? primaryService;
  const competitor = profile.competitors[0];
  const secondCompetitor = profile.competitors[1];

  const prompts: PromptBlueprint[] = [
    {
      category: "local_discovery",
      text: `Who are the best ${category.toLowerCase()} businesses in ${location}?`,
    },
    {
      category: "local_discovery",
      text: `Which businesses offer ${primaryService.toLowerCase()} in ${secondaryLocation}?`,
    },
    {
      category: "best_top",
      text: `Best ${category.toLowerCase()} providers in ${location} for ${primaryService.toLowerCase()}`,
    },
    {
      category: "best_top",
      text: `Top ${profile.industry.toLowerCase()} businesses in Australia for ${secondaryService.toLowerCase()}`,
    },
    {
      category: "problem_solution",
      text: `Who should I use for ${primaryService.toLowerCase()} in ${location}?`,
    },
    {
      category: "problem_solution",
      text: `What business can help with ${secondaryService.toLowerCase()} near ${secondaryLocation}?`,
    },
    {
      category: "comparison",
      text: competitor
        ? `${profile.businessName} vs ${competitor} for ${primaryService.toLowerCase()}`
        : `Which ${category.toLowerCase()} business should I choose in ${location}?`,
    },
    {
      category: "comparison",
      text:
        competitor && secondCompetitor
          ? `Who is better for ${primaryService.toLowerCase()}: ${profile.businessName}, ${competitor}, or ${secondCompetitor}?`
          : `How does ${profile.businessName} compare with other ${category.toLowerCase()} providers?`,
    },
    {
      category: "trust_validation",
      text: `Is ${profile.businessName} a trusted option for ${primaryService.toLowerCase()}?`,
    },
    {
      category: "trust_validation",
      text: `Which ${category.toLowerCase()} business in ${location} has the best reputation?`,
    },
    {
      category: "category_specific",
      text: `Which businesses are known for ${primaryService.toLowerCase()} and ${secondaryService.toLowerCase()}?`,
    },
    {
      category: "category_specific",
      text: `What are the leading ${category.toLowerCase()} providers serving ${location}?`,
    },
    ...profile.customerKeywords.slice(0, 6).map((keyword) => ({
      category: "category_specific" as const,
      text: `Which businesses show up for "${keyword}" when customers ask AI?`,
    })),
  ];

  return uniquePromptPlan(prompts).slice(0, env.LLMEO_MAX_AUDIT_PROMPTS).map((prompt, index) => ({
    id: `${prompt.category}-${index + 1}-${slugify(prompt.text).slice(0, 24)}`,
    ...prompt,
  }));
}

function uniquePromptPlan(prompts: PromptBlueprint[]): PromptBlueprint[] {
  const seen = new Set<string>();

  return prompts.filter((prompt) => {
    const key = prompt.text.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }) as AuditPromptPlanItem[];
}
