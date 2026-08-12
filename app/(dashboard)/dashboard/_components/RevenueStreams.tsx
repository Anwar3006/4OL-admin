import React from "react";
import { formatCurrency, PlatformOverviewMetrics } from "./dashboard-types";

export default function RevenueStreams({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const hasRevenue = metrics?.finance.revenue_status === "live";

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Revenue Streams</h2>
        <span className="font-bold text-slate-500">
          {loading ? "..." : formatCurrency(metrics?.finance.revenue)}
        </span>
      </div>
      {hasRevenue ? (
        <div className="space-y-3">
          <RevenueLine label="Completed Transactions" value={formatCurrency(metrics?.finance.revenue)} pct={100} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          Revenue analytics are awaiting the transaction pipeline. No VAT,
          provider split, or gross-profit claim is shown until payments write
          to `transaction_records`.
        </div>
      )}
    </div>
  );
}

function RevenueLine({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <b className="text-slate-800">{value}</b>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-ek-green" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
