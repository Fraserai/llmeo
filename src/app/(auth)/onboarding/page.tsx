import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/forms/onboarding-form";
import { requireSession } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await requireSession();

  const business = await prisma.business.findFirst({
    where: { workspaceId: session.user.workspaceId! },
  });

  if (business?.onboardingDone) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Onboarding</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Create your AI visibility baseline</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Tell us about your business, competitors, and service areas. We will generate prompt sets, run visibility analysis, and build your initial dashboard automatically.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
