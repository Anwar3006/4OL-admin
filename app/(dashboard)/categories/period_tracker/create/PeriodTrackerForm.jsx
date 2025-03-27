// PeriodTrackerForm.jsx
"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import {
  SelectField,
  DateInput,
  CalculateButton,
} from "@/components/period_tracker/UIElements";
import Card from "@/components/period_tracker/Card";
import ConfirmationModal from "./ConfirmationModal";
import usePeriodTracker from "@/hooks/usePeriodTracker";

const PeriodTrackerForm = () => {
  const searchParams = useSearchParams();
  const itemData = searchParams.get("item");
  const {
    cycleOptions,
    periodOptions,
    consistencyOptions,
    handleSubmitForm,
    confirmData,
    confirmModal,
    setConfirmModal,
    errors,
    selectedUser,
    setSelectedUser,
    cycleLength,
    setCycleLength,
    periodLength,
    setPeriodLength,
    consistent,
    setConsistent,
    startDate,
    setStartDate,
    users,
    handleConfirmAddition,
    handleConfirmUpdate,
  } = usePeriodTracker(itemData);

  return (
    <Card
      title={itemData ? "Edit Period Tracker" : "Create Period Tracker"}
      className="mt-5"
    >
      <form onSubmit={handleSubmitForm} className="grid gap-4">
        <SelectField
          label="User"
          value={selectedUser}
          onChange={setSelectedUser}
          options={users}
          error={errors.user}
          isDisabled={!!itemData}
        />
        <SelectField
          label="Cycle Length"
          value={cycleLength}
          onChange={setCycleLength}
          options={cycleOptions}
          error={errors.cycleLength}
        />
        <SelectField
          label="Period Length"
          value={periodLength}
          onChange={setPeriodLength}
          options={periodOptions}
          error={errors.periodLength}
        />
        <SelectField
          label="Consistency"
          value={consistent}
          onChange={setConsistent}
          options={consistencyOptions}
          error={errors.consistent}
        />
        <DateInput
          label="Period Start Date"
          value={startDate}
          onChange={setStartDate}
          error={errors.startDate}
        />
        <CalculateButton />
      </form>
      <ConfirmationModal
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        confirmData={confirmData}
        itemData={itemData}
        handleConfirmAddition={handleConfirmAddition}
        handleConfirmUpdate={handleConfirmUpdate}
      />
    </Card>
  );
};

export default PeriodTrackerForm;
