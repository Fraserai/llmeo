import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/server/auth/session";

export default async function SourcesPage() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    return null;
  }

  const sources = await prisma.citationSource.findMany({
    where: {
      promptResult: {
        promptRun: {
          businessId: business.id,
        },
      },
    },
    include: {
      promptResult: {
        include: {
          promptRun: {
            include: {
              prompt: true,
              engine: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = Object.entries(
    sources.reduce<Record<string, { domain: string; count: number; latestTitle: string | null }>>((acc, source) => {
      if (!acc[source.domain]) {
        acc[source.domain] = { domain: source.domain, count: 0, latestTitle: source.title };
      }
      acc[source.domain].count += 1;
      acc[source.domain].latestTitle = source.title;
      return acc;
    }, {}),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sources"
        title="Citations and source presence"
        description="See which websites and directories AI systems appear to rely on when they mention your business or your competitors."
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Top citation domains</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped.slice(0, 8).map((source) => (
              <div key={source.domain} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900">{source.domain}</span>
                  <span className="text-sm text-slate-500">{source.count} mentions</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{source.latestTitle}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Recent prompt-level citations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Engine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.slice(0, 12).map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium text-slate-900">{source.domain}</TableCell>
                    <TableCell className="max-w-[420px] whitespace-normal text-slate-600">
                      {source.promptResult.promptRun.prompt.text}
                    </TableCell>
                    <TableCell>{source.promptResult.promptRun.engine.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
