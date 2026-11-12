"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Flag, Gauge, Lightbulb, Settings, Sparkles, Users, FileText } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/prompts", label: "Prompts", icon: Sparkles },
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "/sources", label: "Sources", icon: Flag },
  { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppShellProps = {
  businessName?: string;
  userName?: string | null;
  children: ReactNode;
};

export function AppShell({ businessName, userName, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.09),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef5f4_100%)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="hidden rounded-[28px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_30px_120px_-60px_rgba(2,6,23,0.9)] lg:block">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                <BarChart3 className="size-3.5" />
                AUS LLMEO
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{businessName ?? "AI visibility platform"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Measure, monitor, and improve how your business appears in AI-generated answers across Australia.
                </p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border border-white/15 bg-emerald-500/15">
                <AvatarFallback className="bg-transparent text-sm font-semibold text-emerald-100">
                  {userName?.slice(0, 2).toUpperCase() ?? "AU"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{userName ?? "Workspace owner"}</p>
                <p className="text-xs text-slate-300">Founder view</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="rounded-[32px] border border-white/70 bg-white/60 p-5 shadow-[0_30px_120px_-60px_rgba(15,23,42,0.45)] backdrop-blur-xl md:p-8">
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap",
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
