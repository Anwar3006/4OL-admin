import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency, PlatformOverviewMetrics } from "./dashboard-types";

export default function RevenueByService({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const hasRevenue = metrics?.finance.revenue_status === "live";

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <div className="text-sm font-semibold">Revenue by Service</div>
          <div className="text-xs text-muted-foreground mt-0.5">Share of Revenue (MTD)</div>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {loading ? "..." : formatCurrency(metrics?.finance.revenue)}
        </span>
      </CardHeader>
      <CardContent>
        {hasRevenue ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Completed Transactions</span>
                <b className="text-slate-800 dark:text-slate-200">{formatCurrency(metrics?.finance.revenue)}</b>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-500">
            {loading
              ? "Loading dashboard metrics..."
              : "Revenue by service is awaiting the transaction pipeline. No per-service split, VAT, or gross-profit claim is shown until payments write to `transaction_records`."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
