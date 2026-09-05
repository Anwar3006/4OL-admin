"use client";

/**
 * Live Overview — ward summary cards with occupancy bars, ACTIVE ALERTS
 * rail (Resolve wired) and AVAILABLE NOW rail. Gap Analysis Part L.
 * Map visualisation deferred (L-D5 pending user decision); GPS values are
 * shown as coordinates.
 */

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResolveBedTrackerAlert } from "@/features/bed-tracker/data/useBedTracker";
import type { BedTrackerTabProps } from "@/features/bed-tracker/schema/types";

const WARD_LABELS: Record<string, string> = {
  general: "General",
  icu: "ICU",
  surgical: "Surgical",
  medical: "Medical",
  maternity: "Maternity",
  pediatric: "Pediatric",
  psychiatric: "Psychiatric",
  geriatric: "Geriatric",
};

export default function LiveOverviewTab({ data, loading }: BedTrackerTabProps) {
  const [wardFilter, setWardFilter] = useState("all");
  const resolveAlert = useResolveBedTrackerAlert();

  const wards = data?.wards ?? [];
  const alerts = (data?.alerts ?? []).filter((a: any) => !a.is_resolved);

  const wardSummary = useMemo(() => {
    const byType = new Map<string, { total: number; occupied: number; available: number }>();
    for (const ward of wards) {
      const bucket = byType.get(ward.ward_type) ?? { total: 0, occupied: 0, available: 0 };
      bucket.total += Number(ward.total_beds ?? 0);
      bucket.occupied += Number(ward.occupied_beds ?? 0);
      bucket.available += Number(ward.available_beds ?? 0);
      byType.set(ward.ward_type, bucket);
    }
    return Array.from(byType.entries());
  }, [wards]);

  const availableNow = wards
    .filter((ward) => Number(ward.available_beds) > 0)
    .sort((a, b) => Number(b.available_beds) - Number(a.available_beds))
    .slice(0, 8);

  const facilityName = (ward: any) =>
    ward.bed_tracker_facilities?.facility_profile?.facility_name ?? "Unknown facility";

  if (loading) {
    return <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading live overview...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ward type:</span>
        {["all", ...Object.keys(WARD_LABELS)].map((type) => (
          <button
            key={type}
            onClick={() => setWardFilter(type)}
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              wardFilter === type
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300"
            }`}
          >
            {type === "all" ? "All" : WARD_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {wardSummary
          .filter(([type]) => wardFilter === "all" || type === wardFilter)
          .map(([type, summary]) => {
            const occupancyPct =
              summary.total > 0 ? Math.round((summary.occupied / summary.total) * 100) : 0;
            const critical = summary.total > 0 && summary.available === 0;
            return (
              <Card key={type} className={critical ? "border-red-300" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center justify-between">
                    {WARD_LABELS[type] ?? type}
                    <Badge variant={critical ? "destructive" : summary.available < 10 ? "amber" : "emerald"}>
                      {critical ? "Full" : summary.available < 10 ? "Low" : "Available"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-black text-slate-800">{summary.available} free</span>
                    <span className="text-xs text-slate-500">{summary.occupied}/{summary.total} occupied</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${occupancyPct >= 90 ? "bg-red-500" : occupancyPct >= 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        {!loading && wardSummary.length === 0 && (
          <Card className="sm:col-span-2 xl:col-span-4">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No ward data yet — register a facility to start tracking beds.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
              🚨 Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No unresolved alerts.</p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 6).map((alert: any) => (
                  <div key={alert.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wide text-slate-800">
                        {alert.bed_tracker_facilities?.facility_profile?.facility_name ?? "Facility"} —{" "}
                        {String(alert.alert_type ?? "capacity").replaceAll("_", " ")}
                      </div>
                      <div className="text-xs text-slate-500">{alert.message}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolveAlert.isPending}
                      onClick={() => resolveAlert.mutate(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
              ✅ Available Now
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {availableNow.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No wards with free beds.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Beds</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableNow.map((ward) => (
                    <TableRow key={ward.id}>
                      <TableCell className="font-bold">{facilityName(ward)}</TableCell>
                      <TableCell>{WARD_LABELS[ward.ward_type] ?? ward.ward_type}</TableCell>
                      <TableCell className="font-black text-emerald-700">{ward.available_beds}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
