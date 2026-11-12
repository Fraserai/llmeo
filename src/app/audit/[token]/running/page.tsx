import { redirect, notFound } from "next/navigation";

import { AuditShell } from "@/components/audit/audit-ui";
import { RunningAuditClient } from "@/components/audit/running-audit-client";
import { getAuditForToken, profileFromAudit, promptPlanFromAudit } from "@/server/services/audit-service";

export default async function AuditRunningPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const audit = await getAuditForToken(token);

  if (!audit) {
    notFound();
  }

  if (["completed", "completed_partial", "failed"].includes(audit.status) && audit.reportJson) {
    redirect(`/audit/${token}`);
  }

  const profile = profileFromAudit(audit.editedProfileJson) ?? profileFromAudit(audit.inferredProfileJson);

  if (!profile) {
    notFound();
  }

  const promptCount = promptPlanFromAudit(audit.promptPlanJson).length || 12;
  const engineCount = 2;

  return (
    <AuditShell action="sign-in" contentClassName="min-h-0" step={3}>
      <RunningAuditClient token={token} totalTests={promptCount * engineCount} />
    </AuditShell>
  );
}
