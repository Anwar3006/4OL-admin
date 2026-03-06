"use client";

import SectionHeader from "@/components/SectionHeader";
import { createPaginationHandlers } from "@/lib/utils";
import { MessageSquareQuote } from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";

import { DataTable } from "@/components/Data-Table/data-table";
import ConditionsStats from "../../diseases_&_conditions/_components/ConditionStats";
import { useChats, useDeleteChat, useChatStats } from "@/hooks/supabase-calls/useChat";
import { useAddChatDialog } from "@/stores/dialog-store";
import AddChatDialog from "./_components/add-chat-dialog";
import { chatColumns } from "@/components/Data-Table/columns/chatColumns";
import { chatCardConfig } from "@/components/Data-Table/mobile-table-configs/chatCardConfig";

const ChatsPage = () => {
  const addChat = useAddChatDialog();
  const deleteChat = useDeleteChat();
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch Chats using React Query
  const { data, isLoading } = useChats({ page, limit });
  const { data: stats, isLoading: isLoadingStats } = useChatStats();

  // Memoize pagination to prevent unnecessary re-renders
  const paginationHandler = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  const onRowClick = useCallback((data: any) => addChat.open(data), [addChat]);

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
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px]">
      <SectionHeader
        title={"Chat Support"}
        Icon={MessageSquareQuote}
        description="Manage and respond to user support tickets"
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <ConditionsStats
          label="Total Tickets"
          value={stats?.total || 0}
          isLoading={isLoadingStats}
        />
        <ConditionsStats
          label="Open Tickets"
          value={stats?.open || 0}
          isLoading={isLoadingStats}
        />
        <ConditionsStats
          label="Closed Tickets"
          value={stats?.closed || 0}
          isLoading={isLoadingStats}
        />
        <ConditionsStats
          label="Deleted Tickets"
          value={stats?.deleted || 0}
          isLoading={isLoadingStats}
        />
      </div>

      {/* Table Section */}
      <DataTable
        columns={chatColumns}
        data={data?.chats || []}
        cardConfig={chatCardConfig}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isLoading}
      />

      {/* Edit Chat Dialog */}
      <AddChatDialog />
    </section>
  );
};

export default ChatsPage;
