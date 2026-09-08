"use client";

/**
 * Bed Registry — ward records table with availability bars, update-source
 * badges and the Update Beds dialog (L7/L6: PATCH writes a history row and
 * raises a capacity alert when a tracked ward hits zero).
 */

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useUpdateBedTrackerWard,
  type BedTrackerWard,
} from "@/features/bed-tracker/data/useBedTracker";
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

function relativeTime(value?: string | null) {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function BedRegistryTab({ data, loading }: BedTrackerTabProps) {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [editing, setEditing] = useState<BedTrackerWard | null>(null);
  const [totalBeds, setTotalBeds] = useState(0);
  const [occupiedBeds, setOccupiedBeds] = useState(0);
  const updateWard = useUpdateBedTrackerWard();

  const wards = data?.wards ?? [];

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return wards.filter((ward) => {
      if (wardFilter !== "all" && ward.ward_type !== wardFilter) return false;
      if (!needle) return true;
      const name =
        ward.bed_tracker_facilities?.facility_profile?.facility_name ?? "";
      return name.toLowerCase().includes(needle);
    });
  }, [wards, search, wardFilter]);

  const openUpdate = (ward: BedTrackerWard) => {
    setTotalBeds(Number(ward.total_beds ?? 0));
    setOccupiedBeds(Number(ward.occupied_beds ?? 0));
    setEditing(ward);
  };

  const submitUpdate = () => {
    if (!editing) return;
    updateWard.mutate(
      { id: editing.id, total_beds: totalBeds, occupied_beds: occupiedBeds },
      { onSuccess: () => setEditing(null) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="flex-1 min-w-[220px] max-w-sm"
          placeholder="🔍 Search facility..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold uppercase tracking-widest"
          value={wardFilter}
          onChange={(event) => setWardFilter(event.target.value)}
        >
          <option value="all">All ward types</option>
          {Object.entries(WARD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Ward Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Occupied</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500">
                    Loading ward records...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500">
                    No ward records found.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((ward) => {
                  const total = Number(ward.total_beds ?? 0);
                  const available = Number(ward.available_beds ?? 0);
                  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
                  const critical = total > 0 && available === 0;
                  return (
                    <TableRow key={ward.id}>
                      <TableCell>
                        <div className="font-bold">
                          {ward.bed_tracker_facilities?.facility_profile?.facility_name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {ward.bed_tracker_facilities?.facility_profile?.region ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>{WARD_LABELS[ward.ward_type] ?? ward.ward_type}</TableCell>
                      <TableCell>{total}</TableCell>
                      <TableCell>{ward.occupied_beds}</TableCell>
                      <TableCell className="font-black text-emerald-700 dark:text-emerald-400">{available}</TableCell>
                      <TableCell className="min-w-[110px]">
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct <= 10 ? "bg-red-500" : pct <= 30 ? "bg-amber-400" : "bg-emerald-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-2xs font-bold text-slate-500">{pct}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={critical ? "destructive" : pct <= 10 ? "amber" : "emerald"}>
                          {critical ? "Full" : pct <= 10 ? "Low" : "Available"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{relativeTime(ward.last_updated_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {ward.update_source ?? "admin"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openUpdate(ward)}>
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && (
        <p className="text-xs text-slate-500">
          {rows.length} ward records across the tracked facility network.
        </p>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Update Beds —{" "}
              {editing?.bed_tracker_facilities?.facility_profile?.facility_name ?? ""} (
              {editing ? WARD_LABELS[editing.ward_type] ?? editing.ward_type : ""})
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="bt-total">Total beds</Label>
              <Input
                id="bt-total"
                type="number"
                min={0}
                value={totalBeds}
                onChange={(event) => setTotalBeds(Math.max(0, Number(event.target.value)))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bt-occupied">Occupied beds</Label>
              <Input
                id="bt-occupied"
                type="number"
                min={0}
                max={totalBeds}
                value={occupiedBeds}
                onChange={(event) =>
                  setOccupiedBeds(Math.min(totalBeds, Math.max(0, Number(event.target.value))))
                }
              />
            </div>
            <p className="text-xs text-slate-500">
              The update is audit-logged; if availability hits zero an alert is raised
              automatically for facilities with auto-alert enabled.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={submitUpdate} disabled={updateWard.isPending}>
              {updateWard.isPending ? "Saving..." : "Save Beds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
