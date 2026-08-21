"use client";

/**
 * Ambulance Dispatch tab — fleet table (AMB-xxxx units, status, GPS live)
 * plus recent dispatches with AI-routing badges (Part L).
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
import type { BedTrackerTabProps } from "../page";

const FLEET_STATUS: Record<string, string> = {
  available: "emerald",
  en_route: "amber",
  responding: "blue",
  standby: "secondary",
};

export default function AmbulanceDispatchTab({
  data,
  loading,
  onDispatch,
}: BedTrackerTabProps & { onDispatch: () => void }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const fleet = data?.fleet ?? [];
  const dispatches = data?.dispatches ?? [];

  const units = useMemo(
    () => (statusFilter === "all" ? fleet : fleet.filter((u: any) => u.status === statusFilter)),
    [fleet, statusFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold uppercase tracking-widest"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="en_route">En Route</option>
          <option value="responding">Responding</option>
          <option value="standby">Standby</option>
        </select>
        <Button className="bg-red-600 text-white hover:bg-red-700" onClick={onDispatch}>
          🚨 Emergency Dispatch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
            Ambulance Fleet ({units.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ambulance ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GPS Live</TableHead>
                <TableHead>Last Ping</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                    Loading fleet...
                  </TableCell>
                </TableRow>
              )}
              {!loading && units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                    No ambulances registered yet — seed the ambulances table via migration or API.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                units.map((unit: any) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono font-bold">{unit.ambulance_code}</TableCell>
                    <TableCell>{unit.service_provider ?? "NAS Ghana"}</TableCell>
                    <TableCell>{unit.region ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(FLEET_STATUS[unit.status] ?? "secondary") as any} className="capitalize">
                        {String(unit.status ?? "").replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{unit.current_gps ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {unit.last_ping_at ? new Date(unit.last_ping_at).toLocaleTimeString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
            Recent Dispatches ({dispatches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Emergency</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>AI Routing</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                    Loading dispatches...
                  </TableCell>
                </TableRow>
              )}
              {!loading && dispatches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                    No dispatches recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                dispatches.map((dispatch: any) => (
                  <TableRow key={dispatch.id}>
                    <TableCell className="font-mono font-bold">{dispatch.dispatch_reference}</TableCell>
                    <TableCell>{String(dispatch.emergency_type ?? "").replaceAll("_", " ")}</TableCell>
                    <TableCell>{dispatch.pickup_area || dispatch.pickup_address}</TableCell>
                    <TableCell>
                      {dispatch.facility_profile?.facility_name ?? dispatch.destination_address ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={dispatch.priority === "critical" ? "destructive" : dispatch.priority === "urgent" ? "amber" : "secondary"}
                        className="capitalize"
                      >
                        {dispatch.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{dispatch.ai_routing_used ? "🤖 Routed" : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {String(dispatch.status ?? "").replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
