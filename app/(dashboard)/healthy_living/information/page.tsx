"use client";
import SectionHeader from "@/components/SectionHeader";
import { PlusCircleIcon, Search, Filter } from "lucide-react";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ConditionsStats from "@/components/dashboard/ConditionStats";
import { DataTable } from "@/components/Data-Table/data-table";

import { createPaginationHandlers } from "@/lib/utils";
import {
  useAddHealthyLivingDialog,
  useViewHealthyLivingDialog,
} from "@/stores/dialog-store";
import { healthyLivingColumns } from "@/components/Data-Table/columns/healthyLivingColumns";
import { healthyLivingCardConfig } from "@/components/Data-Table/mobile-table-configs/healthyLivingCardConfig";
import AddHealthyLivingDialog from "../_components/add-healthyLiving-dialog";
import { useHealthyLivings } from "@/hooks/supabase-calls/useHealthyLiving";
import ViewHealthyLivingDialog from "../_components/view-healthyLiving-dialog";

const HealthyLivingPage = () => {
  const addHealthLiving = useAddHealthyLivingDialog();
  const viewHealthyLiving = useViewHealthyLivingDialog();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useHealthyLivings({
    page,
    limit,
    search: debouncedSearch,
  });

  console.log("Data: ", data);

  const paginationHandler = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  const onRowClick = useCallback(
    (data: any) => viewHealthyLiving.open(data.id),
    [viewHealthyLiving],
  );
  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: 10,
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
        title={"Healthy Living"}
        Icon={PlusCircleIcon}
        description="Manage the information related to healthy living"
        hasButton
        buttonLabel="Add Notes"
        onButtonClick={() => addHealthLiving.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search healthy living..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* StatsCards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ConditionsStats
          label="Total Recorded"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={healthyLivingColumns}
        data={data?.healthyLivings || []}
        cardConfig={healthyLivingCardConfig}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isLoading}
      />

      <AddHealthyLivingDialog />
      <ViewHealthyLivingDialog />
    </section>
  );
};

export default HealthyLivingPage;
