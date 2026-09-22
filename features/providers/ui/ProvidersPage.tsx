"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { providerColumns } from "./providerColumns";
import ProviderQueues from "./ProviderQueues";
import { useProviderOptions, useProviderStats, useProvidersList, useUpdateProviderStatus } from "../data/useProviders";
import type { ProviderKind } from "../schema/types";

const FILTER_KEYS = ["kind", "type", "status", "verification", "tier", "region"] as const;

const ProvidersPage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const filters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, searchParams.get(key) || "all"]),
  ) as Record<(typeof FILTER_KEYS)[number], string>;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data: options } = useProviderOptions();
  const { data: stats } = useProviderStats();
  const { data, isLoading, isFetching, isError, error } = useProvidersList({
    page,
    limit: 10,
    search,
    kind: filters.kind as ProviderKind | "all",
    type: filters.type,
    status: filters.status as any,
    verification: filters.verification as any,
    tier: filters.tier,
    region: filters.region,
  });
  const updateStatus = useUpdateProviderStatus();

  const typeOptions = useMemo(() => {
    if (!options) return [];
    if (filters.kind === "all") return options.types;
    return options.types.filter((t) => t.kind === filters.kind);
  }, [options, filters.kind]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🩺 Providers"
        subtitle="Every provider kind — care facilities, vendors, practitioners, trainers, ambulance operators — one registry"
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => updateParams({ status: "pending", page: "1" })}
        >
          ⏳ Review Pending{stats ? ` (${stats.byStatus.pending})` : ""}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon="📊" label="Total" value={stats?.total?.toLocaleString() ?? "0"} variant="blue" />
        <KpiCard icon="✅" label="Active" value={stats?.byStatus.active?.toLocaleString() ?? "0"} variant="green" size="sm" />
        <KpiCard icon="⏳" label="Pending" value={stats?.byStatus.pending?.toLocaleString() ?? "0"} variant="gold" />
        <KpiCard icon="🛡️" label="Verified" value={stats?.byVerification.verified?.toLocaleString() ?? "0"} variant="teal" size="sm" />
        <KpiCard icon="⏸" label="Suspended" value={stats?.byStatus.suspended?.toLocaleString() ?? "0"} variant="red" size="sm" />
        <KpiCard icon="🚩" label="Rejected" value={stats?.byStatus.rejected?.toLocaleString() ?? "0"} variant="orange" size="sm" />
      </div>

      <ProviderQueues />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <input
          className="w-full h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search providers, district, region..."
          value={search}
          onChange={(e) => updateParams({ search: e.target.value, page: "1" })}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Select
            value={filters.kind}
            onValueChange={(v) => updateParams({ kind: v, type: undefined, page: "1" })}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Kind" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {options?.kinds.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={(v) => updateParams({ type: v, page: "1" })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(v) => updateParams({ status: v, page: "1" })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {options?.statuses.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.verification} onValueChange={(v) => updateParams({ verification: v, page: "1" })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Verification" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verification</SelectItem>
              {options?.verificationStatuses.map((v) => (
                <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.tier} onValueChange={(v) => updateParams({ tier: v, page: "1" })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="none">Free listing</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.region} onValueChange={(v) => updateParams({ region: v, page: "1" })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {options?.regions.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={providerColumns}
          data={data?.data || []}
          isLoading={isLoading || isFetching}
          isError={isError}
          error={error}
          onRowClick={(row) => router.push(`/providers/${row.id}`)}
          pagination={{
            currentPage: data?.meta.currentPage ?? page,
            totalPages: data?.meta.totalPages ?? 1,
            totalItems: data?.meta.total ?? 0,
            pageSize: 10,
            onPageChange: (p) => updateParams({ page: String(p) }),
            onNextPage: () => updateParams({ page: String((data?.meta.currentPage ?? page) + 1) }),
            onPreviousPage: () => updateParams({ page: String(Math.max(1, (data?.meta.currentPage ?? page) - 1)) }),
            canNextPage: (data?.meta.currentPage ?? page) < (data?.meta.totalPages ?? 1),
            canPreviousPage: (data?.meta.currentPage ?? page) > 1,
          }}
          bulkActions={[
            {
              label: "✅ Approve selected",
              onClick: (rows) => updateStatus.mutate({ id: rows[0].id, ids: rows.map((r) => r.id), status: "active" }),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default ProvidersPage;
