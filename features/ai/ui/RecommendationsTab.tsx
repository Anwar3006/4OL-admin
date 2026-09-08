"use client";

import React from "react";
import { Bot, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import KpiGrid from "@/components/redesign/KpiGrid";
import { formatKpiValue } from "@/lib/format";
import { type AiRecommendationsResponse } from "@/features/ai/data/useAiRecommendationStats";
import { EmptyPanel, EmptyRow } from "@/features/ai/ui/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RecommendationsPanel({
  data,
  loading,
}: {
  data: AiRecommendationsResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return <EmptyPanel label="Loading recommendation stats..." />;
  }

  if (!data?.configured) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-500/15 text-amber-900">
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Recommendation pipeline not configured</AlertTitle>
        <AlertDescription>
          No rows exist in <code className="font-mono">ai_recommendation_stats</code> yet. Stats
          appear once the recommender pipeline (or a manual import) starts writing daily rows.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Generated today"
          value={formatKpiValue(data.stats.generatedToday, { compact: true })}
          variant="purple"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Click-through rate"
          value={`${data.stats.ctr}%`}
          variant="blue"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Conversions"
          value={formatKpiValue(data.stats.conversions)}
          variant="green"
        />
        <KpiCard
          icon={<Bot className="h-5 w-5" />}
          label="Satisfaction"
          value={data.stats.satisfaction != null ? `${data.stats.satisfaction}/5` : "—"}
          variant="teal"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categories.map((category) => (
              <div key={category.type}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium capitalize text-slate-600 dark:text-slate-300">
                    {category.type.replaceAll("_", " ")}
                  </span>
                  <span className="tabular-nums text-slate-400">
                    {formatKpiValue(category.served)} · {category.share}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${category.barPct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Segment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Served</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Conv.</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.segments.length === 0 && (
                  <EmptyRow colSpan={7} label="No segment rows recorded yet." />
                )}
                {data.segments.map((segment, index) => (
                  <TableRow key={`${segment.statDate}-${segment.userSegment}-${index}`}>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                      {segment.userSegment}
                    </TableCell>
                    <TableCell className="capitalize">
                      {segment.recommendationType.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(segment.itemsServed)}</TableCell>
                    <TableCell className="tabular-nums">{segment.ctr}%</TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(segment.conversions)}</TableCell>
                    <TableCell>{segment.satisfaction != null ? `${segment.satisfaction}/5` : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{segment.modelVersion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
