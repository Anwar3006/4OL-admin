"use client";

import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import KpiGrid from "@/components/redesign/KpiGrid";
import { formatCurrency, formatKpiValue } from "@/lib/format";
import { type Analytics, type Metrics } from "@/features/ai/schema/types";
import { accuracyClass, EmptyPanel, MetricRow } from "@/features/ai/ui/shared";
import { type AiModel } from "@/features/ai/data/useAiModels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsPanel({
  loading,
  analytics,
  metrics,
  models,
}: {
  loading: boolean;
  analytics: Analytics | null;
  metrics: Metrics | null;
  models: AiModel[];
}) {
  // O8: deterministic retrain alert — any model whose latest accuracy sits
  // below its registered target. No eval pipeline needed for this rule.
  const underTarget = useMemo(
    () =>
      models.filter(
        (model) =>
          model.accuracy_latest != null && model.accuracy_latest < model.accuracy_target,
      ),
    [models],
  );

  const costPerQuery =
    metrics && metrics.totalRequests > 0
      ? (metrics.totalCost / metrics.totalRequests).toFixed(3)
      : null;

  return (
    <div className="space-y-4">
      {underTarget.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Retrain recommended</AlertTitle>
          <AlertDescription>
            {underTarget.map((model) => (
              <div key={model.id}>
                <b>{model.name}</b> — {model.accuracy_latest}% accuracy vs {model.accuracy_target}%
                target.
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <KpiGrid variant="wide">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              AI Usage Trend (7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <EmptyPanel label="Loading usage analytics..." />
            ) : (
              <>
                <MetricRow label="Requests" value={formatKpiValue(analytics?.usage.requests ?? 0)} />
                <MetricRow label="Unique Users" value={formatKpiValue(analytics?.usage.uniqueUsers ?? 0)} />
                <MetricRow label="Errors" value={formatKpiValue(analytics?.usage.errors ?? 0)} />
                <MetricRow label="Avg Latency" value={`${analytics?.usage.avgLatency ?? 0}ms`} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Model Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {models.length === 0 && <EmptyPanel label="No registered models." />}
            {models
              .filter((model) => model.accuracy_latest != null)
              .map((model) => (
                <div key={model.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{model.name}</span>
                    <span
                      className={`tabular-nums ${accuracyClass(
                        model.accuracy_latest as number,
                        model.accuracy_target,
                      )}`}
                    >
                      {model.accuracy_latest}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        (model.accuracy_latest as number) >= model.accuracy_target
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${model.accuracy_latest}%` }}
                    />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Cost & Efficiency (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <EmptyPanel label="Loading cost metrics..." />
            ) : (
              <>
                <MetricRow
                  label="API Cost"
                  value={formatKpiValue(metrics?.totalCost ?? 0, { currency: true })}
                />
                <MetricRow label="Cost / Query" value={formatCurrency(costPerQuery, { decimals: 2, fallback: "—" })} />
                <MetricRow label="Tokens" value={formatKpiValue(metrics?.totalTokens ?? 0, { compact: true })} />
                <MetricRow label="Success Rate" value={`${metrics?.successRate ?? 0}%`} />
              </>
            )}
          </CardContent>
        </Card>
      </KpiGrid>
    </div>
  );
}
