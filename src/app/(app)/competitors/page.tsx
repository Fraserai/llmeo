import { AddCompetitorForm } from "@/components/forms/inline-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/server/auth/session";

export default async function CompetitorsPage() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    return null;
  }

  const [competitors, mentions, promptRuns] = await Promise.all([
    prisma.competitor.findMany({
      where: { businessId: business.id },
      orderBy: { name: "asc" },
    }),
    prisma.mention.findMany({
      where: {
        promptResult: {
          promptRun: {
            businessId: business.id,
          },
        },
        mentionType: "COMPETITOR",
      },
    }),
    prisma.promptRun.findMany({
      where: { businessId: business.id, competitorAppeared: true },
    }),
  ]);

  const competitorRows = competitors.map((competitor) => {
    const frequency = mentions.filter((mention) => mention.name === competitor.name).length;
    return {
      ...competitor,
      frequency,
      share: promptRuns.length ? Math.round((frequency / promptRuns.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Competitors"
        title="Competitor tracking"
        description="Track which Australian competitors show up in AI answers, how often they outrank you, and where they are strongest."
      />

      <AddCompetitorForm />

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Share-of-visibility summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Mention frequency</TableHead>
                <TableHead>Share of visibility</TableHead>
                <TableHead>Where they win</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitorRows.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell className="font-medium text-slate-900">{competitor.name}</TableCell>
                  <TableCell className="text-slate-600">{competitor.websiteDomain ?? "n/a"}</TableCell>
                  <TableCell>{competitor.frequency}</TableCell>
                  <TableCell>{competitor.share}%</TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-slate-600">
                    Competitors with repeated mentions tend to win on trust, best-of, and local landing page depth.
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
