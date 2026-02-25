"use client";

import { medicationColumns } from "@/components/Data-Table/columns/medicationReminderColumns";
import { DataTable } from "@/components/Data-Table/data-table";
import { medicationCardConfig } from "@/components/Data-Table/mobile-table-configs/medicationCardConfig";
import SectionHeader from "@/components/SectionHeader";
import { createPaginationHandlers } from "@/lib/utils";
import { PlusCircleIcon } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import ConditionsStats from "../diseases_&_conditions/_components/ConditionStats";
import { useMedicationReminders } from "@/hooks/supabase-calls/useMedicationReminder";
import { useViewMediactionReminderDialog } from "@/stores/dialog-store";
import ViewMedicationReminderDialog from "./_components/view-medication-dialog";

const MedicationReminderPage = () => {
  const viewMedicationReminder = useViewMediactionReminderDialog();
  const [page, setPage] = useState(1);
  const limit = 10;
  // const medicationCardConfig = useMedicationReminderCardConfig();

  const { data, isLoading } = useMedicationReminders({ page, limit });

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
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px]">
      <SectionHeader
        title={"Medication Reminders"}
        Icon={PlusCircleIcon}
        description="Track medication reminders for your users"
        hasButton={false}
      />

      {/* StatsCards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
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
