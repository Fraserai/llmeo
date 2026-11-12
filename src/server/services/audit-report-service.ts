import type { VisibilityAuditResult } from "@prisma/client";

import type { AuditProfile, AuditReport } from "@/server/services/audit-types";

const HIGH_INTENT_CATEGORIES = new Set(["local_discovery", "best_top", "problem_solution"]);

export function buildAuditReport({
  profile,
  results,
}: {
  profile: AuditProfile;
  results: VisibilityAuditResult[];
}): AuditReport {
  const totalTests = results.length;
  const failedTests = results.filter((result) => Boolean(result.error)).length;
  const successfulTests = totalTests - failedTests;
  const mentionedCount = results.filter((result) => result.targetMentioned).length;
  const recommendedCount = results.filter((result) => result.targetRecommended).length;
  const competitorLeaderboard = buildCompetitorLeaderboard(results);

  return {
    generatedAt: new Date().toISOString(),
    businessName: profile.businessName,
    websiteDomain: profile.websiteDomain,
    totalTests,
    successfulTests,
    failedTests,
    mentionedCount,
    recommendedCount,
    topCompetitor: competitorLeaderboard[0]?.name ?? null,
    missedHighIntentPrompts: countMissedHighIntentPrompts(results),
    engineBreakdown: buildEngineBreakdown(results),
    categoryBreakdown: buildCategoryBreakdown(results),
    competitorLeaderboard,
    opportunities: buildOpportunities(profile, results, competitorLeaderboard),
  };
}

function buildEngineBreakdown(results: VisibilityAuditResult[]) {
  const groups = groupBy(results, (result) => result.engine);

  return Object.entries(groups).map(([engine, engineResults]) => ({
    engine,
    total: engineResults.length,
    successful: engineResults.filter((result) => !result.error).length,
    failed: engineResults.filter((result) => Boolean(result.error)).length,
    mentioned: engineResults.filter((result) => result.targetMentioned).length,
    recommended: engineResults.filter((result) => result.targetRecommended).length,
  }));
}

function buildCategoryBreakdown(results: VisibilityAuditResult[]) {
  const groups = groupBy(results, (result) => result.promptCategory);

  return Object.entries(groups).map(([category, categoryResults]) => ({
    category,
    total: categoryResults.length,
    failed: categoryResults.filter((result) => Boolean(result.error)).length,
    mentioned: categoryResults.filter((result) => result.targetMentioned).length,
    recommended: categoryResults.filter((result) => result.targetRecommended).length,
  }));
}

function buildCompetitorLeaderboard(results: VisibilityAuditResult[]) {
  const counts = new Map<string, { name: string; mentions: number; recommendations: number }>();

  for (const result of results) {
    for (const name of jsonStringArray(result.competitorsMentionedJson)) {
      const entry = counts.get(name) ?? { name, mentions: 0, recommendations: 0 };
      entry.mentions += 1;
      counts.set(name, entry);
    }

    for (const name of jsonStringArray(result.competitorsRecommendedJson)) {
      const entry = counts.get(name) ?? { name, mentions: 0, recommendations: 0 };
      entry.recommendations += 1;
      counts.set(name, entry);
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.recommendations - a.recommendations || b.mentions - a.mentions)
    .slice(0, 8);
}

function countMissedHighIntentPrompts(results: VisibilityAuditResult[]) {
  const highIntentGroups = Object.values(
    results
      .filter((result) => HIGH_INTENT_CATEGORIES.has(result.promptCategory))
      .reduce<Record<string, VisibilityAuditResult[]>>((acc, result) => {
        acc[result.prompt] = [...(acc[result.prompt] ?? []), result];
        return acc;
      }, {}),
  );

  return highIntentGroups.filter((group) => {
    const successful = group.filter((result) => !result.error);
    return successful.length > 0 && successful.every((result) => !result.targetMentioned);
  }).length;
}

function buildOpportunities(
  profile: AuditProfile,
  results: VisibilityAuditResult[],
  competitors: { name: string; mentions: number; recommendations: number }[],
) {
  const opportunities = [];
  const localMisses = results.filter(
    (result) => result.promptCategory === "local_discovery" && !result.error && !result.targetMentioned,
  );
  const bestTopMisses = results.filter(
    (result) => result.promptCategory === "best_top" && !result.error && !result.targetRecommended,
  );
  const trustMisses = results.filter(
    (result) => result.promptCategory === "trust_validation" && !result.error && !result.targetRecommended,
  );

  if (localMisses.length) {
    opportunities.push({
      title: "Strengthen local service pages",
      description: `You are missing from some local discovery prompts. Add clearer pages for ${profile.locations.slice(0, 2).join(" and ") || "your target locations"} and connect them to your main services.`,
    });
  }

  if (bestTopMisses.length) {
    opportunities.push({
      title: "Make best-option proof easier to find",
      description: "Add stronger reviews, case studies, service proof, and FAQ content so AI answers have a clearer reason to recommend you.",
    });
  }

  if (competitors[0]) {
    opportunities.push({
      title: `Close the gap with ${competitors[0].name}`,
      description: `${competitors[0].name} appeared most often in this audit. Review which prompts they won and publish comparison or service content that addresses those questions directly.`,
    });
  }

  if (trustMisses.length) {
    opportunities.push({
      title: "Improve trust signals",
      description: "Make testimonials, accreditations, service areas, guarantees, and business details more explicit on your website and third-party profiles.",
    });
  }

  if (!opportunities.length) {
    opportunities.push({
      title: "Protect your current visibility",
      description: "You are already appearing in this audit. Keep business details consistent and expand content around the prompts where you were mentioned but not clearly recommended.",
    });
  }

  return opportunities.slice(0, 3);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});
}

export function jsonStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
