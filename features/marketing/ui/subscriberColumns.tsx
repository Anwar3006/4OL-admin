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
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  at_risk: "bg-red-50 text-red-700 border-red-100",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  expired: "bg-amber-50 text-amber-700 border-amber-100",
  revoked: "bg-red-50 text-red-700 border-red-100",
};

const fmtDate = (value: string | null | undefined) =>
  value ? format(new Date(value), "MMM dd, yyyy") : "—";

const displayName = (row: TUserSubscriptionRow) => {
  const profile = row.user_profiles;
  const name = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");
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
        className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
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
        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">
            {displayName(row.original)}
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {row.original.user_profiles?.email ?? "—"}
          </div>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
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
          <span className="text-[11px] font-bold text-red-600">
            {row.original.risk_reason ?? "Payment failed"}
          </span>
        ),
      },
      {
        id: "last_contact",
        header: "Last Contact",
        cell: ({ row }) => (
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
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
          <span className="text-[11px] font-black text-slate-700">
            {formatCurrency(row.original.subscription_tiers?.price_ghs ?? 0, { decimals: 2 })}
          </span>
        ),
      },
      {
        id: "subscribed",
        header: "Subscribed Since",
        cell: ({ row }) => (
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
            {fmtDate(row.original.subscribed_at)}
          </span>
        ),
      },
      {
        id: "renewal",
        header: "Next Renewal",
        cell: ({ row }) => (
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
            {fmtDate(row.original.next_renewal_at ?? row.original.expires_at)}
          </span>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "Payment Method",
        cell: ({ row }) => (
          <span className="text-[11px] font-bold text-slate-600">
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
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                STATUS_STYLES[status] ?? STATUS_STYLES.cancelled,
              )}
            >
              {status.replace("_", " ")}
            </span>
            {!atRisk && (
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
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
