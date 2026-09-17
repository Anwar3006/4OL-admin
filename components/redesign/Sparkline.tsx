"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export type SparklineTrend = "up" | "down" | "neutral";

const STROKE: Record<SparklineTrend, string> = {
  up: "#10b981", // emerald-500 — matches KpiCard's "green" variant
  down: "#ef4444", // red-500 — matches KpiCard's "red" variant
  neutral: "#94a3b8", // slate-400
};

/**
 * Inline at-a-glance trend chart for a KPI card — no axis, no gridlines, no
 * tooltip (KpiCard.tsx). `data` must be a real ordered series; never pass
 * synthesised numbers just to fill the card.
 */
export default function Sparkline({
  data,
  trend = "neutral",
  height = 36,
  className,
}: {
  data: number[];
  trend?: SparklineTrend;
  height?: number;
  className?: string;
}) {
  const gradientId = React.useId();
  if (data.length < 2) return null;

  const points = data.map((value, i) => ({ i, value }));
  const stroke = STROKE[trend];

  return (
    <div className={cn("min-w-[72px] flex-1", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 1, bottom: 1, left: 1 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
