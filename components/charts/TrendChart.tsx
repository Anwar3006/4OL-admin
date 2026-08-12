"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

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

// Epic 9.2: shared trend/line chart wrapper — revenue, DAU/MAU, growth, etc.
// Data-driven only: callers pass real rows + series keys, never demo data.

export interface TrendChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface TrendChartProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  data: Record<string, unknown>[];
  xKey: string;
  series: TrendChartSeries[];
  variant?: "line" | "area";
  height?: number;
  xTickFormatter?: (value: unknown) => string;
  className?: string;
}

export function TrendChart({
  title,
  description,
  data,
  xKey,
  series,
  variant = "line",
  height = 280,
  xTickFormatter,
  className,
}: TrendChartProps) {
  const config = React.useMemo(
    () =>
      series.reduce<ChartConfig>((acc, s, i) => {
        acc[s.key] = { label: s.label, color: s.color ?? chartSeriesColor(i) };
        return acc;
      }, {}),
    [series]
  );

  const ChartComponent = variant === "area" ? AreaChart : LineChart;

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
          <ChartComponent accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={xTickFormatter}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
            {series.map((s) =>
              variant === "area" ? (
                <Area
                  key={s.key}
                  dataKey={s.key}
                  type="monotone"
                  fill={`var(--color-${s.key})`}
                  fillOpacity={0.15}
                  stroke={`var(--color-${s.key})`}
                  strokeWidth={2}
                />
              ) : (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  type="monotone"
                  stroke={`var(--color-${s.key})`}
                  strokeWidth={2}
                  dot={false}
                />
              )
            )}
          </ChartComponent>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
