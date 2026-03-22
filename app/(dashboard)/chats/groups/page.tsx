"use client";

import SectionHeader from "@/components/SectionHeader";
import { MessageCircle } from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";
import { createPaginationHandlers } from "@/lib/utils";
import { DataTable } from "@/components/Data-Table/data-table";
import { useConversations } from "@/hooks/supabase-calls/useConversation";
import { useViewConversationDialog } from "@/stores/dialog-store";
import ViewConversationDialog from "./_components/view-conversation-dialog";
import AssignAdminDialog from "./_components/assign-admin-dialog";
import { conversationColumns } from "@/components/Data-Table/columns/conversationColumns";
import { conversationCardConfig } from "@/components/Data-Table/mobile-table-configs/conversationCardConfig";

const MainChatPage = () => {
  const viewConversation = useViewConversationDialog();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useConversations({ page, limit });

  const paginationHandler = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  const onRowClick = useCallback(
    (data: any) => viewConversation.open(data.id, data),
    [viewConversation],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: limit,
      onPageChange: paginationHandler.goTo,
      onNextPage: paginationHandler.next,
      onPreviousPage: paginationHandler.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, paginationHandler],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Chat Groups"
        Icon={MessageCircle}
        description="Community conversations and group management"
        hasButton={false}
      />

      <div className="mt-6">
        <DataTable
          columns={conversationColumns}
          data={data?.conversations || []}
          cardConfig={conversationCardConfig}
          onRowClick={onRowClick}
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>

      {/* Dialogs */}
      <ViewConversationDialog />
      <AssignAdminDialog />
    </section>
  );
};

export default MainChatPage;
