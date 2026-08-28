"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { useFitnessUsers, type FitnessUserRow } from "@/hooks/supabase-calls/useFitnessAnalytics";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { usePermissionContext } from "@/stores/permission-context";

/**
 * Fitness Users (Gap Analysis Part V) — fitness-specific columns fed by the
 * get_fitness_users RPC (server-side aggregates, V-D5).
 *
 * Two fixes here, both from the same root cause. get_fitness_users used to
 * read public.fitness_users, which fitness_user_assignments replaced and
 * which nothing has written to since — so this tab showed ZERO members no
 * matter how many people were training. It now reads real engagement
 * (onboarded / assigned a plan / logged a session).
 *
 * And the column headed "Tier / Level" rendered fitness_users.current_level,
 * a beginner/intermediate TRAINING level with nothing to do with Premium.
 * Subscription tier is now its own column, with grant/revoke inline, so the
 * list an admin assigns premium FROM is the list that shows who has it.
 * Grant/revoke is super-admin only, matching /api/subscriptions/admin, which
 * enforces the same rule server-side.
 */

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

const UsersTab = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 25;
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { userRole } = usePermissionContext();
  const isSuperAdmin = userRole === "super_admin";
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_user_page") || "1", 10);

  const { data, isLoading, isError, error } = useFitnessUsers({
    page,
    limit,
    search: debouncedSearch,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["fitness-users"] }),
    [queryClient],
  );

  const handleGrant = useCallback(
    async (row: FitnessUserRow) => {
      if (!confirm(`Give ${row.name || "this user"} Premium access?`)) return;
      setPendingUserId(row.user_id);
      try {
        const res = await fetch("/api/subscriptions/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: row.user_id,
            tierKey: "premium",
            note: "Granted from Fitness ▸ Users",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Grant failed");
        toast.success(`Premium assigned to ${row.name || "user"}`);
        refresh();
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setPendingUserId(null);
      }
    },
    [refresh],
  );

  // Revoking the active grant is what "set back to Free" means — entitlement
  // is the absence of an active user_subscriptions row, not a 'free' row.
  const handleRevoke = useCallback(
    async (row: FitnessUserRow) => {
      if (!confirm(`Return ${row.name || "this user"} to the Free tier?`)) return;
      setPendingUserId(row.user_id);
      try {
        const res = await fetch("/api/subscriptions/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: row.user_id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Revoke failed");
        toast.success(`${row.name || "User"} moved back to Free`);
        refresh();
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setPendingUserId(null);
      }
    },
    [refresh],
  );

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
        accessorKey: "tier_key",
        header: "Subscription",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <div className="flex flex-col gap-0.5">
            <span
              className={`badge h-5 text-[9px] uppercase font-black w-fit ${
                row.original.is_premium ? "badge-green" : "badge-slate"
              }`}
            >
              {row.original.tier_name || "Free"}
            </span>
            {row.original.is_premium && (
              <span className="text-[9px] text-slate-400 font-bold">
                {row.original.subscription_expires_at
                  ? `Until ${formatDate(row.original.subscription_expires_at)}`
                  : "Lifetime"}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "level",
        header: "Training Level",
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
            {isSuperAdmin && (
              <button
                type="button"
                disabled={pendingUserId === row.original.user_id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.original.is_premium) handleRevoke(row.original);
                  else handleGrant(row.original);
                }}
                className={`h-8 px-2.5 rounded-lg text-[10px] font-black uppercase transition-colors disabled:opacity-50 ${
                  row.original.is_premium
                    ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                    : "text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                {pendingUserId === row.original.user_id
                  ? "…"
                  : row.original.is_premium
                    ? "Make Free"
                    : "Make Premium"}
              </button>
            )}
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
    [isSuperAdmin, pendingUserId, handleGrant, handleRevoke],
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
