"use client";

/**
 * Discount table columns — mockup parity (Code / Type / Discount / Eligible
 * Users / Uses / Limit / Expiry / Campaign / Status / Actions). Marketing
 * unification build: rows come from /api/marketing/discounts
 * (marketing_discounts + campaign name merge).
 */

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TDiscountRow } from "@/schemas/marketing-discount.schema";
import { formatCurrency } from "@/lib/format";
import {
  useCreateMarketingDiscount,
  useDeleteMarketingDiscount,
  useUpdateMarketingDiscount,
} from "@/hooks/supabase-calls/useDiscounts";

const TYPE_LABELS: Record<string, string> = {
  percentage: "% Off",
  fixed: "Fixed ₵",
  bogo: "BOGO",
  free_trial: "Free Trial",
  partner: "Partner",
};

const ELIGIBLE_USER_LABELS: Record<string, string> = {
  all: "All users",
  new: "New users",
  nhis_linked: "NHIS-Linked",
  free_plan: "Free-Plan",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-100",
  paused: "bg-amber-50 text-amber-700 border-amber-100",
};

const fmtDate = (value: string | null | undefined) =>
  value ? format(new Date(value), "MMM dd, yyyy") : "—";

const discountLabel = (row: TDiscountRow) => {
  switch (row.discount_type) {
    case "percentage":
      return `${row.discount_value}%`;
    case "fixed":
      return formatCurrency(row.discount_value, { decimals: 0 });
    case "free_trial":
      return `${row.discount_value} day trial`;
    case "bogo":
      return "Buy 1 get 1";
    default:
      return `${row.discount_value}% partner`;
  }
};

/** Real component so row-level hooks stay legal (see subscriberColumns). */
function DiscountRowActions({
  discount,
  onEdit,
}: {
  discount: TDiscountRow;
  onEdit: (discount: TDiscountRow) => void;
}) {
  const updateMutation = useUpdateMarketingDiscount();
  const deleteMutation = useDeleteMarketingDiscount();
  const cloneMutation = useCreateMarketingDiscount();
  const expired = discount.status === "expired";
  const busy = updateMutation.isPending || deleteMutation.isPending || cloneMutation.isPending;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(discount.code);
      toast.success(`Code ${discount.code} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const clone = () => {
    cloneMutation.mutate({
      name: `${discount.name} (copy)`,
      description: discount.description ?? "",
      discountValue: Number(discount.discount_value),
      discountType: discount.discount_type,
      code: `${discount.code}-COPY`,
      maxUses: discount.max_uses,
      validFrom: new Date().toISOString(),
      validUntil: null,
      isActive: true,
      appliesTo: discount.applies_to,
      applicableItems: [],
      eligiblePlans: discount.eligible_plans ?? [],
      eligibleUsers: discount.eligible_users ?? "all",
      perUserLimit: discount.per_user_limit ?? null,
      campaignId: discount.campaign_id ?? null,
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        aria-label="Edit discount"
        title="Edit"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(discount);
        }}
      >
        ✏️
      </Button>
      <Button
        aria-label="Copy code"
        title="Copy code"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          void copyCode();
        }}
      >
        📋
      </Button>
      {expired ? (
        <Button
          aria-label="Clone discount"
          title="Clone as new code"
          variant="ghost"
          size="icon"
          disabled={busy}
          className="h-8 w-8 text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            clone();
          }}
        >
          🧬
        </Button>
      ) : (
        <Button
          aria-label={discount.status === "paused" ? "Resume" : "Pause"}
          title={discount.status === "paused" ? "Resume code" : "Pause code"}
          variant="ghost"
          size="icon"
          disabled={busy}
          className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            updateMutation.mutate({
              id: discount.id,
              data: { status: discount.status === "paused" ? "active" : "paused" },
            });
          }}
        >
          {discount.status === "paused" ? "▶️" : "⏸️"}
        </Button>
      )}
      <Button
        aria-label="Delete discount"
        title="Delete"
        variant="ghost"
        size="icon"
        disabled={busy}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete discount code ${discount.code}? This cannot be undone.`)) {
            deleteMutation.mutate(discount.id);
          }
        }}
      >
        🗑️
      </Button>
    </div>
  );
}

export const createDiscountColumns = (options: {
  onEdit: (discount: TDiscountRow) => void;
}): ColumnDef<TDiscountRow>[] => [
  {
    id: "code",
    header: "Code",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 text-[11px] tracking-tight font-mono">
          {row.original.code}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {row.original.description || row.original.name}
        </div>
      </div>
    ),
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
        {TYPE_LABELS[row.original.discount_type] ?? row.original.discount_type}
      </span>
    ),
  },
  {
    id: "discount",
    header: "Discount",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-emerald-700">
        {discountLabel(row.original)}
      </span>
    ),
  },
  {
    id: "eligible_users",
    header: "Eligible Users",
    cell: ({ row }) => (
      <span className="text-[11px] font-bold text-slate-600">
        {ELIGIBLE_USER_LABELS[row.original.eligible_users ?? "all"] ?? "All users"}
      </span>
    ),
  },
  {
    id: "uses",
    header: "Uses",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-slate-700 tabular-nums">
        {row.original.current_uses ?? 0}
        <span className="text-slate-400 font-bold">
          {" / "}
          {row.original.max_uses ?? "∞"}
        </span>
      </span>
    ),
  },
  {
    id: "expiry",
    header: "Expiry",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
        {fmtDate(row.original.valid_until)}
      </span>
    ),
  },
  {
    id: "campaign",
    header: "Campaign",
    cell: ({ row }) => (
      <span className="text-[11px] font-bold text-slate-500">
        {row.original.campaign_name ?? "—"}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status ?? "active";
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            STATUS_STYLES[status] ?? STATUS_STYLES.expired,
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DiscountRowActions discount={row.original} onEdit={options.onEdit} />
    ),
  },
];

/** Legacy export kept for any lingering imports — prefer createDiscountColumns. */
export const discountColumns = createDiscountColumns({ onEdit: () => {} });
