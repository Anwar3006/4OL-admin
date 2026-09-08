"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/Data-Table/data-table";
import { marketingColumns } from "./marketingColumns";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import {
  useBatchMarketingProfiles,
  useMarketingProfiles,
} from "@/features/marketing/data/useMarketing";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { useViewMarketingDialog } from "@/features/marketing/data/dialog-hooks";
import { TMarketingProfileOutput } from "@/features/marketing/schema/profile";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
  { value: "scheduled", label: "Scheduled" },
  { value: "pending_review", label: "Pending Review" },
  { value: "rejected", label: "Rejected" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "app_promotion", label: "App Promotion" },
  { value: "feature_launch", label: "Feature Launch" },
  { value: "seasonal", label: "Seasonal" },
  { value: "business_submitted", label: "Business Submitted" },
  { value: "referral", label: "Referral" },
];

const CHANNEL_OPTIONS = [
  { value: "", label: "All Channels" },
  { value: "push", label: "Push" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "in_app_banner", label: "In-App Banner" },
  { value: "social", label: "Social" },
];

const selectClass =
  "h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-2xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

/**
 * Gap Analysis Part M (M3): full filter bar (search/status/type/channel),
 * bulk Launch/Pause/End over the DataTable selection, and deep-link
 * support (?status=pending_review from the Review Submissions header
 * button).
 */
export default function AllCampaignsTab() {
  const searchParams = useSearchParams();
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: "campaigns_page" });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [type, setType] = useState("");
  const [channel, setChannel] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Follow header-button deep links while the tab stays mounted.
  useEffect(() => {
    const linkedStatus = searchParams.get("status");
    if (linkedStatus && linkedStatus !== status) setStatus(linkedStatus);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce the search box into the query param.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useMarketingProfiles({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
    channel: channel || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const campaigns = (data?.data || []).filter(
    (campaign) =>
      !type || campaign.campaign_type === type || campaign.marketingType === type,
  );
  const filtered = campaigns;

  const totalPages = data?.meta?.totalPages || 1;
  const { open: openView } = useViewMarketingDialog();
  const batch = useBatchMarketingProfiles();

  const runBatch = (action: "launch" | "pause" | "end") =>
    (rows: TMarketingProfileOutput[]) =>
      batch.mutate({ ids: rows.map((row) => row.id), action });

  const handleExport = () => {
    downloadCsv(
      filtered.map((row) => ({
        Headline: row.headline,
        Type: row.campaign_type ?? row.marketingType,
        Status: row.status,
        Target: row.target_segment ?? "",
        Start: row.startDate,
        End: row.endDate,
        "Budget (GHS)": row.budget ?? "",
        Impressions: row.impressions ?? 0,
        Clicks: row.clicks ?? 0,
      })),
      "campaigns",
    );
  };

  const cardConfig: MobileCardConfig<TMarketingProfileOutput> = {
    header: {
      title: (data) => data.headline,
      subtitle: (data) => data.marketingType,
      badge: (data) => (
        <span
          className={`text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            data.status === "live"
              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
              : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30"
          }`}
        >
          {data.status}
        </span>
      ),
    },
    fields: [
      {
        id: "dates",
        label: "Duration",
        render: (data) =>
          `${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}`,
      },
    ],
    actions: [{ label: "View Details", onClick: (data) => openView(data.id) }],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[220px] h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search campaigns..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            onPageChange(1);
          }}
        />
        <select
          className={selectClass}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            onPageChange(1);
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            onPageChange(1);
          }}
        >
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="From date"
          className={selectClass}
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            onPageChange(1);
          }}
        />
        <input
          type="date"
          aria-label="To date"
          className={selectClass}
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            onPageChange(1);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest"
        >
          📥 Export
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={marketingColumns}
          data={filtered}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => openView(row.id)}
          bulkActions={[
            { label: "🚀 Launch Selected", onClick: runBatch("launch") },
            { label: "⏸️ Pause Selected", onClick: runBatch("pause") },
            { label: "🏁 End Selected", onClick: runBatch("end") },
          ]}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: data?.meta?.total || 0,
            pageSize: pageSize,
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
