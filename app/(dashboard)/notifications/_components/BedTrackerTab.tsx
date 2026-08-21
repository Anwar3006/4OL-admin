"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BedDouble, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BedTrackerAlert = {
  id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  bed_type: string | null;
  beds_available: number | null;
  beds_total: number | null;
  is_resolved: boolean;
  notification_sent: boolean;
  notification_sent_at: string | null;
  created_at: string;
  facility: {
    facility_profile: { name: string } | null;
  } | null;
};

function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const SEVERITY_VARIANT: Record<BedTrackerAlert["severity"], "destructive" | "amber" | "blue"> = {
  critical: "destructive",
  warning: "amber",
  info: "blue",
};

/**
 * BedTracker Alerts tab (Gap Analysis Part R, R-D3/R8). Read-view over
 * Part L's bed_tracker_alerts; alerts bypass the normal notification queue
 * (they are capacity events, not user messages).
 */
export default function BedTrackerTab() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<BedTrackerAlert[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/bedtracker-alerts", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load BedTracker alerts.");
      setAlerts(json.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardContent className="p-0">
        <Alert className="rounded-none border-x-0 border-t-0">
          <Zap className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Capacity alerts bypass the regular notification queue — they are
            dispatched immediately to on-shift recipients and nearby facilities.
          </AlertDescription>
        </Alert>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead className="text-right">Beds</TableHead>
              <TableHead>Notified</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  Loading BedTracker alerts...
                </TableCell>
              </TableRow>
            ) : alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  No capacity alerts recorded.
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="min-w-[240px] whitespace-normal">
                    <div className="flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[alert.severity] ?? "secondary"} className="capitalize">
                        {alert.severity}
                      </Badge>
                      <span className="font-medium capitalize text-slate-800 dark:text-slate-100">
                        {alert.alert_type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">{alert.message}</div>
                  </TableCell>
                  <TableCell>{alert.facility?.facility_profile?.name ?? "Unknown facility"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                      {alert.beds_available ?? "?"}/{alert.beds_total ?? "?"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.notification_sent ? "emerald" : "secondary"}>
                      {alert.notification_sent ? "Sent" : "Not sent"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatTime(alert.notification_sent_at ?? alert.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={alert.is_resolved ? "secondary" : "amber"}>
                      {alert.is_resolved ? "Resolved" : "Open"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
