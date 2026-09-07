"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DRUG_CATEGORIES,
  DRUG_STATUSES,
  DRUG_AVAILABILITY,
} from "@/lib/shared-constants";
import {
  useDrugs,
  useDeleteDrug,
  type DrugRow,
} from "@/features/medication-reminder/data/useDrugs";
import AddEditDrugDialog from "./AddEditDrugDialog";
import ImportDrugsDialog from "./ImportDrugsDialog";
import VerificationQueue from "./VerificationQueue";
import { downloadCsv } from "@/lib/csv";

const PAGE_SIZE = 20;

const AVAILABILITY_BADGE: Record<string, { cls: string; label: string }> = {
  otc: { cls: "badge-green", label: "OTC" },
  rx_only: { cls: "badge-amber", label: "Rx Only" },
  controlled: { cls: "badge-red", label: "Controlled" },
  unknown: { cls: "badge-slate", label: "Unknown" },
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  active: { cls: "badge-green", label: "✅ Active" },
  discontinued: { cls: "badge-red", label: "Discontinued" },
  under_review: { cls: "badge-amber", label: "🔍 Under Review" },
  unverified: { cls: "badge-slate", label: "Unverified" },
};

const selectCls =
  "h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white outline-none";

export default function DrugDatabaseTab() {
  const [pageIndex, setPageIndex] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [availability, setAvailability] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DrugRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const deleteDrug = useDeleteDrug();

  // Page header "+ Add Drug" dispatches this event (see page.tsx).
  useEffect(() => {
    const openAdd = () => {
      setEditTarget(null);
      setAddEditOpen(true);
    };
    window.addEventListener("medication:add-drug", openAdd);
    return () => window.removeEventListener("medication:add-drug", openAdd);
  }, []);

  const { data, isLoading } = useDrugs({
    search: debouncedSearch || undefined,
    category: category || undefined,
    status: status || undefined,
    availability: availability || undefined,
    limit: PAGE_SIZE,
    offset: (pageIndex - 1) * PAGE_SIZE,
  });

  const rows = data?.drugs || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const resetPage = () => setPageIndex(1);

  const handleExport = async () => {
    const qs = new URLSearchParams({ limit: "5000" });
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (category) qs.set("category", category);
    if (status) qs.set("status", status);
    if (availability) qs.set("availability", availability);
    const res = await fetch(`/api/medication/drugs?${qs.toString()}`);
    const json = await res.json();
    const drugs: DrugRow[] = json.drugs ?? [];
    downloadCsv(
      drugs.map((d) => ({
        name: d.name,
        generic_name: d.generic_name,
        category: d.category,
        availability: d.availability,
        dosage_form: d.dosage_form,
        strength: d.strength,
        strength_unit: d.strength_unit,
        pack_size: d.pack_size,
        manufacturer: d.manufacturer,
        status: d.status,
        atc_code: d.atc_code,
      })),
      "drug-database-export",
    );
  };

  const columns = useMemo<ColumnDef<DrugRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Drug Name",
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-800">{row.original.name}</div>
            <div className="text-2xs text-slate-400">
              {[row.original.dosage_form, row.original.manufacturer]
                .filter(Boolean)
                .join(" · ") || "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "generic_name",
        header: "Generic Name",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">{row.original.generic_name || "—"}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="badge badge-blue">{row.original.category || "Other"}</span>
        ),
      },
      {
        accessorKey: "availability",
        header: "Availability",
        cell: ({ row }) => {
          const cfg = AVAILABILITY_BADGE[row.original.availability] || AVAILABILITY_BADGE.unknown;
          return <span className={cn("badge", cfg.cls)}>{cfg.label}</span>;
        },
      },
      {
        id: "strength",
        header: "Strength",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-600">
            {row.original.strength
              ? `${row.original.strength}${row.original.strength_unit ?? ""}`
              : "—"}
            {row.original.pack_size ? ` · ${row.original.pack_size}'s` : ""}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const cfg = STATUS_BADGE[row.original.status] || STATUS_BADGE.unverified;
          return <span className={cn("badge", cfg.cls)}>{cfg.label}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              className="hover:bg-emerald-100 rounded p-1 cursor-pointer"
              aria-label="Edit drug"
              onClick={() => {
                setEditTarget(row.original);
                setAddEditOpen(true);
              }}
            >
              ✏️
            </button>
            <button
              className="hover:bg-red-100 rounded p-1 cursor-pointer"
              aria-label="Delete drug"
              onClick={() => {
                if (confirm(`Delete "${row.original.name}" from the catalog?`)) {
                  deleteDrug.mutate(row.original.id);
                }
              }}
            >
              🗑️
            </button>
          </div>
        ),
      },
    ],
    [deleteDrug],
  );

  return (
    <div className="space-y-6 mt-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
          placeholder="🔍 Search drug, generic name, manufacturer…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
        />
        <select
          className={selectCls}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            resetPage();
          }}
        >
          <option value="">All Categories</option>
          {DRUG_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            resetPage();
          }}
        >
          <option value="">All Statuses</option>
          {DRUG_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          className={selectCls}
          value={availability}
          onChange={(e) => {
            setAvailability(e.target.value);
            resetPage();
          }}
        >
          <option value="">All Availability</option>
          {DRUG_AVAILABILITY.map((a) => (
            <option key={a} value={a}>
              {a === "rx_only" ? "Rx Only" : a.toUpperCase()}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => setImportOpen(true)}>
          📥 Import
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          📤 Export
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditTarget(null);
            setAddEditOpen(true);
          }}
        >
          + Add Drug
        </button>
      </div>

      {/* Catalog table */}
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

      {/* Unknown-drug verification queue (B.6) */}
      <div className="card border border-slate-200 shadow-sm rounded-xl">
        <VerificationQueue />
      </div>

      <AddEditDrugDialog open={addEditOpen} onOpenChange={setAddEditOpen} drug={editTarget} />
      <ImportDrugsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
