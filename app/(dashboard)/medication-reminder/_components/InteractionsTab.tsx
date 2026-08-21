"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { INTERACTION_SEVERITIES } from "@/lib/shared-constants";
import {
  useDrugInteractions,
  useCreateInteraction,
  useDrugs,
  type InteractionRow,
} from "@/hooks/supabase-calls/useDrugs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 20;

const SEVERITY_BADGE: Record<string, string> = {
  critical: "badge-red",
  major: "badge-amber",
  moderate: "badge-blue",
  minor: "badge-slate",
};

export default function InteractionsTab() {
  const [pageIndex, setPageIndex] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useDrugInteractions({
    search: debouncedSearch || undefined,
    severity: severity || undefined,
    limit: PAGE_SIZE,
    offset: (pageIndex - 1) * PAGE_SIZE,
  });

  const rows = data?.interactions || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const columns = useMemo<ColumnDef<InteractionRow>[]>(
    () => [
      {
        id: "drug_a",
        header: "Drug A",
        cell: ({ row }) => (
          <span className="font-bold text-slate-800">{row.original.drug_a?.name || "—"}</span>
        ),
      },
      {
        id: "drug_b",
        header: "Drug B",
        cell: ({ row }) => (
          <span className="font-bold text-slate-800">{row.original.drug_b?.name || "—"}</span>
        ),
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <span
            className={cn(
              "badge uppercase",
              SEVERITY_BADGE[row.original.severity] || "badge-slate",
            )}
          >
            {row.original.severity}
          </span>
        ),
      },
      {
        accessorKey: "effect",
        header: "Effect",
        cell: ({ row }) => (
          <span className="text-[11px] text-slate-600 max-w-[220px] inline-block truncate">
            {row.original.effect || "—"}
          </span>
        ),
      },
      {
        accessorKey: "recommended_action",
        header: "Recommended Action",
        cell: ({ row }) => (
          <span className="text-[11px] text-slate-600 max-w-[220px] inline-block truncate">
            {row.original.recommended_action || "—"}
          </span>
        ),
      },
      {
        id: "flags_30d",
        header: "Flags (30d)",
        cell: ({ row }) => (
          <span className="text-xs font-black text-slate-700">
            {(row.original as InteractionRow & { flags_30d?: number }).flags_30d ?? 0}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
          placeholder="🔍 Search by drug name or effect…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPageIndex(1);
          }}
        />
        <select
          className="h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white outline-none"
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPageIndex(1);
          }}
        >
          <option value="">All Severities</option>
          {INTERACTION_SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
          + Add Interaction
        </button>
      </div>

      <div className="card p-0 overflow-x-auto border border-slate-200 shadow-sm rounded-xl">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          selectable={false}
          pagination={{
            currentPage: pageIndex,
            totalPages,
            totalItems: totalCount,
            pageSize: PAGE_SIZE,
            onPageChange: setPageIndex,
            onNextPage: () => setPageIndex((p) => Math.min(totalPages, p + 1)),
            onPreviousPage: () => setPageIndex((p) => Math.max(1, p - 1)),
            canNextPage: pageIndex < totalPages,
            canPreviousPage: pageIndex > 1,
          }}
        />
      </div>

      <AddInteractionDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";
const labelCls =
  "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block";

function AddInteractionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [drugA, setDrugA] = useState<string | null>(null);
  const [drugB, setDrugB] = useState<string | null>(null);
  const [severity, setSeverity] = useState("moderate");
  const [effect, setEffect] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");

  const debouncedA = useDebounce(searchA, 400);
  const debouncedB = useDebounce(searchB, 400);
  const { data: drugsA } = useDrugs({ search: debouncedA || undefined, limit: 6 });
  const { data: drugsB } = useDrugs({ search: debouncedB || undefined, limit: 6 });
  const createInteraction = useCreateInteraction();

  const handleSubmit = () => {
    if (!drugA || !drugB || drugA === drugB) return;
    createInteraction.mutate(
      {
        drug_a_id: drugA,
        drug_b_id: drugB,
        severity,
        effect: effect.trim() || undefined,
        recommended_action: recommendedAction.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDrugA(null);
          setDrugB(null);
          setSearchA("");
          setSearchB("");
          setEffect("");
          setRecommendedAction("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚠️ Add Interaction Pair</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <DrugPicker
            label="Drug A"
            search={searchA}
            onSearch={setSearchA}
            options={drugsA?.drugs || []}
            selectedId={drugA}
            onSelect={setDrugA}
          />
          <DrugPicker
            label="Drug B"
            search={searchB}
            onSearch={setSearchB}
            options={drugsB?.drugs || []}
            selectedId={drugB}
            onSelect={setDrugB}
          />
          <div>
            <label className={labelCls}>Severity</label>
            <select className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {INTERACTION_SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Effect</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={2}
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
              placeholder="e.g. Increased risk of bleeding"
            />
          </div>
          <div>
            <label className={labelCls}>Recommended Action</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={2}
              value={recommendedAction}
              onChange={(e) => setRecommendedAction(e.target.value)}
              placeholder="e.g. Avoid combination; consult pharmacist"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm disabled:opacity-50"
            disabled={!drugA || !drugB || drugA === drugB || createInteraction.isPending}
            onClick={handleSubmit}
          >
            {createInteraction.isPending ? "Saving…" : "Add Interaction"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DrugPicker({
  label,
  search,
  onSearch,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  search: string;
  onSearch: (v: string) => void;
  options: { id: string; name: string; generic_name: string | null }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = options.find((d) => d.id === selectedId);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <span className="text-xs font-bold text-emerald-800">{selected.name}</span>
          <button
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 cursor-pointer"
            onClick={() => onSelect("")}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            className={inputCls}
            placeholder="🔍 Search catalog…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {options.map((drug) => (
                <button
                  key={drug.id}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50/50 cursor-pointer"
                  onClick={() => onSelect(drug.id)}
                >
                  <span className="font-bold text-slate-700">{drug.name}</span>
                  <span className="text-slate-400"> · {drug.generic_name || ""}</span>
                </button>
              ))}
              {options.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-slate-400">No matches.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
