"use client";

import React from "react";
import { Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartSeriesColor } from "@/components/charts/palette";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function SubscriberMix({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const byScope = metrics?.subscriptions.by_scope;
  const totalUsers = metrics?.kpis.total_users ?? 0;
  const subscribed = byScope ? byScope.all_access + byScope.fitness_only + byScope.period_only : 0;
  // Every registered profile that isn't in any of the three scopes above —
  // same `total_users` the KPI band up top already shows, so this reads as
  // "of the users you already know about" rather than a second, competing
  // definition of "total users" on the same page.
  const notSubscribed = Math.max(totalUsers - subscribed, 0);

  if (loading || totalUsers === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="text-sm font-semibold">Subscriber Mix</div>
          <span className="text-slate-400 text-xs font-bold">Subscriptions</span>
        </CardHeader>
        <CardContent>
          <div className="h-48 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6 text-center text-xs text-slate-500">
            {loading ? "Loading subscription metrics..." : "Subscriber mix is awaiting registered users."}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Same scope → label mapping already established in
  // features/subscriptions/ui/SubscribersTab.tsx — kept identical so the
  // same scope reads the same way everywhere in the app. "Not subscribed"
  // is red on purpose (explicit ask) — it's the one slice that isn't a
  // product to grow, it's the gap.
  const slices = [
    { key: "fitness_only", label: "Fitness", value: byScope?.fitness_only ?? 0, fill: chartSeriesColor(0) },
    { key: "period_only", label: "Plasence", value: byScope?.period_only ?? 0, fill: chartSeriesColor(1) },
    { key: "all_access", label: "Entire app", value: byScope?.all_access ?? 0, fill: chartSeriesColor(2) },
    { key: "not_subscribed", label: "Not subscribed", value: notSubscribed, fill: "#ef4444" },
  ].filter((slice) => slice.value > 0);

  const config = slices.reduce<ChartConfig>((acc, s) => {
    acc[s.key] = { label: s.label, color: s.fill };
    return acc;
  }, {});

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Subscriber Mix</CardTitle>
        <CardDescription>
          {subscribed.toLocaleString()} of {totalUsers.toLocaleString()} users subscribed
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <ChartContainer config={config} className="aspect-square shrink-0" style={{ width: 128, height: 128 }}>
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={slices} dataKey="value" nameKey="key" innerRadius="60%" strokeWidth={5}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                          {totalUsers.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-[10px]">
                          users
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          {slices.map((slice) => (
            <div key={slice.key} className="flex items-center gap-2 text-xs">
              <span className="size-2.25 rounded-sm shrink-0" style={{ backgroundColor: slice.fill }} />
              <span className="flex-1 min-w-0 truncate text-slate-500 dark:text-slate-400">{slice.label}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {Math.round((slice.value / totalUsers) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
