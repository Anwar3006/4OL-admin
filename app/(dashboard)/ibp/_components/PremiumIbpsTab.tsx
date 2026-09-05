"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Building2, Crown, Star, Megaphone } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { useHasPermission } from "@/stores/permission-context";
import { IbpRow, useIbpOverview, useIbps } from "@/hooks/supabase-calls/useIBP";
import { IBP_PLAN_PRICING } from "@/lib/ibp-constants";
import { formatDate, formatMoney, IbpViewDialog, STATUS_BADGES } from "./ibp-shared";
import { formatCurrency } from "@/lib/format";

// Pricing is reference-only (decision C-D5) — confirm against the
// subscription_plans seed before invoicing goes live.
const PLAN_CARDS = [
  { key: "standard", label: "Standard", icon: Star, variant: "blue" },
  { key: "premium", label: "Premium", icon: Crown, variant: "purple" },
  { key: "featured", label: "Featured", icon: Megaphone, variant: "green" },
] as const;

export default function PremiumIbpsTab() {
  const router = useRouter();
  const canEdit = useHasPermission("ibp.edit");
  const overview = useIbpOverview();
  const [viewing, setViewing] = useState<IbpRow | null>(null);

  // No dedicated "featured" filter in the API yet — pull active IBPs and
  // narrow client-side (directory scale is small).
  const { data, isLoading } = useIbps({ status: "active,approved", limit: 100 });
  const featured = useMemo(
    () => (data?.businesses ?? []).filter((b) => b.is_featured),
    [data],
  );

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "business",
        header: "Business",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-slate-800">
              ⭐ {row.original.business_name}
            </span>
            <span className="text-[11px] text-slate-400">
              {row.original.business_category ?? "—"}
            </span>
          </div>
        ),
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-[11px] text-slate-600">
            {[row.original.city, row.original.region].filter(Boolean).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "budget",
        header: "Campaign Budget",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-[11px] font-semibold text-slate-600">
            {formatMoney(row.original.campaign_budget)}
          </span>
        ),
      },
      {
        id: "spend",
        header: "Total Spend",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-[11px] text-slate-600">{formatMoney(row.original.total_spend)}</span>
        ),
      },
      {
        id: "verified",
        header: "Verified",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-[11px] text-slate-500">{formatDate(row.original.verified_at)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className={STATUS_BADGES[row.original.status ?? ""] ?? "badge badge-slate"}>
            {row.original.status ?? "unknown"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Building2 className="h-5 w-5" />}
          label="Premium / Featured IBPs"
          value={overview.data?.stats.premium ?? 0}
          variant="green"
          delta="is_featured flag"
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
        {PLAN_CARDS.map((tier) => {
          const Icon = tier.icon;
          return (
            <KpiCard
              key={tier.key}
              icon={<Icon className="h-5 w-5" />}
              label={`${tier.label} Plan`}
              value={`${formatCurrency(IBP_PLAN_PRICING[tier.key])}/mo`}
              variant={tier.variant}
              delta="Reference pricing (C-D5)"
              deltaType="neutral"
            />
          );
        })}
      </div>

      <div className="alert al-ic flex items-start gap-3">
        <span>📣</span>
        <div className="text-[11px] leading-relaxed">
          <strong>Ad management.</strong> Campaign budgets and ad placements for
          premium IBPs are managed from the Marketing module — use Manage Ads on
          any row to jump straight in.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={featured}
          isLoading={isLoading}
          selectable={false}
          onRowClick={(row) => setViewing(row)}
          rowActions={[
            { label: "View Details", onClick: (row) => setViewing(row) },
            ...(canEdit
              ? [{ label: "Manage Ads", onClick: () => router.push("/marketing") }]
              : []),
          ]}
        />
        {!isLoading && featured.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-8">
            No premium/featured IBPs yet — upgrade a business via registration or
            the subscription flow.
          </div>
        )}
      </div>

      <IbpViewDialog ibp={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
