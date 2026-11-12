"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TrendChartProps = {
  data: {
    label: string;
    visibilityScore: number;
    opportunityScore: number;
  }[];
};

export function VisibilityTrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 20px 50px -30px rgba(15, 23, 42, 0.35)",
            }}
          />
          <Line type="monotone" dataKey="visibilityScore" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="opportunityScore" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
