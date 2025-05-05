"use client";
import { useState, useEffect } from "react";
import {
  createPeriodTrackerLog,
  getUsersNotInTrackerLogs,
  updatePeriodTrackerLog,
} from "@/app/services/period_tracker_service";
import {
  calculateFertileWindow,
  calculateNextPeriodStart,
  calculateOvulationDate,
  calculatePeriodDates,
} from "@/utils/period_tracker/periodTrackerUtils";

const usePeriodTracker = (itemData) => {
  const [cycleLength, setCycleLength] = useState("");
  const [periodLength, setPeriodLength] = useState("");
  const [consistent, setConsistent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [users, setUsers] = useState([{ value: "1", label: "John Doe" }]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [errors, setErrors] = useState({});

  // Dummy options (could come from a config or API)
  const cycleOptions = Array.from({ length: 36 - 22 + 1 }, (_, i) => {
    const day = 22 + i;
    return { value: day, label: `${day} days` };
  });
  const periodOptions = Array.from({ length: 10 - 2 + 1 }, (_, i) => {
    const day = 2 + i;
    return { value: day, label: `${day} days` };
  });
  const consistencyOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];

  useEffect(() => {
    const loadUsers = async () => {
      const fetchedUsers = await getUsersNotInTrackerLogs();
      setUsers(fetchedUsers);
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (itemData) {
      const data = JSON.parse(decodeURIComponent(itemData));
      setCycleLength(data.cycle_length);
      setPeriodLength(data.period_length);
      setConsistent(data.is_consistent);
      setStartDate(data.period_start_date);
      setSelectedUser({
        value: data.user_id,
        label: `${data.user_profiles.first_name} ${data.user_profiles.last_name}`,
      });
    }
  }, [itemData]);

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Calculate dates using utility functions
    const periodStartDate = new Date(startDate);
    const periodDatesCalculated = calculatePeriodDates(startDate, periodLength);
    const periodEnd = new Date(
      periodDatesCalculated[periodDatesCalculated.length - 1]
    );
    const nextPeriodStart = calculateNextPeriodStart(periodEnd, cycleLength);
    const ovulationDate = calculateOvulationDate(nextPeriodStart);
    const fertileWindowCalculated = calculateFertileWindow(ovulationDate);

    // Calculate next reminder date
    const nextReminderDate = new Date(periodEnd);
    nextReminderDate.setDate(periodEnd.getDate() + cycleLength);

    const adminId = localStorage.getItem("user_id");

    const data = {
      created_at: Date.now(),
      goal: "track my cycle",
      cycle_length: cycleLength,
      period_length: periodLength,
      is_consistent: consistent.toLowerCase(),
      period_start_date: startDate,
      period_start_date_utc: startDate,
      flow_types: periodDatesCalculated.map((date) => ({
        date,
        selectedFlow: "",
      })),
      next_reminder: nextReminderDate.toISOString().split("T")[0],
      next_reminder_utc: nextReminderDate.toISOString().split("T")[0],
      updated_at: Date.now(),
      updated_by: adminId,
      created_by: adminId,
      user_id: selectedUser?.value,
      is_created_by_admin_panel: true,
      ovulation_date: ovulationDate,
      ovulation_date_utc: ovulationDate,
      fertile_window_dates: fertileWindowCalculated,
      fertile_window_dates_utc: fertileWindowCalculated,
    };

    setConfirmData(data);
    setConfirmModal(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedUser) newErrors.selectedUser = "Please select a user";
    if (!cycleLength) newErrors.cycleLength = "Please select cycle length";
    if (!periodLength) newErrors.periodLength = "Please select period length";
    if (!consistent) newErrors.consistent = "Please select consistency";
    if (!startDate) newErrors.startDate = "Please select a start date";
    return newErrors;
  };

  const handleConfirmAddition = async () => {
    const result = await createPeriodTrackerLog(confirmData);
    handleResponse(result, "added");
  };

  const handleConfirmUpdate = async () => {
    const result = await updatePeriodTrackerLog(itemData.id, confirmData);
    handleResponse(result, "updated");
  };

  const handleResponse = (result, action) => {
    if (!result.error) {
      // Show success toast
    } else {
      // Show error toast
    }
    setConfirmModal(false);
  };

  return {
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
  };
};

export default usePeriodTracker;
