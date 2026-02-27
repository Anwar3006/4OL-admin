"use client";
import SectionHeader from "@/components/SectionHeader";
import { PlusCircleIcon } from "lucide-react";
import React, { useState, useMemo } from "react";
import ConditionsStats from "@/components/dashboard/ConditionStats";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import AddSymptomDialog from "@/app/(dashboard)/symptoms/_components/add-symptom-dialog";
import ViewSymptomDialog from "@/app/(dashboard)/symptoms/_components/view-symptom-dialog";
import { createPaginationHandlers } from "@/lib/utils";
import { DataTable } from "@/components/Data-Table/data-table";
import { symptomsColumns } from "@/components/Data-Table/columns/symptomsColumns";
import { conditionCardConfig } from "@/components/Data-Table/mobile-table-configs/conditionCardConfig";
import {
  useSymptoms,
  useSymptomStats,
} from "@/hooks/supabase-calls/useSymptoms";

const SymptomsOverviewPage = () => {
  const addSymptom = useAddConditionDialog();
  const viewSymptom = useViewConditionDialog();

  const limit = 10;
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSymptoms({
    limit,
    page,
  });

  const { data: stats } = useSymptomStats();

  const pagination = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  const onRowClick = (condition) => viewSymptom.open(condition.id);

  const paginationConfig = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: limit,
      onPageChange: pagination.goTo,
      onNextPage: pagination.next,
      onPreviousPage: pagination.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, pagination],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px]">
      <SectionHeader
        title={"Symptoms"}
        Icon={PlusCircleIcon}
        description="Manage independent symptoms"
        hasButton
        buttonLabel="Add Symptom"
        onButtonClick={() => addSymptom.open()}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ConditionsStats
          label="Total Record Symptoms"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />
        <ConditionsStats
          label="Total Condition Categories"
          value={stats?.totalCategories || 0}
          isLoading={isLoading}
        />
        <ConditionsStats
          label="Systemic Count"
          value={stats?.systemicCount || "N/A"}
          isLoading={isLoading}
        />
      </div>

      <DataTable
        columns={symptomsColumns}
        data={data?.symptoms || []}
        cardConfig={conditionCardConfig}
        onRowClick={onRowClick}
        pagination={paginationConfig}
        isLoading={isLoading}
      />

      <AddSymptomDialog />
      <ViewSymptomDialog />
    </section>
  );
};

export default SymptomsOverviewPage;
