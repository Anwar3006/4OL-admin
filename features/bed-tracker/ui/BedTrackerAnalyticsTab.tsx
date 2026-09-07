"use client";

/**
 * Analytics tab — occupancy-by-ward-type bars, Full-Ward Events (from
 * alerts), facility uptime (tablet online ratio). Queries-by-User-Type
 * shows "—" until Epic 30.1 analytics_events exists (L-D6).
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BedTrackerTabProps } from "@/features/bed-tracker/schema/types";

function MetricLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0 text-sm text-slate-600">
      <span>{label}</span>
      <span className="font-black text-slate-800">{value}</span>
    </div>
  );
}

export default function BedTrackerAnalyticsTab({ data, loading }: BedTrackerTabProps) {
  const wards = data?.wards ?? [];
  const alerts = data?.alerts ?? [];
  const facilities = data?.facilities ?? [];
  const dispatches = data?.dispatches ?? [];

  const byType = useMemo(() => {
    const map = new Map<string, { total: number; occupied: number }>();
    for (const ward of wards) {
      const bucket = map.get(ward.ward_type) ?? { total: 0, occupied: 0 };
      bucket.total += Number(ward.total_beds ?? 0);
      bucket.occupied += Number(ward.occupied_beds ?? 0);
      map.set(ward.ward_type, bucket);
    }
    return Array.from(map.entries()).sort(
      (a, b) => b[1].occupied / Math.max(b[1].total, 1) - a[1].occupied / Math.max(a[1].total, 1),
    );
  }, [wards]);

  const fullWardEvents = alerts.filter(
    (alert: any) => alert.alert_type === "capacity_full" || Number(alert.beds_available ?? 1) === 0,
  ).length;
  const uptimePct =
    facilities.length > 0
      ? Math.round((facilities.filter((f: any) => f.tablet_online).length / facilities.length) * 100)
      : 0;
  const metrics = data?.metrics;

  if (loading) {
    return <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading analytics...</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="section-heading">
            Ward Occupancy by Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {byType.length === 0 && (
            <p className="text-sm text-slate-500">No ward data available yet.</p>
          )}
          {byType.map(([type, bucket]) => {
            const pct = bucket.total > 0 ? Math.round((bucket.occupied / bucket.total) * 100) : 0;
            return (
              <div key={type}>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                  <span className="capitalize">{type}</span>
                  <span>{pct}% ({bucket.occupied}/{bucket.total})</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="section-heading">
            Operational Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetricLine label="Average occupancy" value={`${metrics?.occupancyPct ?? 0}%`} />
          <MetricLine label="Full-ward events (recorded)" value={fullWardEvents} />
          <MetricLine label="Facility tablet uptime" value={`${uptimePct}%`} />
          <MetricLine label="Ambulance dispatches (recent)" value={dispatches.length} />
          <MetricLine
            label="AI-routed dispatches"
            value={dispatches.filter((d: any) => d.ai_routing_used).length}
          />
          <MetricLine label="Queries today" value="—" />
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="section-heading">
            Queries by User Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            — pending Epic 30.1 (analytics_events). Breakdown by Ambulance Units / Emergency
            Operators / App Users / HCPs will appear once event tracking lands (L-D6).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
