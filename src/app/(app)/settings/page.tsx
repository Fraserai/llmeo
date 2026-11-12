import { SettingsForm } from "@/components/forms/inline-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/server/auth/session";

export default async function SettingsPage() {
  const { business } = await requireWorkspaceContext();

  if (!business) {
    return null;
  }

  const competitors = await prisma.competitor.findMany({
    where: { businessId: business.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Update your business profile, target locations, services, keywords, and competitor set."
      />

      <Card className="border-white/70 bg-white/90">
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            business={business}
            competitors={competitors.map((competitor) => competitor.name)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
