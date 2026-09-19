import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendChart } from "@/components/charts/TrendChart";
import { PlatformOverviewMetrics } from "./dashboard-types";

const dateTickFormatter = (value: unknown) =>
  new Date(String(value)).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function AwaitingPipeline({ label }: { label: string }) {
  return (
    <div className="h-64 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

export default function PlatformActivityChart({
  metrics,
  loading,
  rangeLabel,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
  rangeLabel: string;
}) {
  const signups = metrics?.activity_trend?.signups ?? [];
  const hasSignupsTrend = signups.length >= 2;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <div className="text-sm font-semibold">Platform Activity</div>
          <div className="text-xs text-muted-foreground mt-0.5">{rangeLabel}</div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signups">
          <TabsList className="h-8">
            <TabsTrigger value="signups" className="text-xs px-3 py-1">Signups</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs px-3 py-1">Transactions</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs px-3 py-1">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="signups">
            {loading ? (
              <AwaitingPipeline label="Loading dashboard metrics..." />
            ) : hasSignupsTrend ? (
              <TrendChart
                data={signups}
                xKey="date"
                series={[{ key: "count", label: "New users" }]}
                variant="area"
                height={256}
                xTickFormatter={dateTickFormatter}
              />
            ) : (
              <AwaitingPipeline label="Not enough signup history in this window yet for a trend line." />
            )}
          </TabsContent>

          <TabsContent value="transactions">
            <AwaitingPipeline
              label={
                loading
                  ? "Loading dashboard metrics..."
                  : "Transaction volume will appear here once the payment pipeline starts writing real transaction records."
              }
            />
          </TabsContent>

          <TabsContent value="revenue">
            <AwaitingPipeline
              label={
                loading
                  ? "Loading dashboard metrics..."
                  : "Revenue trend will appear here after payment ingestion starts writing real transaction records."
              }
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
