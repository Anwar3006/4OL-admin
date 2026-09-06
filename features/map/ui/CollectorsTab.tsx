"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserSearchSelect } from "@/components/UserSearchSelect";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/stores/permission-context";
import ghanaLocations from "@/constant/ghana-locations.json";
import {
  collectorDisplayId,
  useAddCollector,
  useDeleteCollector,
  useMapCollectors,
  useUpdateCollector,
  type MapCollector,
} from "@/features/map/data/useMap";

const GPS_BADGES: Record<string, string> = {
  active: "badge-green",
  weak: "badge-amber",
  inactive: "badge-slate",
};

const REGIONS = Object.keys(ghanaLocations);

const CollectorsTab = () => {
  const canManage = useHasPermission("users.edit");
  const { data, isLoading, isError, error } = useMapCollectors();
  const addCollector = useAddCollector();
  const updateCollector = useUpdateCollector();
  const deleteCollector = useDeleteCollector();

  const [addOpen, setAddOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [regionEdit, setRegionEdit] = useState<MapCollector | null>(null);
  const [editRegion, setEditRegion] = useState("");

  const collectors = data?.collectors ?? [];

  const handleAdd = async () => {
    if (!newUserId) return;
    await addCollector.mutateAsync({
      userId: newUserId,
      assignedRegion: newRegion || null,
      notes: newNotes || null,
    });
    setAddOpen(false);
    setNewUserId("");
    setNewRegion("");
    setNewNotes("");
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Collector",
        cell: ({ row }: any) => (
          <div className="flex flex-col min-w-[160px]">
            <span className="font-black text-slate-800 text-xs">
              {collectorDisplayId(row.original.id)}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {`${row.original.user?.first_name ?? ""} ${row.original.user?.last_name ?? ""}`.trim() ||
                row.original.user_id.slice(0, 8)}
            </span>
            {row.original.user?.email && (
              <span className="text-[9px] text-slate-400">{row.original.user.email}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "assigned_region",
        header: "Assigned Region",
        cell: ({ row }: any) => (
          <span className="text-xs font-semibold text-slate-600 capitalize">
            {row.original.assigned_region || "—"}
          </span>
        ),
      },
      {
        accessorKey: "gps_status",
        header: "GPS Status",
        cell: ({ row }: any) => (
          <span className={cn("badge uppercase text-[8px] font-black", GPS_BADGES[row.original.gps_status])}>
            {row.original.gps_status}
          </span>
        ),
      },
      {
        accessorKey: "footprint_points",
        header: "Total Footprint Pts",
        cell: ({ row }: any) => (
          <span className="text-xs font-black text-slate-700">
            {(row.original.footprint_points ?? 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "last_active",
        header: "Last Active",
        cell: ({ row }: any) => (
          <span className="text-[11px] text-slate-500 font-medium">
            {row.original.last_active
              ? new Date(row.original.last_active).toLocaleString()
              : "Never"}
          </span>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo(
    () =>
      canManage
        ? [
            {
              label: "👣 View Footprints",
              onClick: (row: MapCollector) => {
                window.location.href = "/map?tab=footprints";
              },
            },
            {
              label: "📍 Change Region",
              onClick: (row: MapCollector) => {
                setRegionEdit(row);
                setEditRegion(row.assigned_region ?? "");
              },
            },
            {
              label: "🗑 Remove Collector",
              danger: true,
              onClick: (row: MapCollector) => {
                deleteCollector.mutate({ id: String(row.id) });
              },
            },
          ]
        : [
            {
              label: "👣 View Footprints",
              onClick: () => {
                window.location.href = "/map?tab=footprints";
              },
            },
          ],
    [canManage, deleteCollector],
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">
          Collectors are field staff whose GPS footprints feed the coverage
          report. Location history is restricted to roles with user-view
          access.
        </p>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            + Add Collector
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={collectors}
          isLoading={isLoading}
          isError={isError}
          error={error as Error | undefined}
          rowActions={rowActions}
          selectable={false}
        />
      </div>

      {/* Add Collector dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>👷 Add Collector</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                User
              </label>
              <UserSearchSelect value={newUserId || undefined} onValueChange={setNewUserId} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Assigned Region
              </label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
              >
                <option value="">Unassigned</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary w-full"
              disabled={!newUserId || addCollector.isPending}
              onClick={handleAdd}
            >
              {addCollector.isPending ? "Adding…" : "Add Collector"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change region dialog */}
      <Dialog open={!!regionEdit} onOpenChange={(open) => !open && setRegionEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>📍 Change Assigned Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <select
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              value={editRegion}
              onChange={(e) => setEditRegion(e.target.value)}
            >
              <option value="">Unassigned</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary w-full"
              disabled={updateCollector.isPending}
              onClick={async () => {
                if (!regionEdit) return;
                await updateCollector.mutateAsync({
                  id: String(regionEdit.id),
                  assignedRegion: editRegion || null,
                });
                setRegionEdit(null);
              }}
            >
              {updateCollector.isPending ? "Saving…" : "Save Region"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorsTab;
