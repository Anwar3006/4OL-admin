"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  useDeleteAccountRequests,
  useUpdateDeleteRequestStatus,
  DeleteAccountRequest,
  DeleteRequestStatus,
} from "@/hooks/supabase-calls/useDeleteAccountRequests";
import { createDeleteAccountColumns } from "@/components/Data-Table/columns/deleteAccountColumns";
import { DataTable } from "@/components/Data-Table/data-table";
import SectionHeader from "@/components/SectionHeader";
import { Input } from "@/components/ui/input";

// ─── Status filter tabs ───────────────────────────────────────────────────────
const STATUS_TABS = [
  { label: "All",      value: undefined   },
  { label: "Pending",  value: "pending"   },
  { label: "Approved", value: "approved"  },
  { label: "Rejected", value: "rejected"  },
] as const;

const PAGE_SIZE = 15;

// ─── Section ─────────────────────────────────────────────────────────────────
function DeleteAccountSection() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useDeleteAccountRequests({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter,
  });

  const updateStatus = useUpdateDeleteRequestStatus();

  const pagination = useMemo(
    () =>
      data
        ? {
            currentPage: data.meta.currentPage,
            totalPages: data.meta.totalPages,
            totalItems: data.meta.total,
            pageSize: PAGE_SIZE,
            onPageChange: setPage,
            onNextPage: () => {
              if (data.meta.currentPage < data.meta.totalPages) setPage((p) => p + 1);
            },
            onPreviousPage: () => {
              if (data.meta.currentPage > 1) setPage((p) => p - 1);
            },
            canNextPage: data.meta.currentPage < data.meta.totalPages,
            canPreviousPage: data.meta.currentPage > 1,
          }
        : undefined,
    [data],
  );

  const handleView = useCallback(
    (row: DeleteAccountRequest) => {
      router.push(`/users/view?id=${row.user_id}&from=delete-request-account`);
    },
    [router],
  );

  const handleStatusChange = useCallback(
    (requestId: string, userId: string, newStatus: DeleteRequestStatus) => {
      updateStatus.mutate({ requestId, userId, newStatus });
    },
    [updateStatus],
  );

  // Detect super admin role client-side
  const isSuperAdmin =
    typeof window !== "undefined" &&
    localStorage.getItem("user_role") === "Super Admin";

  const columns = useMemo(
    () =>
      createDeleteAccountColumns({
        onView: handleView,
        onStatusChange: handleStatusChange,
        isSuperAdmin,
      }),
    [handleView, handleStatusChange, isSuperAdmin],
  );

  const pendingCount = data?.requests.filter((r) => r.status === "pending").length ?? 0;

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Account Deletion Requests"
        Icon={Trash2}
        description="Review and manage user requests to permanently delete their accounts."
        hasButton={false}
      />

      {/* ── Controls row ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 px-1">
        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                statusFilter === tab.value
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
              ].join(" ")}
            >
              {tab.label}
              {tab.value === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs h-9 text-sm"
        />
      </div>

      {/* ── Data table ─────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={data?.requests ?? []}
        isLoading={isLoading || updateStatus.isPending}
        pagination={pagination}
        onRowClick={handleView}
      />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DeleteAccountRequestPage() {
  return <DeleteAccountSection />;
}
