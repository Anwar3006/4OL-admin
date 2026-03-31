"use client";

import { medicationColumns } from "@/components/Data-Table/columns/medicationReminderColumns";
import { DataTable } from "@/components/Data-Table/data-table";
import { medicationCardConfig } from "@/components/Data-Table/mobile-table-configs/medicationCardConfig";
import SectionHeader from "@/components/SectionHeader";
import { createPaginationHandlers } from "@/lib/utils";
import { PlusCircleIcon } from "lucide-react";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import { useDebounce } from "@/hooks/use-debounce";
import ConditionsStats from "../diseases_&_conditions/_components/ConditionStats";
import { useMedicationReminders } from "@/hooks/supabase-calls/useMedicationReminder";
import { useViewMediactionReminderDialog } from "@/stores/dialog-store";
import ViewMedicationReminderDialog from "./_components/view-medication-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

const MedicationReminderPage = () => {
  const viewMedicationReminder = useViewMediactionReminderDialog();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  // const medicationCardConfig = useMedicationReminderCardConfig();

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useMedicationReminders({ page, limit, search: debouncedSearch });

  const paginationHandler = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  console.log("Medication: ", data);

  const onRowClick = useCallback(
    (data: any) => viewMedicationReminder.open(data.id),
    [viewMedicationReminder],
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
        title={"Medication Reminders"}
        Icon={PlusCircleIcon}
        description="Track medication reminders for your users"
        hasButton={false}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search medications..."
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <ConditionsStats
          label="Total Reminders"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />
        <ConditionsStats
          label="Total Active Reminders"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />

        <ConditionsStats
          label="Adherence Rate"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={medicationColumns}
        data={data?.data || []}
        cardConfig={medicationCardConfig}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isLoading}
      />

      <ViewMedicationReminderDialog />
    </section>
  );
};

export default MedicationReminderPage;
