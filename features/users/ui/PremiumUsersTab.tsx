"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Crown, Users, Star, Sparkles } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { usePagination } from "@/hooks/use-pagination";
import { useViewUserDialog } from "@/features/users/data/dialog-hooks";
import { useHasPermission } from "@/stores/permission-context";
import { formatCurrency } from "@/lib/format";
import {
  AdminUserRow,
  useAdminUsers,
  useUpdateUserPlan,
} from "@/features/users/data/useAdminUsers";

// NOTE: plan pricing is provisional (C-D5) — confirm against the
// subscription_plans seed before billing goes live (Epic 16).
const PLAN_TIERS = [
  { value: "standard", label: "Standard", price: `${formatCurrency(60)}/mo`, icon: Star, variant: "blue" },
  { value: "premium", label: "Premium", price: `${formatCurrency(150)}/mo`, icon: Crown, variant: "purple" },
  { value: "featured", label: "Featured", price: `${formatCurrency(350)}/mo`, icon: Sparkles, variant: "green" },
] as const;

const displayName = (row: AdminUserRow) =>
  row.full_name ||
  `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ||
  "Unknown User";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export default function PremiumUsersTab() {
  const viewDialog = useViewUserDialog();
  const canEdit = useHasPermission("users.edit");
  const [planFilter, setPlanFilter] = useState<string>("");
  const { page, pageSize, onPageChange, onNextPage, onPreviousPage } =
    usePagination({ key: "premium_users_page" });
  const updatePlan = useUpdateUserPlan();

  // Per-plan head counts for the KPI cards (limit 1 — we only read `total`).
  const standardCount = useAdminUsers({ plan: "standard", limit: 1 });
  const premiumCount = useAdminUsers({ plan: "premium", limit: 1 });
  const featuredCount = useAdminUsers({ plan: "featured", limit: 1 });

  const { data, isLoading, isError, error } = useAdminUsers({
    // Empty filter = all paid plans (comma-separated list, resolved
    // server-side through user_subscriptions).
    plan: planFilter || "standard,premium,featured",
    page,
    limit: pageSize,
  });

  // user_subscriptions exists but has no rows yet — billing lands with
  // Epic 16, so be honest about it instead of showing fabricated data.
  const noSubscribers =
    !isLoading &&
    (standardCount.data?.total ?? 0) +
      (premiumCount.data?.total ?? 0) +
      (featuredCount.data?.total ?? 0) ===
      0;

  const users = data?.users ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "user",
        header: "Subscriber",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {displayName(row.original)}
            </span>
            <span className="text-xs text-slate-400">
              {row.original.email ?? "—"}
            </span>
          </div>
        ),
      },
      {
        id: "plan",
        header: "Plan",
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const tier = PLAN_TIERS.find((t) => t.value === row.original.plan);
          return (
            <span className="badge badge-purple">
              {tier ? `${tier.label} · ${tier.price}` : row.original.plan}
            </span>
          );
        },
      },
      {
        id: "joined",
        header: "Joined",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs text-slate-500">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "renewal",
        header: "Renewal Date",
        cell: () => (
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
            From Epic 16 billing
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="badge badge-green">{row.original.status ?? "active"}</span>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo(() => {
    if (!canEdit) return [];
    return [
      {
        label: "Renew",
        onClick: () =>
          toast.info("Renewal requires the payment provider integration (Epic 16)."),
      },
      {
        label: "Change Payment Method",
        onClick: () =>
          toast.info("Payment methods are managed in the mobile app wallet."),
      },
      {
        label: "Cancel Subscription",
        danger: true,
        onClick: (row: AdminUserRow) =>
          updatePlan.mutate({ userId: row.user_id, plan: "free" }),
      },
    ];
  }, [canEdit, updatePlan]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Total Subscribers"
          value={
            (standardCount.data?.total ?? 0) +
            (premiumCount.data?.total ?? 0) +
            (featuredCount.data?.total ?? 0)
          }
          variant="green"
          delta="Paid plans"
          deltaType="neutral"
          isLoading={standardCount.isLoading || premiumCount.isLoading || featuredCount.isLoading}
        />
        {PLAN_TIERS.map((tier, index) => {
          const countQuery = [standardCount, premiumCount, featuredCount][index];
          const Icon = tier.icon;
          return (
            <KpiCard
              key={tier.value}
              icon={<Icon className="h-5 w-5" />}
              label={`${tier.label} (${tier.price})`}
              value={countQuery.data?.total ?? 0}
              variant={tier.variant}
              delta="Subscribers"
              deltaType="neutral"
              isLoading={countQuery.isLoading}
            />
          );
        })}
      </div>

      {noSubscribers && (
        <div className="alert al-ic flex items-start gap-3">
          <span>💳</span>
          <div className="text-xs leading-relaxed">
            <strong>No paid subscriptions yet.</strong> The
            <code className="mx-1">user_subscriptions</code> table is provisioned
            but billing launches with Epic 16 — this tab populates automatically
            once the first subscription is activated.
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <button
          className={`btn btn-sm ${planFilter === "" ? "btn-primary text-white" : "btn-secondary"}`}
          onClick={() => setPlanFilter("")}
        >
          All Paid Plans
        </button>
        {PLAN_TIERS.map((tier) => (
          <button
            key={tier.value}
            className={`btn btn-sm ${planFilter === tier.value ? "btn-primary text-white" : "btn-secondary"}`}
            onClick={() => setPlanFilter(tier.value)}
          >
            {tier.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable={false}
          onRowClick={(row) => viewDialog.open(row.user_id)}
          rowActions={rowActions}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange,
            onNextPage,
            onPreviousPage,
            canNextPage: page < totalPages,
            canPreviousPage: page > 1,
          }}
        />
      </div>
    </div>
  );
}
