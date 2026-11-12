import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireWorkspaceContext } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";

export default async function RecommendationsPage() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    return null;
  }

  const recommendations = await prisma.recommendation.findMany({
    where: { businessId: business.id },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Recommendations"
        title="Prioritised action plan"
        description="Recommendations are grouped to help you improve entity clarity, content coverage, source presence, and competitor comparison performance."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {recommendations.map((recommendation) => (
          <Card key={recommendation.id} className="border-white/70 bg-white/90">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl">{recommendation.title}</CardTitle>
                <Badge variant={recommendation.priority === "HIGH" ? "default" : "secondary"}>
                  {recommendation.priority.toLowerCase()}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>{recommendation.type.replace(/_/g, " ")}</span>
                <span>{recommendation.effort.replace(/_/g, " ")}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">{recommendation.description}</p>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Why this matters:</span> {recommendation.rationale}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
