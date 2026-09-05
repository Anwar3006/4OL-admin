"use client";

/**
 * Facilities tab — tracked facilities table with tablet dashboard status,
 * last ping, edit dialog and ping toggle (Part L, m-bt-facility edits).
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
import { useUpdateBedTrackerFacility } from "@/features/bed-tracker/data/useBedTracker";
import type { BedTrackerTabProps } from "@/features/bed-tracker/schema/types";

export default function BedTrackerFacilitiesTab({
  data,
  loading,
  onRegister,
}: BedTrackerTabProps & { onRegister: () => void }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const updateFacility = useUpdateBedTrackerFacility();

  const facilities = data?.facilities ?? [];
  const wards = data?.wards ?? [];

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return facilities;
    return facilities.filter((facility: any) =>
      String(facility.facility_profile?.facility_name ?? "")
        .toLowerCase()
        .includes(needle),
    );
  }, [facilities, search]);

  const wardsFor = (facilityId: string) =>
    wards.filter((ward) => ward.bed_tracker_facility_id === facilityId);

  const openEdit = (facility: any) => {
    setForm({
      ghs_facility_code: facility.ghs_facility_code ?? "",
      gps_coordinates: facility.gps_coordinates ?? "",
      facility_admin_name: facility.facility_admin_name ?? "",
      facility_admin_phone: facility.facility_admin_phone ?? "",
      hardware_option: facility.hardware_option ?? "lease",
      subscription_tier: facility.subscription_tier ?? "starter",
    });
    setEditing(facility);
  };

  const submitEdit = () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(form)) {
      payload[key] = value === "" ? null : value;
    }
    updateFacility.mutate(
      { id: editing.id, data: payload },
      { onSuccess: () => setEditing(null) },
    );
  };

  const togglePing = (facility: any) => {
    updateFacility.mutate({
      id: facility.id,
      data: { tablet_online: !facility.tablet_online },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="flex-1 min-w-[220px] max-w-sm"
          placeholder="🔍 Search tracked facilities..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="outline" onClick={onRegister}>+ Add Facility</Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>GHS Code</TableHead>
                <TableHead>Wards Tracked</TableHead>
                <TableHead>Beds</TableHead>
                <TableHead>Tablet Dashboard</TableHead>
                <TableHead>Last Ping</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                    Loading tracked facilities...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                    No tracked facilities yet — use + Add Facility.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((facility: any) => {
                  const trackedWards = wardsFor(facility.id);
                  return (
                    <TableRow key={facility.id}>
                      <TableCell>
                        <div className="font-bold">
                          {facility.facility_profile?.facility_name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {facility.facility_profile?.facility_type ?? "—"} ·{" "}
                          {facility.facility_profile?.region ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {facility.ghs_facility_code ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{trackedWards.length}/8</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-emerald-700">{facility.available_beds ?? 0}</span>
                        <span className="text-xs text-slate-500">/{facility.total_beds ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={facility.tablet_online ? "emerald" : "secondary"}>
                          {facility.tablet_online ? "🟢 Online" : "⚫ Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {facility.last_ping_at
                          ? new Date(facility.last_ping_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="capitalize text-xs">
                        {facility.subscription_tier ?? "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(facility)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updateFacility.isPending}
                          onClick={() => togglePing(facility)}
                        >
                          {facility.tablet_online ? "Mark Offline" : "Ping"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit — {editing?.facility_profile?.facility_name ?? "Facility"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ef-ghs">GHS code</Label>
                <Input id="ef-ghs" value={form.ghs_facility_code ?? ""} onChange={(event) => setForm({ ...form, ghs_facility_code: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ef-gps">GPS</Label>
                <Input id="ef-gps" value={form.gps_coordinates ?? ""} onChange={(event) => setForm({ ...form, gps_coordinates: event.target.value })} placeholder="lat,lng" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ef-name">Admin name</Label>
                <Input id="ef-name" value={form.facility_admin_name ?? ""} onChange={(event) => setForm({ ...form, facility_admin_name: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ef-phone">Admin phone</Label>
                <Input id="ef-phone" value={form.facility_admin_phone ?? ""} onChange={(event) => setForm({ ...form, facility_admin_phone: event.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Hardware</Label>
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm capitalize"
                  value={form.hardware_option ?? "lease"}
                  onChange={(event) => setForm({ ...form, hardware_option: event.target.value })}
                >
                  <option value="lease">Lease</option>
                  <option value="purchase">Purchase</option>
                  <option value="byo">Bring your own</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Tier</Label>
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm capitalize"
                  value={form.subscription_tier ?? "starter"}
                  onChange={(event) => setForm({ ...form, subscription_tier: event.target.value })}
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={updateFacility.isPending}>
              {updateFacility.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
