"use client";

import DataTable, { type Column, type RowAction } from "@/components/redesign/DataTable";
import type { Row } from "@/features/period/schema/types";
import { dateTime, status } from "./formatters";
import { columns } from "./columns";


export default function PrivacyRequests({
  rows,
  saving,
  mutate,
}: {
  rows: Row[];
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const requestColumns: Column<Row>[] = [
    { key: "user", label: "User" },
    {
      key: "request_type",
      label: "Request",
      render: (value) => value?.replaceAll("_", " "),
    },
    { key: "status", label: "Status", render: status },
    { key: "created_at", label: "Received", render: dateTime },
    { key: "due_at", label: "Due", render: dateTime },
    { key: "completed_at", label: "Completed", render: dateTime },
  ];
  const actions: RowAction<Row>[] = [
    {
      label: "Verify request",
      onClick: (row) =>
        mutate(
          { action: "update_privacy_request", id: row.id, status: "verified" },
          "Privacy request verified.",
        ),
    },
    {
      label: "Start processing",
      onClick: (row) =>
        mutate(
          {
            action: "update_privacy_request",
            id: row.id,
            status: "processing",
          },
          "Privacy request is being processed.",
        ),
    },
    {
      label: "Mark complete",
      onClick: (row) =>
        mutate(
          { action: "update_privacy_request", id: row.id, status: "completed" },
          "Privacy request completed and audited.",
        ),
    },
    {
      label: "Reject request",
      danger: true,
      onClick: (row) =>
        mutate(
          { action: "update_privacy_request", id: row.id, status: "rejected" },
          "Privacy request rejected and audited.",
        ),
    },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Privacy requests</div>
          <div className="mt-1 text-xs text-slate-500">
            Verified export, correction, restriction and deletion requests with
            due dates.
          </div>
        </div>
      </div>
      <DataTable
        caption="Period Tracker privacy requests"
        columns={requestColumns}
        data={rows}
        pagination={false}
        isLoading={saving}
        getRowId={(row) => row.id}
        rowActions={actions}
      />
    </div>
  );
}
