"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import DataTable from "@/components/redesign/DataTable";
import { useTrainers, useDeleteTrainer } from "@/hooks/supabase-calls/useTrainer";
import { useAddTrainerDialog, useViewTrainerDialog } from "@/stores/dialog-store";
import AddTrainerDialog from "../_components/add-trainer-dialog";
import ViewTrainerDialog from "../_components/view-trainer-dialog";
import { cn } from "@/lib/utils";
import { UserSquare, Search, Filter, Plus, ShieldCheck, Star } from "lucide-react";

const TrainersTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const trainerDialog = useAddTrainerDialog();
  const viewTrainer = useViewTrainerDialog();
  const { data, isLoading } = useTrainers({ page, limit, search: debouncedSearch });
  const { mutate: deleteTrainer } = useDeleteTrainer();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleEdit = useCallback(
    (row: any) => {
      trainerDialog.open(row);
    },
    [trainerDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to remove this trainer?")) {
        deleteTrainer(id);
      }
    },
    [deleteTrainer],
  );

  const columns = [
    {
      key: "trainer",
      label: "Trainer Profile",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden">
            {row.user_profiles?.avatar_url ? <img src={row.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (row.user_profiles?.first_name?.[0] || 'T')}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
                <span className="font-bold text-slate-800">{row.user_profiles?.first_name} {row.user_profiles?.last_name}</span>
                {row.is_verified && <ShieldCheck className="w-3 h-3 text-emerald-500 fill-emerald-50" />}
            </div>
            <span className="text-[10px] text-slate-400">{row.user_profiles?.email}</span>
          </div>
        </div>
      )
    },
    {
      key: "specialties",
      label: "Specialties",
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val?.slice(0, 2).map((s, i) => (
            <span key={i} className="badge badge-purple uppercase text-[9px]">{s}</span>
          ))}
          {val?.length > 2 && <span className="text-[9px] text-slate-400">+{val.length - 2}</span>}
        </div>
      )
    },
    {
      key: "experience",
      label: "Experience",
      render: (_: any, row: any) => (
        <span className="text-[11px] font-bold text-slate-800">{row.years_experience || 0} years</span>
      )
    },
    {
      key: "rating",
      label: "Rating",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          {row.average_rating?.toFixed(1) || "5.0"}
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <span className={cn(
          "badge uppercase tracking-wider text-[10px]",
          val === 'active' ? 'badge-green' : 'badge-amber'
        )}>{val}</span>
      )
    }
  ];

  const rowActions = [
    { label: "View Profile", icon: "👁️", onClick: (row: any) => viewTrainer.open(row.id) },
    { label: "Edit", icon: "✏️", onClick: handleEdit },
    { label: "Delete", icon: "🗑️", onClick: (row: any) => handleDelete(row.id), danger: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 card bg-white">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                 <h3 className="text-2xl font-black text-slate-800">👨‍🏫 Trainer Directory</h3>
                 <p className="text-slate-500 font-medium mt-1">Manage certified fitness professionals and availability</p>
              </div>
              <button className="btn btn-primary" onClick={() => trainerDialog.open()}>
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

        <div className="card bg-slate-900 text-white">
           <h3 className="text-lg font-black mb-6">📊 Trainer Stats</h3>
           <div className="space-y-6">
              {[
                { label: "Total Trainers", val: 48, icon: UserSquare },
                { label: "Verified Status", val: "75%", icon: ShieldCheck },
                { label: "Avg Rating", val: "4.8", icon: Star },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                         <stat.icon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-400">{stat.label}</span>
                   </div>
                   <span className="text-lg font-black">{stat.val}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.trainers || []}
          rowActions={rowActions}
          isLoading={isLoading}
          externalPage={page}
          externalTotalPages={data?.meta?.totalPages || 1}
          onPageChange={setPage}
        />
      </div>

      <AddTrainerDialog />
      <ViewTrainerDialog />
    </div>
  );
};

export default TrainersTab;
