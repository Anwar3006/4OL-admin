"use client";

import React, { useState, useCallback, useMemo } from "react";
import { UserPlus } from "lucide-react";
import {
  useOnboardingRequests,
  useUpdateOnboardingRequestStatus,
  useDeleteOnboardingRequest,
  OnboardingRequest,
  OnboardingRequestStatus,
} from "@/hooks/supabase-calls/useOnboardingRequests";
import { createOnboardingColumns } from "@/components/Data-Table/columns/onboardingColumns";
import { DataTable } from "@/components/Data-Table/data-table";
import SectionHeader from "@/components/SectionHeader";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

const STATUS_TABS = [
  { label: "All",      value: undefined   },
  { label: "Pending",  value: "pending"   },
  { label: "Approved", value: "approved"  },
  { label: "Rejected", value: "rejected"  },
] as const;

const TYPE_TABS = [
  { label: "All Types", value: undefined },
  { label: "Facility Owners", value: "facility_owner" },
  { label: "IBP Invites", value: "ibp_invite" },
] as const;

const PAGE_SIZE = 15;

function OnboardingSection() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useOnboardingRequests({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter,
    type: typeFilter,
  });

  const updateStatus = useUpdateOnboardingRequestStatus();
  const deleteRequest = useDeleteOnboardingRequest();

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

  const handleUpdateStatus = useCallback(
    (id: string, status: OnboardingRequestStatus) => {
      updateStatus.mutate({ id, status });
    },
    [updateStatus],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteRequest.mutate(id);
    },
    [deleteRequest],
  );

  const columns = useMemo(
    () =>
      createOnboardingColumns({
        onUpdateStatus: handleUpdateStatus,
        onDelete: handleDelete,
      }),
    [handleUpdateStatus, handleDelete],
  );

  const pendingCount = data?.requests.filter((r) => r.status === "pending").length ?? 0;

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Onboarding Requests"
        Icon={UserPlus}
        description="Manage signup link requests from healthcare facility owners and IBP partners."
        hasButton={false}
      />

      {/* ── Controls row ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                  statusFilter === tab.value
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
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

          <Input
            placeholder="Search by name, email, business..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs h-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => { setTypeFilter(tab.value); setPage(1); }}
              className={[
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                typeFilter === tab.value
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Data table ─────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={data?.requests ?? []}
        isLoading={isLoading || updateStatus.isPending || deleteRequest.isPending}
        pagination={pagination}
        onRowClick={(row) => setSelectedRequest(row)}
      />

      {/* ── Detail Modal ───────────────────────────────────────────────── */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requester</label>
                  <p className="text-sm font-medium">{selectedRequest.first_name} {selectedRequest.last_name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                  <p className="text-sm font-medium capitalize">{selectedRequest.request_type.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Name</label>
                <p className="text-sm font-medium">{selectedRequest.business_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <p className="text-sm font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                  <p className="text-sm font-medium">{selectedRequest.phone_number || "—"}</p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</label>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border italic">
                    "{selectedRequest.notes}"
                  </p>
                </div>
              )}

              <div className="pt-4 border-t flex items-center justify-between text-xs text-slate-400">
                <span>Submitted on {format(new Date(selectedRequest.created_at), "PPP p")}</span>
                <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                  {selectedRequest.status}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function OnboardingRequestsPage() {
  return <OnboardingSection />;
}
