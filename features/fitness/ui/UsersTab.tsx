"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { useFitnessUsers, type FitnessUserRow } from "@/features/fitness/data/useFitnessAnalytics";
import { Search, Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { usePermissionContext } from "@/stores/permission-context";
import { useViewFitnessUserDialog } from "@/features/fitness/data/dialog-hooks";
import ViewFitnessUserDialog from "./view-fitness-user-dialog";
import FitnessAlertComposer from "./FitnessAlertComposer";
import "@/components/mockup-theme/mockup-theme.css";

// Beginner/intermediate/advanced -> traffic-light badge, same mapping
// already used for exercise difficulty in features/fitness/ui/exerciseColumns.tsx.
const EXPERIENCE_BADGE: Record<string, string> = {
  beginner: "b bg",
  intermediate: "b by",
  advanced: "b br",
};

// fitness_onboarding_selections.fitness_goals is a free-form string[]; this
// covers the values seen in practice, falling back to a neutral badge for
// anything unrecognized rather than hiding the goal.
const GOAL_BADGE: Record<string, string> = {
  muscle: "b bg",
  muscle_gain: "b bg",
  fat_loss: "b br",
  weight_loss: "b br",
  sport: "b bbl",
  endurance: "b bt",
  flexibility: "b bin",
  general_fitness: "b bpu",
};

const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

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
  const viewUser = useViewFitnessUserDialog<FitnessUserRow>();

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
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xs font-bold text-slate-400 overflow-hidden shrink-0">
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
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                {row.original.name || "Unnamed user"}
              </span>
              <span className="text-2xs text-slate-400">
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
              className={`badge h-5 text-3xs uppercase font-black w-fit ${
                row.original.is_premium ? "badge-green" : "badge-slate"
              }`}
            >
              {row.original.tier_name || "Free"}
            </span>
            {row.original.is_premium && (
              <span className="text-3xs text-slate-400 font-bold">
                {row.original.subscription_expires_at
                  ? `Until ${formatDate(row.original.subscription_expires_at)}`
                  : "Lifetime"}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "body_type",
        header: "Body Type",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {row.original.body_type ? titleCase(row.original.body_type) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "level",
        header: "Experience",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => {
          const level = row.original.level;
          const badgeClass = level ? EXPERIENCE_BADGE[level] ?? "b bdk" : "b bdk";
          return (
            <span className={badgeClass}>{level ? titleCase(level) : "—"}</span>
          );
        },
      },
      {
        accessorKey: "fitness_goals",
        header: "Goals",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => {
          const goals = row.original.fitness_goals;
          if (!goals?.length) return <span className="text-3xs text-slate-400">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {goals.map((goal) => (
                <span key={goal} className={GOAL_BADGE[goal] ?? "b bdk"}>
                  {titleCase(goal)}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "plan",
        header: "Current Plan",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {row.original.plan}
          </span>
        ),
      },
      {
        accessorKey: "plan_completion_pct",
        header: "Plan Compl.",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => {
          const pct = Math.min(100, Math.max(0, row.original.plan_completion_pct ?? 0));
          return (
            <div className="min-w-17.5">
              <span className="text-3xs font-black text-slate-700 dark:text-slate-300">
                {pct}%
              </span>
              <div className="pgb">
                <div className="pgbf" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "workouts",
        header: "Workouts",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              {row.original.workouts.toLocaleString()}
            </span>
            <span className="text-3xs text-slate-400 font-bold uppercase">
              {Number(row.original.kcal || 0).toLocaleString()} kcal
            </span>
          </div>
        ),
      },
      {
        accessorKey: "fitcoins",
        header: "FitCoins",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-xs font-black text-yellow-600 dark:text-yellow-400">
            🪙 {row.original.fitcoins.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "ai_calls",
        header: "AI Calls",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
            {row.original.ai_calls.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "last_active",
        header: "Last Active",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {formatDate(row.original.last_active)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: { row: { original: FitnessUserRow } }) => (
          <span
            className={`badge h-5 text-3xs uppercase font-black ${
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
                className={`h-8 px-2.5 rounded-lg text-2xs font-black uppercase transition-colors disabled:opacity-50 ${
                  row.original.is_premium
                    ? "text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15"
                    : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15"
                }`}
              >
                {pendingUserId === row.original.user_id
                  ? "…"
                  : row.original.is_premium
                    ? "Make Free"
                    : "Make Premium"}
              </button>
            )}
            <button
              type="button"
              aria-label="View fitness profile"
              onClick={(e) => {
                e.stopPropagation();
                viewUser.open(row.original);
              }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [isSuperAdmin, pendingUserId, handleGrant, handleRevoke, viewUser],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <div className="lg:col-span-3 card bg-white dark:bg-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">
                👥 Fitness Users
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Plans, workout volume, FitCoins and AI usage per member
              </p>
            </div>
            <span className="badge badge-green h-6 text-2xs uppercase font-black">
              {data ? `${data.meta.total.toLocaleString()} members` : "…"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by name..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden mockup-theme">
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
          onRowClick={(row: FitnessUserRow) => viewUser.open(row)}
        />
      </div>
      <FitnessAlertComposer />
      <ViewFitnessUserDialog />
    </div>
  );
};

export default UsersTab;
