import { normaliseDomain } from "@/lib/utils";
import type { AuditAnalysis, AuditProfile, ProviderAnswer } from "@/server/services/audit-types";

const recommendationPatterns = [
  /\brecommend(?:ed|s)?\b/i,
  /\bstrong choice\b/i,
  /\bgood choice\b/i,
  /\bgood option\b/i,
  /\bsuitable provider\b/i,
  /\btop choice\b/i,
  /\bone of the best\b/i,
  /\bbest options?\b/i,
  /\bconsider\b/i,
  /\bstands out\b/i,
  /\bwell regarded\b/i,
  /\btrusted option\b/i,
  /\bworth contacting\b/i,
  /\bexcellent option\b/i,
];

const weakMentionPatterns = [
  /\bone option\b/i,
  /\bappears to offer\b/i,
  /\bmay offer\b/i,
  /\bcould be an option\b/i,
];

const businessNameIndicators = [
  "Plumbing",
  "Electrical",
  "Electrician",
  "Law",
  "Legal",
  "Lawyers",
  "Accounting",
  "Accountants",
  "Dental",
  "Clinic",
  "Real Estate",
  "Property",
  "Marketing",
  "Agency",
  "Consulting",
  "Solutions",
  "Services",
  "Group",
  "Studio",
  "Builders",
  "Finance",
  "Mortgage",
  "AI",
];

export function analyzeProviderAnswer({
  providerAnswer,
  profile,
}: {
  providerAnswer: ProviderAnswer;
  profile: AuditProfile;
}): AuditAnalysis {
  const rawAnswer = providerAnswer.rawAnswer ?? "";
  const targetNames = buildTargetVariants(profile);
  const targetMentioned = targetNames.some((name) => includesNormalized(rawAnswer, name));
  const targetRecommended = targetMentioned && hasRecommendationContext(rawAnswer, targetNames);
  const competitors = extractCompetitors(rawAnswer, profile, targetNames);
  const competitorsRecommended = competitors.filter((competitor) =>
    hasRecommendationContext(rawAnswer, [competitor]),
  );

  return {
    targetMentioned,
    targetRecommended,
    rankPosition: targetMentioned ? inferRankPosition(rawAnswer, targetNames, competitors) : null,
    competitorsMentioned: competitors,
    competitorsRecommended,
    sentiment: inferSentiment(rawAnswer, targetMentioned, targetRecommended),
    confidence: providerAnswer.error ? 0 : targetMentioned ? 0.82 : 0.72,
  };
}

function buildTargetVariants(profile: AuditProfile) {
  const domainRoot = profile.websiteDomain.split(".")[0] ?? "";
  const variants = [
    profile.businessName,
    profile.websiteDomain,
    normaliseDomain(profile.websiteDomain),
    domainRoot.replace(/[-_]+/g, " "),
    stripCompanySuffix(profile.businessName),
  ];

  return Array.from(new Set(variants.map((variant) => variant.trim()).filter((variant) => variant.length > 2)));
}

function extractCompetitors(rawAnswer: string, profile: AuditProfile, targetNames: string[]) {
  const knownCompetitors = profile.competitors.filter((competitor) => includesNormalized(rawAnswer, competitor));
  const discoveredCompetitors = extractBusinessLikeNames(rawAnswer);

  return Array.from(new Set([...knownCompetitors, ...discoveredCompetitors]))
    .filter((name) => !targetNames.some((target) => normalized(name) === normalized(target)))
    .filter((name) => !targetNames.some((target) => includesNormalized(name, target)))
    .slice(0, 8);
}

function extractBusinessLikeNames(rawAnswer: string) {
  const indicatorPattern = businessNameIndicators.join("|");
  const regex = new RegExp(`\\b([A-Z][A-Za-z&' ]{2,60}(?:${indicatorPattern})(?:\\s(?:Co|Company|Group|Services|Solutions|Pty Ltd|Ltd))?)\\b`, "g");

  return Array.from(rawAnswer.matchAll(regex))
    .map((match) => cleanName(match[1]))
    .filter((name) => name.length >= 4)
    .filter((name) => !/^(The|This|For|Best|Top|Australian)\b/.test(name));
}

function hasRecommendationContext(rawAnswer: string, names: string[]) {
  const sentences = rawAnswer
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.some((sentence) => {
    const containsName = names.some((name) => includesNormalized(sentence, name));
    if (!containsName) {
      return false;
    }

    const hasStrongSignal = recommendationPatterns.some((pattern) => pattern.test(sentence));
    const onlyWeakSignal = weakMentionPatterns.some((pattern) => pattern.test(sentence)) && !hasStrongSignal;

    return hasStrongSignal && !onlyWeakSignal;
  });
}

function inferRankPosition(rawAnswer: string, targetNames: string[], competitors: string[]) {
  const numberedLineRank = targetNames
    .map((name) => {
      const escapedName = escapeRegExp(name);
      const match = rawAnswer.match(new RegExp(`(?:^|\\n)\\s*(\\d{1,2})[.)-]\\s*[^\\n]*${escapedName}`, "i"));
      return match?.[1] ? Number(match[1]) : null;
    })
    .find((rank) => rank !== null);

  if (numberedLineRank) {
    return numberedLineRank;
  }

  const rankedNames = [targetNames[0], ...competitors]
    .filter(Boolean)
    .map((name) => ({ name, index: normalized(rawAnswer).indexOf(normalized(name)) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);

  const targetIndex = rankedNames.findIndex((item) => targetNames.some((name) => normalized(name) === normalized(item.name)));
  return targetIndex >= 0 ? targetIndex + 1 : null;
}

function inferSentiment(rawAnswer: string, targetMentioned: boolean, targetRecommended: boolean) {
  if (!targetMentioned) {
    return "not_mentioned";
  }

  if (targetRecommended) {
    return "positive";
  }

  if (/\b(compare|check reviews|not enough|limited information|unclear)\b/i.test(rawAnswer)) {
    return "mixed";
  }

  return "neutral";
}

function includesNormalized(haystack: string, needle: string) {
  const normalizedNeedle = normalized(needle);

  if (!normalizedNeedle) {
    return false;
  }

  return normalized(haystack).includes(normalizedNeedle);
}

function normalized(value: string) {
  return stripCompanySuffix(value)
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripCompanySuffix(value: string) {
  return value.replace(/\b(pty ltd|pty|ltd|limited|co|company|services|service)\b/gi, "").trim();
}

function cleanName(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
