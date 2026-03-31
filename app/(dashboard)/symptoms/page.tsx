"use client";
import SectionHeader from "@/components/SectionHeader";
import { PlusCircleIcon } from "lucide-react";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import ConditionsStats from "../diseases_&_conditions/_components/ConditionStats";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import AddSymptomDialog from "./_components/add-symptom-dialog";
import ViewSymptomDialog from "./_components/view-symptom-dialog";
import { createPaginationHandlers } from "@/lib/utils";
import { DataTable } from "@/components/Data-Table/data-table";
import { symptomsColumns } from "@/components/Data-Table/columns/symptomsColumns";
import {
  useSymptoms,
  useSymptomStats,
} from "@/hooks/supabase-calls/useSymptoms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SymptomsPage = () => {
  const addSymptom = useAddConditionDialog();
  const viewSymptom = useViewConditionDialog();

  const limit = 10;
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [bodyPart, setBodyPart] = useState<string | null>();

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  //============== Supabase hook invocation
  const { data, isLoading } = useSymptoms({
    limit,
    page,
    search: debouncedSearch,
  });

  const { data: stats, isLoading: isStatsLoading } = useSymptomStats();

  console.log("Stats: ", stats);

  const pagination = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  useEffect(() => {
    if (stats?.bodyPartDistribution) {
      const bodyPart = stats?.bodyPartDistribution[0]?.name;
      setBodyPart(bodyPart);
    }
  }, [data]);

  // ⚡ Bolt Optimization: Memoize props for the `DataTable` component.
  // `useCallback` and `useMemo` prevent these props from being recreated on every render,
  // which would otherwise cause the memoized `DataTable` to re-render unnecessarily.
  const onRowClick = useCallback(
    (condition: any) => viewSymptom.open(condition.id),
    [viewSymptom.open],
  );

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
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title={"Symptoms"}
        Icon={PlusCircleIcon}
        description="Manage independent symptoms"
        hasButton
        buttonLabel="Add Symptom"
        onButtonClick={() => addSymptom.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search symptoms..."
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ConditionsStats
          label="Total Record Symptoms"
          value={stats?.totalSymptoms || 0}
          isLoading={isStatsLoading}
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
        onRowClick={onRowClick}
        pagination={paginationConfig}
        isLoading={isLoading}
      />

      <AddSymptomDialog />
      <ViewSymptomDialog />
    </section>
  );
};

export default SymptomsPage;
