"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Search, Filter, Plus, Trophy, Target, Users, ShieldCheck } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { createChallengeColumns } from "@/components/Data-Table/columns/challengeColumns";
import { createPaginationHandlers } from "@/lib/utils";
import { useChallenges, useDeleteChallenge } from "@/hooks/supabase-calls/useChallenge";
import { useAddChallengeDialog, useViewChallengeDialog } from "@/stores/dialog-store";
import AddChallengeDialog from "../_components/add-challenge-dialog";
import ViewChallengeDialog from "../_components/view-challenge-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TChallengeOutput } from "@/schemas/challenge.schema";

const ChallengesTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const challengeDialog = useAddChallengeDialog();
  const viewDialog = useViewChallengeDialog();
  const { data, isLoading } = useChallenges({ page, limit, search: debouncedSearch });
  const { mutate: deleteChallenge } = useDeleteChallenge();

  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const paginationHandlers = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta?.totalPages ?? 1),
    [page, data?.meta?.totalPages],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: limit,
      onPageChange: paginationHandlers.goTo,
      onNextPage: paginationHandlers.next,
      onPreviousPage: paginationHandlers.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, paginationHandlers],
  );

  const handleEdit = useCallback(
    (row: TChallengeOutput) => {
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

  const columns = useMemo(
    () => createChallengeColumns({ onEdit: handleEdit, onDelete: handleDelete, onView: handleView }),
    [handleEdit, handleDelete, handleView],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Challenges Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-sm rounded-[2rem] bg-white">
          <CardHeader className="p-8 pb-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <CardTitle className="text-2xl font-black">🏆 Active Challenges</CardTitle>
                   <p className="text-slate-500 font-medium mt-1">Community-wide fitness events and goal tracking</p>
                </div>
                <Button className="rounded-xl font-bold bg-[#2cc295] hover:bg-[#25a37d]" onClick={() => challengeDialog.open()}>
                  <Plus className="h-4 w-4 mr-2" /> New Challenge
                </Button>
             </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
             <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by challenge name..."
                    className="pl-9 h-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-emerald-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-12 rounded-2xl font-bold border-slate-200">
                  <Filter className="h-4 w-4 mr-2" /> Status
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-amber-500 text-white p-8 relative overflow-hidden">
           <Trophy className="absolute -bottom-4 -right-4 h-24 w-24 text-white/20 rotate-12" />
           <CardTitle className="text-lg font-black mb-6">📢 Participation</CardTitle>
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100 opacity-80">{stat.label}</p>
                      <h4 className="text-lg font-black">{stat.val}</h4>
                   </div>
                </div>
              ))}
           </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.challenges || []}
            pagination={pagination}
            isLoading={isLoading}
            onRowClick={(row) => handleView(row.id!)}
          />
        </CardContent>
      </Card>

      <AddChallengeDialog />
      <ViewChallengeDialog />
    </div>
  );
};

export default ChallengesTab;
