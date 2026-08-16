"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { adminInviteColumns, inviteStatus } from "@/components/Data-Table/columns/adminInviteColumns";
import {
  useAdminInvites,
  useRevokeAdminInvite,
  type AdminInvite,
} from "@/hooks/supabase-calls/useUser";
import { usePagination } from "@/hooks/use-pagination";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { toast } from "sonner";

export default function InvitationsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: "admin_invites_page" });
  const { data, isLoading, isError, error } = useAdminInvites({ page, limit: pageSize });
  const { mutate: revokeInvite } = useRevokeAdminInvite();
  const { data: session } = useSupabaseSession();

  const invites = data?.invites || [];
  const totalItems = data?.meta.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleRevoke = (invite: AdminInvite) => {
    const status = inviteStatus(invite);
    if (status.label !== "Pending") {
      toast.info(`This invitation is already ${status.label.toLowerCase()} — nothing to revoke.`);
      return;
    }
    if (!session?.user?.id) return;
    if (!window.confirm(`Revoke the invitation sent to ${invite.email}?`)) return;
    revokeInvite({ id: invite.id, revokedBy: session.user.id });
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={adminInviteColumns}
          data={invites}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable={false}
          rowActions={[{ label: "Revoke", danger: true, onClick: handleRevoke }]}
          pagination={{
            currentPage: page,
            totalPages: totalPages || 1,
            totalItems: totalItems,
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
