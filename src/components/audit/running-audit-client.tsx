"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, RefreshCw, Sparkles } from "lucide-react";

import { PrimaryLink, SecondaryLink } from "@/components/audit/audit-ui";
import { cn } from "@/lib/utils";

type EngineStatus = "Live" | "Complete" | "Unavailable";

export function RunningAuditClient({
  token,
  totalTests,
}: {
  token: string;
  totalTests: number;
}) {
  const router = useRouter();
  const hasStarted = useRef(false);
  const [completed, setCompleted] = useState(0);
  const [requestState, setRequestState] = useState<"running" | "complete" | "failed">("running");
  const [message, setMessage] = useState<string | null>(null);

  const safeTotal = Math.max(totalTests, 1);
  const percent = Math.min(100, Math.round((completed / safeTotal) * 100));
  const openAIStatus: EngineStatus = requestState === "failed" ? "Unavailable" : requestState === "complete" ? "Complete" : "Live";
  const geminiStatus: EngineStatus = requestState === "failed" ? "Unavailable" : requestState === "complete" ? "Complete" : "Live";

  const engineProgress = useMemo(
    () => ({
      openai: requestState === "complete" ? 100 : requestState === "failed" ? 0 : Math.min(92, percent + 18),
      gemini: requestState === "complete" ? 100 : requestState === "failed" ? 0 : Math.min(84, percent + 6),
    }),
    [percent, requestState],
  );

  useEffect(() => {
    if (requestState !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      setCompleted((current) => Math.min(Math.max(safeTotal - 2, 1), current + 1));
    }, 1200);

    return () => window.clearInterval(interval);
  }, [requestState, safeTotal]);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    async function runAudit() {
      try {
        const response = await fetch(`/api/audit/${token}/run`, {
          method: "POST",
        });
        const data = (await response.json()) as { ok?: boolean; message?: string; status?: string };

        if (!response.ok || !data.ok) {
          setMessage(data.message ?? "We couldn't complete the audit. Please try again.");
          setRequestState("failed");
          return;
        }

        if (data.status === "failed") {
          setMessage(data.message ?? "We couldn't complete the audit. Please try again.");
          setCompleted(safeTotal);
          setRequestState("failed");
          return;
        }

        setCompleted(safeTotal);
        setRequestState("complete");
        window.setTimeout(() => {
          router.push(`/audit/${token}`);
          router.refresh();
        }, 900);
      } catch {
        setMessage("We couldn't complete the audit. Please try again.");
        setRequestState("failed");
      }
    }

    void runAudit();
  }, [router, safeTotal, token]);

  if (requestState === "failed") {
    return (
      <div className="mx-auto flex w-full max-w-[1050px] flex-1 items-center px-5 pb-14 pt-6">
        <div className="w-full rounded-[30px] border border-[#dfe5f3]/80 bg-white/72 p-8 text-center shadow-[0_28px_90px_-64px_rgba(36,52,105,0.8)] backdrop-blur-2xl sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#fff1f2] text-[#e05268]">
            <RefreshCw className="size-7" />
          </div>
          <h1 className="mt-7 text-[34px] font-extrabold tracking-[-0.04em] text-[#08122f]">We couldn&apos;t complete the audit.</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-7 text-[#627091]">{message ?? "Please try again."}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <SecondaryLink href={`/audit/${token}/review`}>
              <ArrowLeft className="size-4" />
              Back
            </SecondaryLink>
            <PrimaryLink href={`/audit/${token}/review`}>
              Try again
              <RefreshCw className="size-4" />
            </PrimaryLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-1 items-center px-5 pb-14 pt-4">
      <div className="w-full rounded-[30px] border border-[#dfe5f3]/80 bg-white/72 px-7 py-9 shadow-[0_28px_90px_-64px_rgba(36,52,105,0.8)] backdrop-blur-2xl sm:px-12 sm:py-12 lg:px-20">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-[#ecebff] px-4 py-2 text-sm font-semibold text-[#5261ff]">
            Step 3 of 4
          </div>
          <h1 className="text-[38px] font-extrabold leading-tight tracking-[-0.04em] text-[#08122f] sm:text-[44px]">
            Running your audit
          </h1>
          <p className="text-lg leading-7 text-[#627091]">We&apos;re checking how ChatGPT and Gemini see your business.</p>
        </div>

        <div
          className="mx-auto mt-10 flex size-[210px] items-center justify-center rounded-full bg-[conic-gradient(#6475ff_var(--progress),#edf1f8_0)] p-4 [--progress:75%] sm:size-[250px]"
          style={{ "--progress": `${percent}%` } as CSSProperties}
        >
          <div className="flex size-full flex-col items-center justify-center rounded-full bg-white/92 shadow-[inset_0_0_0_1px_rgba(223,229,243,0.9)]">
            <div className="text-[34px] font-extrabold tracking-[-0.04em] text-[#08122f] sm:text-[40px]">
              {completed} <span className="text-[#7b86a3]">/ {safeTotal}</span>
            </div>
            <div className="mt-1 text-base font-medium text-[#65708c]">tests completed</div>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-[880px] space-y-3">
          <EngineProgressRow icon="chatgpt" label="ChatGPT" progress={engineProgress.openai} status={openAIStatus} />
          <EngineProgressRow icon="gemini" label="Gemini" progress={engineProgress.gemini} status={geminiStatus} />
        </div>

        <p className="mt-8 text-center text-base font-medium text-[#65708c]">
          {requestState === "complete" ? "Your report is ready." : "This usually takes 1-2 minutes."}
        </p>
      </div>
    </div>
  );
}

function EngineProgressRow({
  icon,
  label,
  progress,
  status,
}: {
  icon: "chatgpt" | "gemini";
  label: string;
  progress: number;
  status: EngineStatus;
}) {
  return (
    <div className="grid min-h-[78px] grid-cols-[auto_1fr_auto] items-center gap-5 rounded-2xl border border-[#dfe5f3] bg-white/70 px-6 shadow-[0_18px_50px_-42px_rgba(36,52,105,0.6)]">
      <div className="flex size-10 items-center justify-center text-[#5261ff]">
        {icon === "chatgpt" ? <Bot className="size-8 text-[#3e4864]" /> : <Sparkles className="size-8 fill-[#6a78ff]/15" />}
      </div>
      <div className="grid items-center gap-3 sm:grid-cols-[150px_1fr]">
        <p className="font-bold text-[#26304b]">{label}</p>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#edf1f8]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#7e8cff,#5968ff)] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-[#65708c]">
        <span
          className={cn(
            "size-2.5 rounded-full",
            status === "Live" && "bg-[#30a987]",
            status === "Complete" && "bg-[#5261ff]",
            status === "Unavailable" && "bg-[#e05268]",
          )}
        />
        {status}
      </div>
    </div>
  );
}
