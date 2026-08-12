"use client";

import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart } from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartSeriesColor } from "./palette";

// Epic 9.2: shared KPI tile with a trailing sparkline — dashboard stat
// cards (revenue this week, new users today, etc.). Data-driven only.

export interface StatSparklineCardProps {
  label: string;
  value: React.ReactNode;
  data: Record<string, unknown>[];
  dataKey: string;
  deltaPct?: number;
  color?: string;
  className?: string;
}

export function StatSparklineCard({
  label,
  value,
  data,
  dataKey,
  deltaPct,
  color = chartSeriesColor(0),
  className,
}: StatSparklineCardProps) {
  const config = React.useMemo<ChartConfig>(
    () => ({ [dataKey]: { label, color } }),
    [dataKey, label, color]
  );

  const isPositive = (deltaPct ?? 0) >= 0;

  return (
    <Card className={cn("gap-3", className)}>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-muted-foreground truncate">{label}</span>
          <span className="text-2xl font-bold leading-none">{value}</span>
          {deltaPct !== undefined && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-emerald-600" : "text-red-600"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? "+" : ""}
              {deltaPct.toFixed(1)}%
            </span>
          )}
        </div>
        <ChartContainer config={config} className="h-12 w-24 shrink-0">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel indicator="line" className="w-auto" />}
            />
            <Area
              dataKey={dataKey}
              type="monotone"
              fill={`var(--color-${dataKey})`}
              fillOpacity={0.2}
              stroke={`var(--color-${dataKey})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
