"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  useChallenges,
  useDeleteChallenge,
} from "@/hooks/supabase-calls/useChallenge";
import {
  useAddChallengeDialog,
  useViewChallengeDialog,
} from "@/stores/dialog-store";
import AddChallengeDialog from "../_components/add-challenge-dialog";
import ViewChallengeDialog from "../_components/view-challenge-dialog";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Target,
  Users,
  ShieldCheck,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

const ChallengesTab = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_chal_page") || "1", 10);

  const challengeDialog = useAddChallengeDialog();
  const viewDialog = useViewChallengeDialog();
  const { data, isLoading } = useChallenges({
    page,
    limit,
    search: debouncedSearch,
  });
  const { mutate: deleteChallenge } = useDeleteChallenge();

  const handleEdit = useCallback(
    (row: any) => {
      challengeDialog.open(row);
    },
    [challengeDialog],
  );

  const handleView = useCallback(
    (id: string) => {
      viewDialog.open(id);
    },
    [viewDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to delete this challenge?")) {
        deleteChallenge(id);
      }
    },
    [deleteChallenge],
  );

  const columns = [
    {
      accessorKey: "name",
      header: "Challenge Details",
      cell: ({ row }: any) => (
        <div className="flex flex-col min-w-[200px]">
          <span className="font-bold text-slate-800">{row.original.name}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {row.original.category || "Fitness"}
          </span>
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
            row.original.status === "active"
              ? "badge-green"
              : row.original.status === "draft"
                ? "bg-slate-100 text-slate-600"
                : "badge-amber",
          )}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "participants",
      header: "Participants",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400"
              >
                U
              </div>
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-800">
            {row.original.total_participants || 0} joined
          </span>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }: any) => (
        <div className="text-[11px] font-medium text-slate-600">
          {row.original.start_date && row.original.end_date
            ? `${new Date(row.original.start_date).toLocaleDateString()} - ${new Date(row.original.end_date).toLocaleDateString()}`
            : "Ongoing"}
        </div>
      ),
    },
    {
      accessorKey: "rewards",
      header: "Rewards",
      cell: ({ row }: any) => (
        <span className="badge badge-gold h-5 text-[10px] uppercase font-black gap-1">
          🪙 {row.original.rewards?.fitcoins || 0} FitCoins
        </span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", icon: "👁️", onClick: (row: any) => handleView(row.id) },
    { label: "Edit", icon: "✏️", onClick: handleEdit },
    {
      label: "Delete",
      icon: "🗑️",
      onClick: (row: any) => handleDelete(row.id),
      danger: true,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 card bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800">
                🏆 Active Challenges
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Community-wide fitness events and goal tracking
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => challengeDialog.open()}
            >
              <Plus className="h-4 w-4 mr-1" /> New Challenge
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by challenge name..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary">
              <Filter className="h-4 w-4 mr-1" /> Status
            </button>
          </div>
        </div>

        <div className="card bg-amber-500 text-white relative overflow-hidden">
          <Trophy className="absolute -bottom-4 -right-4 h-24 w-24 text-white/20 rotate-12" />
          <h3 className="text-lg font-black mb-6">📢 Participation</h3>
          <div className="space-y-6 relative z-10">
            {[
              { label: "Active Challenges", val: 48, icon: Target },
              { label: "Total Participants", val: "3,240", icon: Users },
              { label: "Avg Completion", val: "62%", icon: ShieldCheck },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100 opacity-80">
                    {stat.label}
                  </p>
                  <h4 className="text-lg font-black">{stat.val}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.challenges || []}
          rowActions={rowActions}
          isLoading={isLoading}
          pagination={true}
          urlPersistence={{
            pageKey: "fit_chal_page",
            pageSizeKey: "fit_chal_pageSize",
          }}
          totalItems={data?.meta?.total || 0}
        />
      </div>

      <AddChallengeDialog />
      <ViewChallengeDialog />
    </div>
  );
};

export default ChallengesTab;
