import { ArrowRight, Globe2, ShieldCheck } from "lucide-react";

import { AuditShell, GlassCard, PrimaryButton, StepPill } from "@/components/audit/audit-ui";
import { createAuditAction } from "@/server/actions/audit-actions";

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <AuditShell contentClassName="items-center justify-center px-5 pb-16 pt-4" step={1}>
      <GlassCard className="w-full max-w-[1180px] px-7 py-9 sm:px-12 sm:py-12 lg:px-24 lg:py-[72px]">
        <form action={createAuditAction} className="flex min-h-[520px] flex-col">
          <div className="space-y-4">
            <StepPill>Step 1 of 4</StepPill>
            <div className="space-y-3">
              <h1 className="text-[38px] font-extrabold leading-tight tracking-[-0.04em] text-[#08122f] sm:text-[48px]">
                Enter your website
              </h1>
              <p className="text-lg leading-7 text-[#627091]">
                We&apos;ll analyze your homepage to understand your business.
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-[1000px]">
            <label className="sr-only" htmlFor="websiteUrl">
              Website
            </label>
            <div className="relative">
              <Globe2 className="absolute left-7 top-1/2 size-7 -translate-y-1/2 text-[#65708c]" />
              <input
                autoComplete="url"
                className="h-[82px] w-full rounded-[22px] border border-[#dbe3f2] bg-white/72 pl-20 pr-6 text-xl font-semibold text-[#08122f] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] outline-none transition placeholder:text-[#7f89a5] focus:border-[#8e99ff] focus:ring-4 focus:ring-[#6574ff]/15"
                id="websiteUrl"
                name="websiteUrl"
                placeholder="https://www.yourbusiness.com.au"
                required
                type="url"
              />
            </div>

            <div className="mt-8 flex items-start gap-4 text-base font-medium text-[#65708c]">
              <ShieldCheck className="mt-0.5 size-6 shrink-0" />
              <p>We only scan your homepage. No login required.</p>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-[#f5c7cf] bg-[#fff5f7] px-5 py-4 text-sm font-medium text-[#b42845]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="mt-auto flex justify-end pt-12">
            <PrimaryButton className="h-20 rounded-[22px] px-10 text-xl">
              Continue
              <ArrowRight className="size-6" />
            </PrimaryButton>
          </div>
        </form>
      </GlassCard>
    </AuditShell>
  );
}
