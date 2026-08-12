"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

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

// Epic 9.2: shared donut/pie chart wrapper — payment-method split, plan
// distribution, etc. Data-driven only: callers pass real aggregate rows.

export interface DistributionSlice {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface DistributionDonutChartProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  data: DistributionSlice[];
  centerLabel?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function DistributionDonutChart({
  title,
  description,
  data,
  centerLabel,
  height = 260,
  valueFormatter = (v) => v.toLocaleString(),
  className,
}: DistributionDonutChartProps) {
  const config = React.useMemo(
    () =>
      data.reduce<ChartConfig>((acc, s, i) => {
        acc[s.key] = { label: s.label, color: s.color ?? chartSeriesColor(i) };
        return acc;
      }, {}),
    [data]
  );

  const chartData = React.useMemo(
    () =>
      data.map((s, i) => ({
        ...s,
        fill: s.color ?? chartSeriesColor(i),
      })),
    [data]
  );

  const total = React.useMemo(
    () => data.reduce((acc, s) => acc + s.value, 0),
    [data]
  );

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="items-center pb-0">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square"
          style={{ maxHeight: height }}
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={chartData} dataKey="value" nameKey="key" innerRadius="60%" strokeWidth={5}>
              {centerLabel && (
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {valueFormatter(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 22}
                            className="fill-muted-foreground text-xs"
                          >
                            {centerLabel}
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              )}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="key" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
