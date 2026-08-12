"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { chartSeriesColor } from "./palette";

// Epic 9.2: shared bar / grouped-bar chart wrapper — by-status, by-region,
// by-plan breakdowns. Data-driven only: callers pass real aggregate rows.

export interface BreakdownBarSeries {
  key: string;
  label: string;
  color?: string;
}

export interface BreakdownBarChartProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  data: Record<string, unknown>[];
  xKey: string;
  series: BreakdownBarSeries[];
  layout?: "vertical" | "horizontal";
  height?: number;
  xTickFormatter?: (value: unknown) => string;
  className?: string;
}

export function BreakdownBarChart({
  title,
  description,
  data,
  xKey,
  series,
  layout = "horizontal",
  height = 280,
  xTickFormatter,
  className,
}: BreakdownBarChartProps) {
  const config = React.useMemo(
    () =>
      series.reduce<ChartConfig>((acc, s, i) => {
        acc[s.key] = { label: s.label, color: s.color ?? chartSeriesColor(i) };
        return acc;
      }, {}),
    [series]
  );

  const isVertical = layout === "vertical";

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ChartContainer config={config} className="w-full" style={{ height }}>
          <BarChart accessibilityLayer data={data} layout={layout}>
            <CartesianGrid vertical={false} horizontal={!isVertical} />
            {isVertical ? (
              <>
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  dataKey={xKey}
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tickFormatter={xTickFormatter}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xKey}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={xTickFormatter}
                />
                <YAxis tickLine={false} axisLine={false} width={40} />
              </>
            )}
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={4} />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
