export const AUDIT_STATUSES = [
  "created",
  "ingesting_homepage",
  "profile_ready",
  "running_tests",
  "analyzing_results",
  "completed",
  "completed_partial",
  "failed",
] as const;

export const AUDIT_PROMPT_CATEGORIES = [
  "local_discovery",
  "best_top",
  "problem_solution",
  "comparison",
  "trust_validation",
  "category_specific",
] as const;

export const AUDIT_SOURCE_STATUSES = [
  "sources_returned",
  "no_sources_returned",
  "grounding_unavailable",
  "engine_error",
] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];
export type AuditPromptCategory = (typeof AUDIT_PROMPT_CATEGORIES)[number];
export type AuditSourceStatus = (typeof AUDIT_SOURCE_STATUSES)[number];

export type AuditProfile = {
  businessName: string;
  websiteUrl: string;
  websiteDomain: string;
  industry: string;
  category: string;
  description: string;
  locations: string[];
  productsServices: string[];
  competitors: string[];
  customerKeywords: string[];
};

export type AuditPromptPlanItem = {
  id: string;
  text: string;
  category: AuditPromptCategory;
};

export type AuditSource = {
  domain: string;
  url?: string | null;
  title?: string | null;
};

export type ProviderAnswer = {
  engine: string;
  model: string;
  rawAnswer: string | null;
  answerExcerpt: string | null;
  sources: AuditSource[];
  sourceStatus: AuditSourceStatus;
  error: string | null;
  latencyMs: number;
};

export type AuditAnalysis = {
  targetMentioned: boolean;
  targetRecommended: boolean;
  rankPosition: number | null;
  competitorsMentioned: string[];
  competitorsRecommended: string[];
  sentiment: string | null;
  confidence: number;
};

export type AuditReport = {
  generatedAt: string;
  businessName: string;
  websiteDomain: string;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  mentionedCount: number;
  recommendedCount: number;
  topCompetitor: string | null;
  missedHighIntentPrompts: number;
  engineBreakdown: {
    engine: string;
    total: number;
    successful: number;
    failed: number;
    mentioned: number;
    recommended: number;
  }[];
  categoryBreakdown: {
    category: AuditPromptCategory | string;
    total: number;
    failed: number;
    mentioned: number;
    recommended: number;
  }[];
  competitorLeaderboard: {
    name: string;
    mentions: number;
    recommendations: number;
  }[];
  opportunities: {
    title: string;
    description: string;
  }[];
};
