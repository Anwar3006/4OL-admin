"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { useFitnessUsers, type FitnessUserRow } from "@/hooks/supabase-calls/useFitnessAnalytics";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

/**
 * Fitness Users (Gap Analysis Part V) — rebuilt from the generic 4-column
 * user table to the mockup's fitness-specific columns, fed by the
 * get_fitness_users RPC (server-side aggregates, V-D5). Body Type / Goals /
 * Streak are not modeled in the schema (fitness_users only stores plan +
 * level), so the closest available fields are shown instead.
 */

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

const UsersTab = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 25;
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_user_page") || "1", 10);

  const { data, isLoading, isError, error } = useFitnessUsers({
    page,
    limit,
    search: debouncedSearch,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden shrink-0">
              {row.original.avatar_url ? (
                <Image
                  src={row.original.avatar_url}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                (row.original.name || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-800 text-[11px] truncate">
                {row.original.name || "Unnamed user"}
              </span>
              <span className="text-[10px] text-slate-400">
                Joined {formatDate(row.original.joined_at)}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "level",
        header: "Tier / Level",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="badge badge-blue h-5 text-[9px] uppercase font-black">
            {row.original.level || "—"}
          </span>
        ),
      },
      {
        accessorKey: "plan",
        header: "Current Plan",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-[11px] font-semibold text-slate-700">
            {row.original.plan}
          </span>
        ),
      },
      {
        accessorKey: "plan_completions",
        header: "Plan Compl.",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-[11px] font-bold text-slate-700">
            {row.original.plan_completions.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "workouts",
        header: "Workouts",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-800">
              {row.original.workouts.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase">
              {Number(row.original.kcal || 0).toLocaleString()} kcal
            </span>
          </div>
        ),
      },
      {
        accessorKey: "fitcoins",
        header: "FitCoins",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-[11px] font-black text-yellow-600">
            🪙 {row.original.fitcoins.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "ai_calls",
        header: "AI Calls",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-[11px] font-bold text-purple-600">
            {row.original.ai_calls.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "last_active",
        header: "Last Active",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-[11px] font-medium text-slate-600">
            {formatDate(row.original.last_active)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span
            className={`badge h-5 text-[9px] uppercase font-black ${
              row.original.status === "banned"
                ? "badge-red"
                : "badge-green"
            }`}
          >
            {row.original.status || "active"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <div className="flex items-center justify-end gap-2">
            <a
              aria-label="Open user profile"
              href={`/users?search=${encodeURIComponent(row.original.name || row.original.user_id)}`}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              👁️
            </a>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <div className="lg:col-span-3 card bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800">
                👥 Fitness Users
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Plans, workout volume, FitCoins and AI usage per member
              </p>
            </div>
            <span className="badge badge-green h-6 text-[10px] uppercase font-black">
              {data ? `${data.meta.total.toLocaleString()} members` : "…"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by name..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.rows || []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          pagination={true}
          urlPersistence={{
            pageKey: "fit_user_page",
            pageSizeKey: "fit_user_pageSize",
          }}
          totalItems={data?.meta?.total || 0}
        />
      </div>
    </div>
  );
};

export default UsersTab;
