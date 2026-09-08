"use client";

/**
 * Subscriber table columns — mockup parity (User masked / Plan / Monthly
 * Value / Subscribed Since / Next Renewal / Payment Method / Status /
 * Actions). Marketing unification build: rows come from the unified
 * user_subscriptions ⋈ subscription_tiers via /api/marketing/subscribers.
 */

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  TUserSubscriptionRow,
  useRemindSubscribers,
  useUpdateSubscriber,
} from "@/features/marketing/data/useSubscriptions";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  vodafone_cash: "Vodafone Cash",
  paystack_card: "Paystack Card",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30",
  at_risk: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
  cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  expired: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
  revoked: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
};

const fmtDate = (value: string | null | undefined) =>
  value ? format(new Date(value), "MMM dd, yyyy") : "—";

const displayName = (row: TUserSubscriptionRow) => {
  const profile = row.user_profiles;
  const name =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  return name || profile?.email || "Unknown user";
};

/** Extracted to a real component — hooks inside a cell render fn would run
 * in DataTable's own render and break when the row count changes. */
function SubscriberRowActions({
  subscription,
}: {
  subscription: TUserSubscriptionRow;
}) {
  const remindMutation = useRemindSubscribers();
  const updateMutation = useUpdateSubscriber();

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        aria-label="Send reminder"
        title="Send renewal reminder"
        variant="ghost"
        size="icon"
        disabled={remindMutation.isPending}
        className="h-8 w-8 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          remindMutation.mutate({ ids: [subscription.id] });
        }}
      >
        💰
      </Button>
      <Button
        aria-label="Toggle auto-renew"
        title={subscription.auto_renew ? "Turn off auto-renew" : "Turn on auto-renew"}
        variant="ghost"
        size="icon"
        disabled={updateMutation.isPending}
        className="h-8 w-8 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          updateMutation.mutate({
            id: subscription.id,
            data: { auto_renew: !subscription.auto_renew },
          });
        }}
      >
        ✏️
      </Button>
      {subscription.status !== "cancelled" && (
        <Button
          aria-label="Cancel subscription"
          title="Cancel subscription"
          variant="ghost"
          size="icon"
          disabled={updateMutation.isPending}
          className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (
              window.confirm(
                `Cancel ${displayName(subscription)}'s ${subscription.subscription_tiers?.name ?? ""} subscription?`,
              )
            ) {
              updateMutation.mutate({
                id: subscription.id,
                data: { status: "cancelled" },
              });
            }
          }}
        >
          ❌
        </Button>
      )}
    </div>
  );
}

export const createSubscriberColumns = (options?: {
  atRisk?: boolean;
}): ColumnDef<TUserSubscriptionRow>[] => {
  const atRisk = options?.atRisk ?? false;

  const columns: ColumnDef<TUserSubscriptionRow>[] = [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div>
          <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight">
            {displayName(row.original)}
          </div>
          <div className="text-2xs text-slate-400 font-bold uppercase tracking-widest">
            {row.original.user_profiles?.email ?? "—"}
          </div>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30">
          {row.original.subscription_tiers?.name ?? "—"}
        </span>
      ),
    },
  ];

  if (atRisk) {
    columns.push(
      {
        accessorKey: "risk_reason",
        header: "Risk Reason",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-red-600 dark:text-red-400">
            {row.original.risk_reason ?? "Payment failed"}
          </span>
        ),
      },
      {
        id: "last_contact",
        header: "Last Contact",
        cell: ({ row }) => (
          <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
            {fmtDate(row.original.last_reminded_at)}
          </span>
        ),
      },
    );
  } else {
    columns.push(
      {
        id: "value",
        header: "Monthly Value",
        cell: ({ row }) => (
          <span className="text-xs font-black text-slate-700 dark:text-slate-300">
            {formatCurrency(row.original.subscription_tiers?.price_ghs ?? 0, { decimals: 2 })}
          </span>
        ),
      },
      {
        id: "subscribed",
        header: "Subscribed Since",
        cell: ({ row }) => (
          <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
            {fmtDate(row.original.subscribed_at)}
          </span>
        ),
      },
      {
        id: "renewal",
        header: "Next Renewal",
        cell: ({ row }) => (
          <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
            {fmtDate(row.original.next_renewal_at ?? row.original.expires_at)}
          </span>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "Payment Method",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {PAYMENT_METHOD_LABELS[row.original.payment_method ?? ""] ??
              row.original.payment_method ??
              "—"}
          </span>
        ),
      },
    );
  }

  columns.push(
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="space-y-1">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
                STATUS_STYLES[status] ?? STATUS_STYLES.cancelled,
              )}
            >
              {status.replace("_", " ")}
            </span>
            {!atRisk && (
              <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest">
                {row.original.auto_renew ? "Auto-renew on" : "Auto-renew off"}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <SubscriberRowActions subscription={row.original} />,
    },
  );

  return columns;
};
