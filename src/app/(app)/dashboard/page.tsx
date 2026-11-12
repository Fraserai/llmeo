import { format } from "date-fns";
import Link from "next/link";

import { StatCard } from "@/components/dashboard/stat-card";
import { VisibilityTrendChart } from "@/components/dashboard/visibility-trend-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { HeaderActionButton, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/server/services/analytics-service";
import { requireWorkspaceContext } from "@/server/auth/session";
import { refreshInsightsAction } from "@/server/actions/workspace-actions";
import { env } from "@/lib/env";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspaceContext();
  const data = await getDashboardData(workspace.id);

  if (!data) {
    return (
      <EmptyState
        title="No business profile found"
        description="Finish onboarding to create your first AI visibility baseline."
      />
    );
  }

  const trend = data.business.snapshots.map((snapshot) => ({
    label: format(snapshot.createdAt, "d MMM"),
    visibilityScore: snapshot.visibilityScore,
    opportunityScore: snapshot.opportunityScore,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`${data.business.name} AI visibility`}
        description="A transparent MVP scoring model built from AI answer presence, recommendation signals, rankings, sources, category spread, and competitor share-of-visibility."
        action={
          env.LLMEO_USE_MOCK_ENGINES ? (
            <form action={refreshInsightsAction}>
              <HeaderActionButton type="submit">Refresh local mock runs</HeaderActionButton>
            </form>
          ) : (
            <Link href="/audit" className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
              Run new audit
            </Link>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="AI visibility score" value={String(data.scores.visibilityScore)} change={8} helper="Weighted across presence, ranking, citations, share, and category coverage." />
        <StatCard label="Prompt coverage" value={`${data.scores.promptCoverage}%`} change={4} helper="Coverage across local, best-of, trust, comparison, category, and solution-selection prompts." />
        <StatCard label="Competitor gap score" value={String(data.scores.competitorGapScore)} change={-5} helper="How often competitors appear where your business does not." />
        <StatCard label="Opportunity score" value={String(data.scores.opportunityScore)} change={-6} helper="Higher means the missed prompt clusters are commercially valuable to improve." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle className="text-xl">Trend over time</CardTitle>
          </CardHeader>
          <CardContent>
            <VisibilityTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle className="text-xl">Recommendations snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.business.recommendations.slice(0, 3).map((recommendation) => (
              <div key={recommendation.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{recommendation.title}</p>
                  <Badge variant={recommendation.priority === "HIGH" ? "default" : "secondary"}>
                    {recommendation.priority.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Top competitors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topCompetitors.map((competitor) => (
              <div key={competitor.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-medium text-slate-900">{competitor.name}</span>
                <span className="text-sm text-slate-500">{competitor.mentions} mentions</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Source overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topSources.map((source) => (
              <div key={source.domain} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-medium text-slate-900">{source.domain}</span>
                <span className="text-sm text-slate-500">{source.count} citations</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Prompt category wins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categoryPerformance.map((category) => (
              <div key={category.name} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{category.name}</span>
                  <span className="text-sm text-slate-500">
                    {category.wins} wins / {category.misses} misses
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
