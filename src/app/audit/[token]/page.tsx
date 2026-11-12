import { redirect, notFound } from "next/navigation";
import type { ComponentType } from "react";
import { ArrowLeft, Download, ExternalLink, MessageCircle, Search, Star, Trophy } from "lucide-react";

import {
  AuditShell,
  GlassCard,
  IconBubble,
  PrimaryLink,
  SecondaryLink,
  StepPill,
} from "@/components/audit/audit-ui";
import { cn } from "@/lib/utils";
import { getAuditForToken, profileFromAudit } from "@/server/services/audit-service";
import { jsonStringArray } from "@/server/services/audit-report-service";
import type { AuditReport, AuditSource } from "@/server/services/audit-types";

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const audit = await getAuditForToken(token);

  if (!audit) {
    notFound();
  }

  if (["running_tests", "analyzing_results"].includes(audit.status)) {
    redirect(`/audit/${token}/running`);
  }

  if (["created", "ingesting_homepage", "profile_ready"].includes(audit.status)) {
    redirect(`/audit/${token}/review`);
  }

  const profile = profileFromAudit(audit.editedProfileJson) ?? profileFromAudit(audit.inferredProfileJson);
  const report = audit.reportJson as AuditReport | null;

  if (!profile) {
    notFound();
  }

  if (!report) {
    return (
      <AuditShell action="sign-in" contentClassName="items-center justify-center px-5 pb-16" step={4}>
        <GlassCard className="w-full max-w-[880px] p-8 text-center sm:p-12">
          <StepPill>Step 4 of 4</StepPill>
          <h1 className="mt-7 text-[38px] font-extrabold tracking-[-0.04em] text-[#08122f]">
            We couldn&apos;t complete the audit.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-[#627091]">Please try again from the review step.</p>
          <div className="mt-8 flex justify-center">
            <SecondaryLink href={`/audit/${token}/review`}>
              <ArrowLeft className="size-4" />
              Back
            </SecondaryLink>
          </div>
        </GlassCard>
      </AuditShell>
    );
  }

  const missingKeys = audit.results.some((result) => result.error?.includes("API_KEY is not configured"));
  const explanation = buildExplanation(report);

  return (
    <AuditShell action="sign-in" contentClassName="items-center justify-center px-5 pb-14 pt-3" step={4}>
      <GlassCard className="w-full max-w-[1120px] px-7 py-9 sm:px-10 sm:py-10 lg:px-16 lg:py-14">
        <div className="space-y-4">
          <StepPill>Step 4 of 4</StepPill>
          <div className="space-y-3">
            <h1 className="text-[40px] font-extrabold leading-tight tracking-[-0.045em] text-[#08122f] sm:text-[50px]">
              Your AI Visibility Report
            </h1>
            <p className="text-lg leading-7 text-[#627091]">Here&apos;s how ChatGPT and Gemini see your business.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={MessageCircle} label="AI mentions" value={`${report.mentionedCount} / ${report.totalTests}`} />
          <MetricCard icon={Star} label="AI recommendations" value={`${report.recommendedCount} / ${report.totalTests}`} />
          <MetricCard icon={Trophy} label="Top competitor" value={report.topCompetitor ?? "None yet"} />
          <MetricCard icon={Search} label="Missed opportunities" value={String(report.missedHighIntentPrompts)} />
        </div>

        {audit.status === "completed_partial" || report.failedTests > 0 ? (
          <div className="mt-7 rounded-2xl border border-[#e4e9f5] bg-white/62 px-5 py-4 text-sm font-medium text-[#65708c]">
            Some tests were unavailable, so this report is based on the completed results.
          </div>
        ) : null}

        {missingKeys ? (
          <div className="mt-4 rounded-2xl border border-[#f3d1a6] bg-[#fff8ed] px-5 py-4 text-sm font-semibold text-[#9b6221]">
            OpenAI or Gemini API keys are missing. Add them to your .env to run live audits.
          </div>
        ) : null}

        <section className="mt-9 space-y-5">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-[#08122f]">What this means</h2>
          <div className="space-y-4">
            {explanation.map((item) => {
              const Icon = item.icon;
              return (
                <div className="flex items-start gap-4 text-base leading-7 text-[#65708c]" key={item.text}>
                  <Icon className="mt-1 size-5 shrink-0 text-[#65708c]" />
                  <p>{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <details className="group mt-8 rounded-[24px] border border-[#e1e7f4] bg-white/52 p-5">
          <summary className="cursor-pointer list-none text-base font-bold text-[#5261ff] outline-none marker:hidden">
            <span className="inline-flex items-center gap-2">
              View test details
              <span className="text-[#8b94ae] transition group-open:rotate-90">→</span>
            </span>
          </summary>
          <div className="mt-5 grid gap-4">
            {audit.results.map((result) => (
              <ResultDetailRow key={result.id} result={result} />
            ))}
          </div>
        </details>

        <div className="mt-10 flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
          <SecondaryLink href={`/audit/${token}/review`}>
            <ArrowLeft className="size-4" />
            Back
          </SecondaryLink>
          <PrimaryLink href={`/signup?audit=${token}`} className="h-[68px] rounded-[18px] px-8 text-lg">
            Save this audit
            <Download className="size-5" />
          </PrimaryLink>
        </div>
      </GlassCard>
    </AuditShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-[210px] rounded-[22px] border border-[#dfe5f3] bg-white/56 p-7 shadow-[0_22px_70px_-54px_rgba(36,52,105,0.65)] backdrop-blur-xl">
      <IconBubble icon={icon} />
      <p className="mt-7 text-base font-medium text-[#65708c]">{label}</p>
      <p className="mt-4 break-words text-[34px] font-extrabold leading-tight tracking-[-0.04em] text-[#08122f]">{value}</p>
    </div>
  );
}

function ResultDetailRow({
  result,
}: {
  result: {
    prompt: string;
    promptCategory: string;
    engine: string;
    answerExcerpt: string | null;
    targetMentioned: boolean | null;
    targetRecommended: boolean | null;
    competitorsMentionedJson: unknown;
    sourcesJson: unknown;
    sourceStatus: string;
    error: string | null;
  };
}) {
  const competitors = jsonStringArray(result.competitorsMentionedJson);
  const sources = sourcesFromJson(result.sourcesJson);

  return (
    <article className="rounded-[20px] border border-[#e1e7f4] bg-white/62 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#f1f4fb] px-3 py-1 text-xs font-bold text-[#65708c]">{categoryLabel(result.promptCategory)}</span>
          <span className="rounded-full bg-[#ecebff] px-3 py-1 text-xs font-bold text-[#5261ff]">{engineLabel(result.engine)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill active={Boolean(result.targetMentioned)} label="Mentioned" />
          <StatusPill active={Boolean(result.targetRecommended)} label="Recommended" />
        </div>
      </div>
      <p className="mt-4 font-semibold leading-6 text-[#101936]">{result.prompt}</p>
      <p className={cn("mt-3 text-sm leading-6", result.error ? "text-[#b42845]" : "text-[#65708c]")}>
        {result.answerExcerpt ?? friendlyError(result.error)}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#65708c]">
        {competitors.length ? <span>Competitors: {competitors.slice(0, 3).join(", ")}</span> : null}
        <span>{sourceStatusLabel(result.sourceStatus)}</span>
        {sources.slice(0, 2).map((source) => (
          <a
            className="inline-flex items-center gap-1 text-[#5261ff]"
            href={source.url ?? `https://${source.domain}`}
            key={`${source.domain}-${source.url ?? ""}`}
            rel="noreferrer"
            target="_blank"
          >
            {source.domain}
            <ExternalLink className="size-3" />
          </a>
        ))}
      </div>
    </article>
  );
}

function StatusPill({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold",
        active ? "bg-[#e8fbf5] text-[#23896f]" : "bg-[#f1f4fb] text-[#7b86a3]",
      )}
    >
      {active ? label : `Not ${label.toLowerCase()}`}
    </span>
  );
}

function buildExplanation(report: AuditReport) {
  const visibility =
    report.mentionedCount === 0
      ? "You are not appearing yet in completed AI answers."
      : report.mentionedCount < Math.max(2, report.totalTests / 2)
        ? "You appear occasionally in AI answers."
        : "You appear regularly in AI answers.";

  return [
    {
      icon: MessageCircle,
      text: visibility,
    },
    {
      icon: Star,
      text: report.topCompetitor ? "Competitors are recommended more often." : "No clear competitor dominated this audit.",
    },
    {
      icon: Search,
      text:
        report.missedHighIntentPrompts > 0
          ? "You're missing from several high-intent local prompts."
          : "You are covering the strongest local prompts in this audit.",
    },
  ];
}

function friendlyError(error: string | null) {
  if (!error) {
    return "No answer was captured for this test.";
  }

  if (error.includes("API_KEY")) {
    return "This engine is unavailable because an API key is missing.";
  }

  return "This test was unavailable.";
}

function engineLabel(engine: string) {
  return engine.includes("gemini") ? "Gemini" : engine.includes("openai") || engine.includes("chatgpt") ? "ChatGPT" : engine;
}

function categoryLabel(category: string) {
  return category.replace(/_/g, " ");
}

function sourceStatusLabel(status: string) {
  switch (status) {
    case "sources_returned":
      return "Sources returned";
    case "no_sources_returned":
      return "No sources returned";
    case "grounding_unavailable":
      return "Grounding unavailable";
    default:
      return "Engine unavailable";
  }
}

function sourcesFromJson(value: unknown): AuditSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((source) => {
      const candidate = source as { domain?: unknown; url?: unknown; title?: unknown };
      return typeof candidate.domain === "string"
        ? {
            domain: candidate.domain,
            url: typeof candidate.url === "string" ? candidate.url : null,
            title: typeof candidate.title === "string" ? candidate.title : null,
          }
        : null;
    })
    .filter((source): source is AuditSource => Boolean(source));
}
