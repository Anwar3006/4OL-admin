"use client";

import React, { useMemo, useState, useCallback } from "react";
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
  useChallenges,
  useDeleteChallenge,
} from "@/features/fitness/data/useChallenge";
import { useAddChallengeDialog, useViewChallengeDialog } from "@/features/fitness/data/dialog-hooks";
import AddChallengeDialog from "./add-challenge-dialog";
import ViewChallengeDialog from "./view-challenge-dialog";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Target,
  Users,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Calendar,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const ChallengesTab = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_chal_page") || "1", 10);

  const challengeDialog = useAddChallengeDialog();
  const viewDialog = useViewChallengeDialog();
  const { data, isLoading, isError, error } = useChallenges({
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

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = useCallback(
    (id: string) => {
      setDeleteId(id);
    },
    [],
  );

  const confirmDelete = useCallback(() => {
    if (deleteId) {
      deleteChallenge(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteChallenge]);

  const columns = useMemo(
    () => [
    {
      accessorKey: "title",
      header: "Challenge",
      cell: ({ row }: any) => {
        const challenge = row.original;
        return (
          <div className="flex flex-col gap-0.5 min-w-[220px]">
            <span className="font-bold text-slate-900 text-sm leading-tight">
              {challenge.title}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[9px] h-5 px-1.5 font-bold uppercase tracking-wider border-slate-200 text-slate-500"
              >
                {challenge.challenge_type}
              </Badge>
              {challenge.tags?.length > 0 && (
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                  {challenge.tags.slice(0, 2).join(", ")}
                  {challenge.tags.length > 2 && "..."}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "goal",
      header: "Goal",
      cell: ({ row }: any) => {
        const { goal_metric, goal_value } = row.original;
        if (!goal_metric || !goal_value)
          return (
            <span className="text-[11px] text-slate-400 italic">
              No goal set
            </span>
          );
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-800">
                {Number(goal_value).toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 capitalize">
                {goal_metric}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      // Part V: mockup Origin column. fitness_challenges has no explicit
      // origin flag, so derive it: created_by set → Admin-authored,
      // otherwise System/seeded. AI-generated challenges are authored by
      // admins through the AI Studio flow, same as plans.
      accessorKey: "origin",
      header: "Origin",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge uppercase tracking-wider text-[10px]",
            row.original.created_by
              ? "badge-blue"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {row.original.created_by ? "Admin" : "System"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status;
        return (
          <Badge
            className={cn(
              "h-5 px-2 text-[10px] font-black uppercase tracking-wider border-0",
              status === "active" &&
                "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
              status === "draft" &&
                "bg-slate-100 text-slate-600 hover:bg-slate-100",
              status === "upcoming" &&
                "bg-blue-100 text-blue-700 hover:bg-blue-100",
              status === "completed" &&
                "bg-amber-100 text-amber-700 hover:bg-amber-100",
            )}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "participants",
      header: "Participants",
      cell: ({ row }: any) => {
        const current = row.original.current_participants ?? 0;
        const max = row.original.max_participants;
        const isFull = max && current >= max;
        return (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-[11px] font-bold",
                  isFull ? "text-amber-600" : "text-slate-800",
                )}
              >
                {current.toLocaleString()}
                {max ? ` / ${max}` : ""}
              </span>
              {max && (
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {isFull ? "Full" : `${max - current} left`}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }: any) => {
        const { start_date, end_date } = row.original;
        if (!start_date || !end_date)
          return <span className="text-[11px] text-slate-400">—</span>;
        const start = new Date(start_date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        const end = new Date(end_date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-600">
              {start} – {end}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "reward",
      header: "Reward",
      cell: ({ row }: any) => {
        const reward = row.original.reward_description;
        if (!reward)
          return <span className="text-[11px] text-slate-400">—</span>;
        return (
          <Badge className="h-6 px-2.5 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 gap-1">
            <Trophy className="w-3 h-3 text-amber-600" />
            <span className="truncate max-w-[140px]">{reward}</span>
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const challenge = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                handleView(challenge.id);
              }}
            >
              👁️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(challenge);
              }}
            >
              ✏️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(challenge.id);
              }}
            >
              🗑️
            </button>
          </div>
        );
      },
    },
    ],
    [handleDelete, handleEdit, handleView],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
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
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.challenges || []}
          isLoading={isLoading}
          isError={isError}
          error={error}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this challenge?
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

export default ChallengesTab;
