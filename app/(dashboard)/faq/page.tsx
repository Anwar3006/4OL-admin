"use client";

import SectionHeader from "@/components/SectionHeader";
import { createPaginationHandlers } from "@/lib/utils";
import { MessageCircleQuestion } from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";

import { DataTable } from "@/components/Data-Table/data-table";
import ConditionsStats from "../diseases_&_conditions/_components/ConditionStats";
import { useFAQs, useDeleteFAQ } from "@/hooks/supabase-calls/useFAQ";
import { useAddFAQDialog } from "@/stores/dialog-store";
import AddFAQDialog from "./_components/add-faq-dialog";
import { faqColumns } from "@/components/Data-Table/columns/faqColumns";
import { faqCardConfig } from "@/components/Data-Table/mobile-table-configs/faqCardConfig";

const FAQPage = () => {
  const addFAQ = useAddFAQDialog();
  const deleteFAQ = useDeleteFAQ();
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch FAQs using React Query
  const { data, isLoading } = useFAQs({ page, limit });

  // Memoize pagination to prevent unnecessary re-renders
  const paginationHandler = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );
  const onRowClick = useCallback((data: any) => addFAQ.open(data), [addFAQ]);
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
        title={"FAQs"}
        Icon={MessageCircleQuestion}
        description="Manage the information on frequently asked questions"
        hasButton
        buttonLabel="Add FAQ"
        onButtonClick={() => {
          console.log("Button clicked");
          addFAQ.open();
        }}
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ConditionsStats
          label="Total FAQs"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />
      </div>

      {/* Table Section */}
      <DataTable
        columns={faqColumns}
        data={data?.faqs || []}
        cardConfig={faqCardConfig}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isLoading}
      />

      {/* Add/Edit FAQ Dialog */}
      <AddFAQDialog />
    </section>
  );
};

export default FAQPage;
