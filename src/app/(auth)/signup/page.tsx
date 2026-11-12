import { redirect } from "next/navigation";

import { SignupForm } from "@/components/forms/signup-form";
import { getServerAuthSession } from "@/server/auth/session";
import { getAuditForToken } from "@/server/services/audit-service";
import type { AuditReport } from "@/server/services/audit-types";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ audit?: string }>;
}) {
  const session = await getServerAuthSession();
  const params = await searchParams;

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const audit = params?.audit ? await getAuditForToken(params.audit) : null;
  const report = audit?.reportJson as AuditReport | null | undefined;

  return (
    <SignupForm
      auditSummary={
        report
          ? {
              mentions: `${report.mentionedCount}/${report.totalTests}`,
              recommendations: `${report.recommendedCount}/${report.totalTests}`,
              topCompetitor: report.topCompetitor ?? "None yet",
            }
          : undefined
      }
      auditToken={params?.audit}
    />
  );
}
