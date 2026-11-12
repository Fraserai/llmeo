import { format } from "date-fns";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireWorkspaceContext } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    return null;
  }

  const [reports, snapshots] = await Promise.all([
    prisma.report.findMany({
      where: { businessId: business.id },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.visibilitySnapshot.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Business summary and history"
        description="Clean report surfaces suitable for PDF export later, with trend history and concise summaries that a non-technical business owner can understand."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Generated reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{report.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {format(report.periodStart, "d MMM yyyy")} to {format(report.periodEnd, "d MMM yyyy")}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {report.status.toLowerCase()}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{report.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90">
          <CardHeader>
            <CardTitle>Snapshot history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead>Opportunity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>{format(snapshot.createdAt, "d MMM yyyy")}</TableCell>
                    <TableCell>{snapshot.visibilityScore}</TableCell>
                    <TableCell>{snapshot.competitorGapScore}</TableCell>
                    <TableCell>{snapshot.opportunityScore}</TableCell>
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
