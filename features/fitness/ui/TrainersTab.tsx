"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useTrainers,
  useDeleteTrainer,
  useVerifyTrainer,
} from "@/hooks/supabase-calls/useTrainer";
import {
  useAddTrainerDialog,
  useViewTrainerDialog,
} from "@/stores/dialog-store";
import AddTrainerDialog from "./add-trainer-dialog";
import ViewTrainerDialog from "./view-trainer-dialog";
import { cn } from "@/lib/utils";
import {
  UserSquare,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

const TrainersTab = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_train_page") || "1", 10);

  const trainerDialog = useAddTrainerDialog();
  const viewTrainer = useViewTrainerDialog();
  const { data, isLoading, isError, error } = useTrainers({
    page,
    limit,
    search: debouncedSearch,
  });
  const { mutate: deleteTrainer } = useDeleteTrainer();
  const { mutate: verifyTrainer } = useVerifyTrainer();

  const handleEdit = useCallback(
    (row: any) => {
      trainerDialog.open(row);
    },
    [trainerDialog],
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = useCallback(
    (id: string) => {
      setDeleteId(id);
    },
    [],
  );

  const confirmDelete = useCallback(() => {
    if (deleteId) {
      deleteTrainer(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteTrainer]);

  const columns = useMemo(
    () => [
    {
      accessorKey: "trainer",
      header: "Trainer Profile",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden">
            {row.original.user_profiles?.avatar_url ? (
              <Image
                src={row.original.user_profiles.avatar_url}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              row.original.user_profiles?.first_name?.[0] || "T"
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800">
                {row.original.user_profiles?.first_name}{" "}
                {row.original.user_profiles?.last_name}
              </span>
              {row.original.is_verified && (
                <ShieldCheck className="w-3 h-3 text-emerald-500 fill-emerald-50" />
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {row.original.user_profiles?.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "specialties",
      header: "Specialties",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {row.original.specialties?.slice(0, 2).map((s: string, i: number) => (
            <span key={i} className="badge badge-purple uppercase text-[9px]">
              {s}
            </span>
          ))}
          {row.original.specialties?.length > 2 && (
            <span className="text-[9px] text-slate-400">
              +{row.original.specialties.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "experience",
      header: "Experience",
      cell: ({ row }: any) => (
        <span className="text-[11px] font-bold text-slate-800">
          {row.original.years_experience || 0} years
        </span>
      ),
    },
    {
      accessorKey: "certifications",
      header: "Documents",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {row.original.certifications?.length ? (
            <>
              {row.original.certifications.slice(0, 2).map((c: string, i: number) => (
                <span key={i} className="badge badge-blue uppercase text-[9px]">
                  📄 {c}
                </span>
              ))}
              {row.original.certifications.length > 2 && (
                <span className="text-[9px] text-slate-400">
                  +{row.original.certifications.length - 2}
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-slate-400">None on file</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          {row.original.average_rating?.toFixed(1) || "5.0"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge uppercase tracking-wider text-[10px]",
            row.original.status === "active" ? "badge-green" : "badge-amber",
          )}
        >
          {row.original.status}
        </span>
      ),
    },
    ],
    [],
  );

  const rowActions = [
    {
      label: "View Profile",
      icon: "👁️",
      onClick: (row: any) => viewTrainer.open(row.id),
    },
    { label: "Edit", icon: "✏️", onClick: handleEdit },
    {
      label: "Verify / Revoke",
      icon: "🛡️",
      onClick: (row: any) => {
        const verify = !row.is_verified;
        if (
          globalThis.confirm(
            verify
              ? `Verify ${row.user_profiles?.first_name ?? "this trainer"}'s documents and activate their profile?`
              : `Revoke verification for ${row.user_profiles?.first_name ?? "this trainer"}? Their status returns to pending.`,
          )
        ) {
          verifyTrainer({ id: row.id, verify });
        }
      },
    },
    {
      label: "Delete",
      icon: "🗑️",
      onClick: (row: any) => handleDelete(row.id),
      danger: true,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <div className="lg:col-span-3 card bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800">
                👨‍🏫 Trainer Directory
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Manage certified fitness professionals and availability
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => trainerDialog.open()}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Trainer
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by trainer name or specialty..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-1" /> Verification
            </button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.trainers || []}
          rowActions={rowActions}
          isLoading={isLoading}
          isError={isError}
          error={error}
          pagination={true}
          urlPersistence={{
            pageKey: "fit_train_page",
            pageSizeKey: "fit_train_pageSize",
          }}
          totalItems={data?.meta?.total || 0}
        />
      </div>

      <AddTrainerDialog />
      <ViewTrainerDialog />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this trainer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrainersTab;
