"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KpiGrid from "@/components/redesign/KpiGrid";

type BestTimeBucket = {
  hour_bucket: number;
  segment: string;
  opened_count: number;
};

type PeriodDef = { label: string; hours: [number, number] };

const PERIODS: PeriodDef[] = [
  { label: "Morning (06:00–12:00)", hours: [6, 12] },
  { label: "Afternoon (12:00–18:00)", hours: [12, 18] },
  { label: "Evening (18:00–23:00)", hours: [18, 23] },
];

const SEGMENTS = ["broadcast", "campaign", "transactional"];

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * Best Time tab (Gap Analysis Part R, R-D2). Hour-bucket open counts from
 * get_best_time_stats over notifications.opened_at. Renders honest empty
 * state until send/open volume exists — never mocked.
 */
export default function BestTimeTab() {
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<BestTimeBucket[]>([]);
  const [configured, setConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/best-time", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load best-time analytics.");
      setBuckets(json.buckets ?? []);
      setConfigured(Boolean(json.configured));
    } catch {
      setBuckets([]);
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bySegment = useMemo(() => {
    const map: Record<string, BestTimeBucket[]> = {};
    for (const bucket of buckets) {
      (map[bucket.segment] ??= []).push(bucket);
    }
    for (const segment of Object.keys(map)) {
      map[segment].sort((a, b) => a.hour_bucket - b.hour_bucket);
    }
    return map;
  }, [buckets]);

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400 dark:border-slate-700">
        Loading best-time analytics...
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
        <Clock className="mx-auto h-8 w-8 text-slate-300" />
        <div className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          Not enough open data yet
        </div>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
          Best-time recommendations are computed live from notification opens
          over the last 90 days. Once broadcasts and campaigns accumulate open
          volume, hour-by-hour engagement curves appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {SEGMENTS.filter((segment) => bySegment[segment]?.length).map((segment) => {
        const segmentBuckets = bySegment[segment];
        const maxCount = Math.max(...segmentBuckets.map((b) => b.opened_count), 1);
        const best = segmentBuckets.reduce((a, b) => (b.opened_count > a.opened_count ? b : a));
        const periodTotals = PERIODS.map((period) => ({
          ...period,
          total: segmentBuckets
            .filter((b) => b.hour_bucket >= period.hours[0] && b.hour_bucket < period.hours[1])
            .reduce((sum, b) => sum + Number(b.opened_count), 0),
        }));
        const bestPeriod = periodTotals.reduce((a, b) => (b.total > a.total ? b : a), periodTotals[0]);

        return (
          <Card key={segment}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                {segment} opens by hour
              </CardTitle>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Best window: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatHour(best.hour_bucket)}</span>{" "}
                · Peak period: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bestPeriod.label.split(" (")[0]}</span>
              </div>
            </CardHeader>
            <CardContent>
              <KpiGrid variant="wide" className="mb-4">
                {periodTotals.map((period) => (
                  <div
                    key={period.label}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{period.label}</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {period.total.toLocaleString("en-GH")}
                    </div>
                    <div className="text-xs text-slate-400">opens</div>
                  </div>
                ))}
              </KpiGrid>
              <div className="flex h-32 items-end gap-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const bucket = segmentBuckets.find((b) => b.hour_bucket === hour);
                  const count = Number(bucket?.opened_count ?? 0);
                  const heightPct = count ? Math.max((count / maxCount) * 100, 4) : 2;
                  return (
                    <div key={hour} className="group flex flex-1 flex-col items-center gap-1">
                      <div
                        title={`${formatHour(hour)} — ${count} opens`}
                        className={
                          hour === best.hour_bucket
                            ? "w-full rounded-t bg-emerald-600"
                            : "w-full rounded-t bg-slate-200 group-hover:bg-slate-300 dark:bg-slate-700"
                        }
                        style={{ height: `${heightPct}%` }}
                      />
                      {hour % 6 === 0 && (
                        <div className="text-3xs tabular-nums text-slate-400">{formatHour(hour)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
