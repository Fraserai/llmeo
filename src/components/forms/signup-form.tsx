"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PrimaryButton, TextInput } from "@/components/audit/audit-ui";

type AuditSummary = {
  mentions: string;
  recommendations: string;
  topCompetitor: string;
};

export function SignupForm({
  auditSummary,
  auditToken,
}: {
  auditSummary?: AuditSummary;
  auditToken?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSavingAudit = Boolean(auditToken);

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const companyName = String(formData.get("workspaceName") ?? "");
    const name = isSavingAudit ? email.split("@")[0] || companyName : String(formData.get("name") ?? "");

    const payload = {
      name,
      email,
      password: String(formData.get("password") ?? ""),
      workspaceName: companyName,
      auditToken,
    };

    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "We could not create your account.");
        return;
      }

      await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      router.push(auditToken ? "/dashboard" : "/onboarding");
      router.refresh();
    });
  }

  return (
    <section className="w-full max-w-[520px] rounded-[30px] border border-[#dfe5f3]/80 bg-white/74 p-7 shadow-[0_28px_90px_-64px_rgba(36,52,105,0.8)] backdrop-blur-2xl sm:p-9">
      <div className="space-y-3">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.04em] text-[#08122f]">
          {isSavingAudit ? "Save your audit" : "Create your workspace"}
        </h1>
        <p className="text-base leading-7 text-[#627091]">
          {isSavingAudit
            ? "Create an account to keep this report and run future audits."
            : "Create an account to start tracking AI visibility."}
        </p>
      </div>

      {auditSummary ? (
        <div className="mt-7 grid gap-3 rounded-[22px] border border-[#e1e7f4] bg-white/62 p-4 text-sm font-semibold text-[#65708c]">
          <SummaryLine label="AI mentions" value={auditSummary.mentions} />
          <SummaryLine label="AI recommendations" value={auditSummary.recommendations} />
          <SummaryLine label="Top competitor" value={auditSummary.topCompetitor} />
        </div>
      ) : null}

      <form action={onSubmit} className="mt-7 space-y-5">
        {!isSavingAudit ? (
          <Field label="Your name" name="name" placeholder="Olivia Harper" required />
        ) : null}
        <Field
          label={isSavingAudit ? "Company name" : "Workspace name"}
          name="workspaceName"
          placeholder={isSavingAudit ? "Your business" : "Southern Coast Workspace"}
          required
        />
        <Field label={isSavingAudit ? "Work email" : "Email"} name="email" placeholder="founder@yourbusiness.com.au" required type="email" />
        <Field label="Password" name="password" placeholder="Minimum 8 characters" required type="password" />

        {error ? <p className="rounded-2xl bg-[#fff5f7] px-4 py-3 text-sm font-medium text-[#b42845]">{error}</p> : null}

        <PrimaryButton className="h-[58px] w-full rounded-[18px]" disabled={isPending}>
          {isPending ? "Creating account..." : isSavingAudit ? "Create account" : "Create account"}
          {!isPending ? <ArrowRight className="size-5" /> : null}
        </PrimaryButton>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-[#65708c]">
        {auditToken ? (
          <Link href={`/audit/${auditToken}`} className="underline-offset-4 hover:underline">
            Maybe later
          </Link>
        ) : null}
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#08122f] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-2.5">
      <label className="text-sm font-semibold text-[#101936]" htmlFor={name}>
        {label}
      </label>
      <TextInput id={name} name={name} placeholder={placeholder} required={required} type={type} />
    </div>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-extrabold text-[#08122f]">{value}</span>
    </div>
  );
}
