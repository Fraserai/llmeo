import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  change?: number;
  helper: string;
};

export function StatCard({ label, value, change, helper }: StatCardProps) {
  const Icon = change === undefined ? Minus : change >= 0 ? ArrowUpRight : ArrowDownRight;
  const tone = change === undefined ? "text-slate-500" : change >= 0 ? "text-emerald-700" : "text-amber-700";

  return (
    <Card className="border-white/60 bg-white/90 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.35)]">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <CardTitle className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</CardTitle>
        </div>
        <div className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", tone, change === undefined ? "bg-slate-100" : change >= 0 ? "bg-emerald-50" : "bg-amber-50")}>
          <Icon className="size-3.5" />
          {change === undefined ? "Stable" : `${change > 0 ? "+" : ""}${change}`}
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-600">{helper}</CardContent>
    </Card>
  );
}
