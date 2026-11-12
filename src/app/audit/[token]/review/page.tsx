import { notFound } from "next/navigation";

import { AuditShell } from "@/components/audit/audit-ui";
import { ProfileReviewForm } from "@/components/audit/profile-review-form";
import { getAuditForToken, profileFromAudit } from "@/server/services/audit-service";

export default async function AuditReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const audit = await getAuditForToken(token);

  if (!audit) {
    notFound();
  }

  const profile = profileFromAudit(audit.editedProfileJson) ?? profileFromAudit(audit.inferredProfileJson);

  if (!profile) {
    notFound();
  }

  return (
    <AuditShell action="exit" className="min-h-[calc(100vh-24px)]" contentClassName="min-h-0 border-t border-[#e5eaf5]/80" step={2}>
      <ProfileReviewForm email={audit.email} profile={profile} token={token} />
    </AuditShell>
  );
}
