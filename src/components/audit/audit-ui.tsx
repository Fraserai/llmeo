import type { ComponentProps, ComponentType, ReactNode } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = ["Website", "Review", "Running audit", "Results"] as const;

export function AuditShell({
  children,
  step,
  action = "sign-in",
  className,
  contentClassName,
}: {
  children: ReactNode;
  step?: number;
  action?: "sign-in" | "exit" | "none";
  className?: string;
  contentClassName?: string;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7ff] p-3 text-[#08122f] sm:p-5 lg:p-8">
      <div
        className={cn(
          "relative mx-auto flex min-h-[calc(100vh-24px)] max-w-[1500px] flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/58 shadow-[0_34px_120px_-72px_rgba(48,66,132,0.7)] backdrop-blur-2xl sm:min-h-[calc(100vh-40px)] lg:min-h-[calc(100vh-64px)] lg:rounded-[36px]",
          className,
        )}
      >
        <div className="pointer-events-none absolute -right-44 top-32 h-[720px] w-[720px] rounded-full border border-[#cbd6ff]/60 bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.96),rgba(225,230,255,0.44)_42%,rgba(255,255,255,0.06)_72%)] shadow-[inset_0_0_48px_rgba(255,255,255,0.95),0_36px_120px_rgba(91,105,230,0.16)] blur-[0.2px]" />
        <div className="pointer-events-none absolute -bottom-48 left-[34%] h-[420px] w-[640px] rotate-[-14deg] rounded-[999px] border border-white/60 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(107,121,255,0.13),rgba(255,255,255,0.16))] blur-[1px]" />

        <header className="relative z-10 flex items-start justify-between gap-4 px-6 py-5 sm:px-9 lg:px-11 lg:py-8">
          <Link href="/" className="text-3xl font-extrabold tracking-[-0.045em] text-[#061231] sm:text-[34px]">
            LLMEO
          </Link>

          {step ? (
            <div className="hidden flex-1 justify-center px-8 pt-1 lg:flex">
              <AuditStepper currentStep={step} />
            </div>
          ) : null}

          {action === "none" ? (
            <div className="h-12 w-24" />
          ) : (
            <Link href={action === "exit" ? "/" : "/login"} className={secondaryButtonClass("h-12 px-7")}>
              {action === "exit" ? "Exit" : "Sign in"}
            </Link>
          )}
        </header>

        {step ? (
          <div className="relative z-10 px-4 pb-4 lg:hidden">
            <AuditStepper currentStep={step} />
          </div>
        ) : null}

        <div className={cn("relative z-10 flex flex-1 flex-col", contentClassName)}>{children}</div>
      </div>
    </main>
  );
}

export function AuditStepper({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Audit progress" className="w-full overflow-x-auto">
      <ol className="mx-auto flex w-max items-center justify-center gap-3 px-2 text-sm font-semibold text-[#6b7594] sm:gap-4">
        {steps.map((label, index) => {
          const number = index + 1;
          const isComplete = number < currentStep;
          const isActive = number === currentStep;

          return (
            <li key={label} className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm transition",
                    isActive &&
                      "border-transparent bg-[linear-gradient(135deg,#6d7cff,#4c50f6)] text-white shadow-[0_12px_30px_-16px_rgba(76,80,246,0.9)]",
                    isComplete && "border-[#d9dfec] bg-[#eef2f8] text-[#667396]",
                    !isActive && !isComplete && "border-[#dfe4ef] bg-[#f2f5fb] text-[#65708c]",
                  )}
                >
                  {isComplete ? <Check className="size-4" strokeWidth={2.5} /> : number}
                </span>
                <span className={cn("whitespace-nowrap", isActive && "text-[#4d5cff]")}>{label}</span>
              </div>
              {number < steps.length ? <span className="h-px w-10 bg-[#dfe4ef] sm:w-12" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[30px] border border-[#dfe5f3]/80 bg-white/70 shadow-[0_28px_90px_-64px_rgba(36,52,105,0.8)] backdrop-blur-2xl",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StepPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex w-fit items-center rounded-full bg-[#ecebff] px-4 py-2 text-sm font-semibold text-[#5261ff]">
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  type = "submit",
  disabled,
}: {
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(primaryButtonClass(), disabled && "cursor-not-allowed opacity-60", className)}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}

export function PrimaryLink({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(primaryButtonClass(), className)}>
      {children}
    </Link>
  );
}

export function SecondaryLink({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={secondaryButtonClass(className)}>
      {children}
    </Link>
  );
}

export function primaryButtonClass(className?: string) {
  return cn(
    "inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[linear-gradient(135deg,#6d7cff,#4b4df4)] px-7 text-base font-semibold text-white shadow-[0_18px_42px_-22px_rgba(75,77,244,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_-26px_rgba(75,77,244,0.95)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6977ff]/25",
    className,
  );
}

export function secondaryButtonClass(className?: string) {
  return cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dfe5f2] bg-white/62 px-6 text-sm font-semibold text-[#08122f] shadow-[0_16px_44px_-34px_rgba(36,52,105,0.6)] backdrop-blur-xl transition hover:bg-white/86 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6977ff]/18",
    className,
  );
}

export function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <label className="text-sm font-semibold text-[#101936]" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-[#dce3f1] bg-white/74 px-4 text-base text-[#101936] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-[#98a1ba] focus:border-[#8f99ff] focus:ring-4 focus:ring-[#6574ff]/15",
        className,
      )}
      {...props}
    />
  );
}

export function IconBubble({
  icon: Icon,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <span className={cn("flex size-14 items-center justify-center rounded-full bg-[#f0f2fb] text-[#5060ff]", className)}>
      <Icon className="size-6" />
    </span>
  );
}

export function MiniBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#ecebff] px-4 py-2 text-sm font-semibold text-[#5261ff]">
      <Sparkles className="size-4" />
      {children}
    </span>
  );
}
