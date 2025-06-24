"use client";
import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Select from "react-select";
import Modal from "@/components/ui/Modal";
import {
  getUsersNotInTrackerLogs,
  createPeriodTrackerLog,
  updatePeriodTrackerLog,
} from "@/app/services/period_tracker_service";
import moment from "moment";
import { toast } from "react-toastify";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useSearchParams } from "next/navigation";

const PeriodTrackerForm = () => {
  const searchParams = useSearchParams();
  const itemData = searchParams.get("item");
  const item = itemData ? JSON.parse(decodeURIComponent(itemData)) : null;

  const [cycleLength, setCycleLength] = useState();
  const [periodLength, setPeriodLength] = useState();
  const [consistent, setConsistent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      console.log("Item data:", JSON.stringify(item, null, 2));
      setCycleLength(item.cycle_length);
      setPeriodLength(item.period_length);
      setConsistent(
        item.is_consistent.charAt(0).toUpperCase() + item.is_consistent.slice(1)
      ); // Capitalize first letter
      setStartDate(item.period_start_date);

      // Set selected user with the required format for react-select
      setSelectedUser({
        value: item.user_id,
        label: `${item.user_profiles.first_name} ${item.user_profiles.last_name}`,
        avatar: item.user_profiles.avatar_url,
      });
    }
  }, [itemData]);

  const cycleOptions = Array.from({ length: 15 }, (_, i) => ({
    value: 22 + i,
    label: `${22 + i} days`,
  }));
  const periodOptions = Array.from({ length: 9 }, (_, i) => ({
    value: 2 + i,
    label: `${2 + i} days`,
  }));
  const consistencyOptions = [
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ];

  useEffect(() => {
    if (!itemData) {
      const fetchUsers = async () => {
        const { data, error } = await getUsersNotInTrackerLogs();
        if (data) {
          const options = data.map((user) => ({
            value: user.id,
            label: `${user.first_name} ${user.last_name}`,
            avatar: user.avatar_url,
          }));
          setUsers(options);
        }
      };
      fetchUsers();
    }
  }, []);

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!selectedUser) newErrors.selectedUser = "Please select a user";
    if (!cycleLength) newErrors.cycleLength = "Please select cycle length";
    if (!periodLength) newErrors.periodLength = "Please select period length";
    if (!consistent) newErrors.consistent = "Please select consistency";
    if (!startDate) newErrors.startDate = "Please select a start date";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    } else {
      setErrors({});
    }

    // Parse the start date
    const periodStartDate = new Date(startDate);

    // Calculate period dates (array)
    const periodDatesCalculated = [];
    for (let i = 0; i < periodLength; i++) {
      const current = new Date(periodStartDate);
      current.setDate(periodStartDate.getDate() + i);
      periodDatesCalculated.push(current.toISOString().split("T")[0]);
    }

    // Calculate the end of the current period
    const periodEnd = new Date(periodStartDate);
    periodEnd.setDate(periodStartDate.getDate() + (periodLength - 1)); // Last day of period

    // Calculate next period start (cycle starts AFTER period ends)
    const nextPeriodStart = new Date(periodEnd);
    nextPeriodStart.setDate(periodEnd.getDate() + 1 + cycleLength); // Day after period ends + cycle days

    // Calculate ovulation date (14 days BEFORE next period start)
    const computedOvulation = new Date(nextPeriodStart);
    computedOvulation.setDate(nextPeriodStart.getDate() - 14);
    const ovulationStr = computedOvulation.toISOString().split("T")[0];

    // Calculate fertile window (2 days before and 2 days after ovulation)
    const fertileWindowCalculated = [];
    for (let offset = -2; offset <= 2; offset++) {
      const d = new Date(computedOvulation);
      d.setDate(computedOvulation.getDate() + offset);
      fertileWindowCalculated.push(d.toISOString().split("T")[0]);
    }

    // Calculate next reminder date:
    // Period end = periodStartDate + periodLength days
    // const periodEnd = new Date(periodStartDate);
    // periodEnd.setDate(periodEnd.getDate() + periodLength);
    // Next reminder = period end + cycleLength days
    const nextReminderDate = new Date(periodEnd);
    nextReminderDate.setDate(nextReminderDate.getDate() + cycleLength);
    const nextReminderStr = nextReminderDate.toISOString().split("T")[0];

    // Get admin id (stored in localStorage)
    const adminId = localStorage.getItem("user_id");

    // Build the data object with computed values
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
        selectedFlow: "", // Empty for now
      })),
      next_reminder: nextReminderStr,
      next_reminder_utc: nextReminderStr,
      updated_at: Date.now(),
      updated_by: adminId,
      created_by: adminId,
      user_id: selectedUser ? selectedUser.value : null,
      is_created_by_admin_panel: true,
      ovulation_date: ovulationStr,
      ovulation_date_utc: ovulationStr,
      fertile_window_dates: fertileWindowCalculated,
      fertile_window_dates_utc: fertileWindowCalculated,
    };

    setConfirmData(data);
    setConfirmModal(true);
  };

  const customStyles = {
    option: (provided, state) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      backgroundColor: state.isSelected
        ? "#56ce84"
        : state.isFocused
        ? "#f0f0f0"
        : provided.backgroundColor,
      color: state.isSelected
        ? "#FFF"
        : state.isFocused
        ? "#000"
        : provided.color,
    }),
    singleValue: (provided) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
    }),
  };

  const formatOptionLabel = ({ label, avatar }) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img
        src={avatar}
        alt="avatar"
        style={{ width: 24, height: 24, borderRadius: "50%", marginRight: 8 }}
      />
      <span>{label}</span>
    </div>
  );

  const handleConfirmAddition = async () => {
    console.log("Creating new Tracker Log with data:", confirmData);
    const result = await createPeriodTrackerLog(confirmData);
    if (!result.error) {
      toast.success("Period Tracker record added successfully!", {
        position: "top-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
    } else {
      toast.error("Error adding Period Tracker record");
    }
    setConfirmModal(false);
  };

  const handleConfirmUpdate = async () => {
    console.log("Updating Tracker Log with data:", confirmData);
    const result = await updatePeriodTrackerLog(item.id, confirmData);
    if (!result.error) {
      toast.success("Period Tracker record updated successfully!", {
        position: "top-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
    } else {
      toast.error("Error updating Period Tracker record");
    }
    setConfirmModal(false);
  };

  return (
    <Card
      title="Create Period Tracker"
      className="mt-5 bg-white dark:bg-slate-800 w-full"
      bodyClass="p-6"
    >
      <form
        onSubmit={handleSubmitForm}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Select User */}
        <div className="flex flex-col">
          <label className="block font-medium text-gray-700">Select User</label>
          <Select
            options={users}
            label={"Select a user"}
            value={selectedUser}
            onChange={(option) => {
              setSelectedUser(option);
              setErrors((prev) => ({ ...prev, selectedUser: null }));
            }}
            placeholder="Select a user"
            styles={{
              ...customStyles,
              control: (provided) => ({
                ...provided,
                borderColor: errors.selectedUser ? "red" : provided.borderColor,
              }),
            }}
            formatOptionLabel={formatOptionLabel}
            isDisabled={item ? true : false}
          />
          {errors.selectedUser && (
            <p className="text-red-500 text-xs mt-1">{errors.selectedUser}</p>
          )}
        </div>
        {/* Cycle Length Dropdown */}
        <div className="flex flex-col">
          <label className="block font-medium text-gray-700">Cycle Length</label>
          <Select
            className="bg-white dark:bg-slate-800"
            options={cycleOptions}
            value={cycleOptions.find((opt) => opt.value === cycleLength)}
            onChange={(opt) => {
              setCycleLength(opt.value);
              setErrors((prev) => ({ ...prev, cycleLength: null }));
            }}
            placeholder="Select cycle length"
            styles={{
              ...customStyles,
              control: (provided) => ({
                ...provided,
                borderColor: errors.cycleLength ? "red" : provided.borderColor,
              }),
            }}
          />
          {errors.cycleLength && (
            <p className="text-red-500 text-xs mt-1">{errors.cycleLength}</p>
          )}
        </div>
        {/* Period Length Dropdown */}
        <div className="flex flex-col">
          <label className="block font-medium text-gray-700">Period Length</label>
          <Select
            options={periodOptions}
            value={periodOptions.find((opt) => opt.value === periodLength)}
            onChange={(opt) => {
              setPeriodLength(opt.value);
              setErrors((prev) => ({ ...prev, periodLength: null }));
            }}
            placeholder="Select period length"
            styles={{
              ...customStyles,
              control: (provided) => ({
                ...provided,
                borderColor: errors.periodLength ? "red" : provided.borderColor,
              }),
            }}
          />
          {errors.periodLength && (
            <p className="text-red-500 text-xs mt-1">{errors.periodLength}</p>
          )}
        </div>
        {/* Consistency Dropdown */}
        <div className="flex flex-col">
          <label className="block font-medium text-gray-700">Are periods consistent?</label>
          <Select
            options={consistencyOptions}
            value={consistencyOptions.find((opt) => opt.value === consistent)}
            onChange={(opt) => {
              setConsistent(opt.value);
              setErrors((prev) => ({ ...prev, consistent: null }));
            }}
            placeholder="Is it consistent?"
            styles={{
              ...customStyles,
              control: (provided) => ({
                ...provided,
                borderColor: errors.consistent ? "red" : provided.borderColor,
              }),
            }}
          />
          {errors.consistent && (
            <p className="text-red-500 text-xs mt-1">{errors.consistent}</p>
          )}
        </div>
        {/* Start Date Input */}
        <div className="flex gap-2">
          <div className="flex flex-col flex-1">
            <label className="block font-medium text-gray-700">Period Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setErrors((prev) => ({ ...prev, startDate: null }));
              }}
              className={`p-2 border rounded ${
                errors.startDate ? "border-red-500" : ""
              }`}
            />
            {errors.startDate && (
              <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
            )}
          </div>
          {/* Calculate Button */}
          <div className="flex flex-col flex-1">
            <label className="block font-medium text-gray-700">Calculate Cycle</label>
            <button
              type="submit"
              className="w-full md:w-full px-4 py-2 bg-[#56ce84] text-white rounded"
            >
              Calculate
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal with Calendar */}
      <Modal
        //className="w-full md:w-1/4"
        title="Confirm Cycle Details"
        activeModal={confirmModal}
        onClose={() => setConfirmModal(false)}
        centered
        themeClass="bg-[#4ab573]"
      >
        {confirmData && (
          <div className="p-4">
            <Calendar
              value={
                confirmData?.period_start_date
                  ? new Date(confirmData.period_start_date)
                  : new Date()
              }
              className="custom-calendar"
              selectRange={false}
              showNeighboringMonth={true}
              tileClassName={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                // Add position-relative class to all tiles for proper dot positioning
                let classes = "position-relative m-1";

                // Check if it's a period date
                const isPeriodDate = confirmData?.flow_types?.some(
                  (f) => f.date === dateString
                );

                // Check if it's the next period start date
                const isNextPeriodDate =
                  dateString ===
                  moment(confirmData.period_start_date)
                    .add(confirmData.period_length - 1, "days") // Get to the last day of period
                    .add(1, "day") // Move to first day after period
                    .add(confirmData.cycle_length, "days") // Add the cycle length
                    .format("YYYY-MM-DD");

                // Check if it's a fertile window date
                const isFertileDate =
                  confirmData?.fertile_window_dates?.includes(dateString);

                // Check if it's the ovulation date
                const isOvulationDate =
                  dateString === confirmData?.ovulation_date;

                if (isPeriodDate) {
                  classes += " period-date";
                } else if (isOvulationDate) {
                  classes += " ovulation-date";
                  date.customStyle = {
                    backgroundColor: "rgba(126, 34, 206, 0.3)",
                  };
                } else if (isFertileDate) {
                  classes += " fertile-date";
                } else if (isNextPeriodDate) {
                  classes += " next-period-date";
                }

                return classes;
              }}
              tileContent={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                // Determine what type of date this is
                const isPeriodDate = confirmData?.flow_types?.some(
                  (f) => f.date === dateString
                );
                const isOvulationDate =
                  dateString === confirmData?.ovulation_date;
                const isFertileDate =
                  confirmData?.fertile_window_dates?.includes(dateString);
                const isNextPeriodDate =
                  dateString ===
                  moment(confirmData.period_start_date)
                    .add(confirmData.period_length - 1, "days") // Get to the last day of period
                    .add(1, "day") // Move to first day after period
                    .add(confirmData.cycle_length, "days") // Add the cycle length
                    .format("YYYY-MM-DD");

                // Return the appropriate indicator dot
                if (isPeriodDate) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#dc2626",
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                } else if (isOvulationDate) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#7e22ce", // Darker purple
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                } else if (isFertileDate) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#9333ea", // Purple
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                } else if (isNextPeriodDate) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#f97316", // Orange for next period
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                }

                return null;
              }}
            />

            {/* Legends for the calendar indicators */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                <span className="text-sm">Period Days</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#DFBCFF] rounded-full mr-2"></div>
                <span className="text-sm">Fertile Window</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#9c6bc1] rounded-full mr-2"></div>
                <span className="text-sm">Ovulation Day</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-sm">Next Period Start</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid gird-cols-1 md:grid-cols-2 justify-between gap-2 mt-4">
              <button
                onClick={() => setConfirmModal(false)}
                className="col-span-2 md:col-span-1 px-4 items-center justify-center py-2 bg-red-500 transition-colors hover:bg-red-600 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={itemData ? handleConfirmUpdate : handleConfirmAddition}
                className="col-span-2 md:col-span-1 items-center justify-center px-4 py-2 hover:bg-[#46b276]  bg-[#56ce84] transition-colors text-white rounded"
              >
                {itemData ? "Confirm & Update" : "Confirm & Add"}
              </button>
            </div>

            {/* Calendar styling */}
            <style jsx global>{`
              /* Fix weekend colors */
              .custom-calendar .react-calendar__month-view__days__day--weekend {
                color: black !important;
              }

              /* Basic tile styling */
              .custom-calendar .react-calendar__tile {
                margin: 2px;
                border-radius: 4px;
                position: relative !important;
                height: 40px;
                background: none !important;
              }

              /* Completely remove any "today" styling */
              .custom-calendar .react-calendar__tile--now,
              .custom-calendar .react-calendar__tile--now:enabled:hover,
              .custom-calendar .react-calendar__tile--now:enabled:focus,
              .custom-calendar .react-calendar__tile--now:enabled:active {
                background: none !important;
                color: inherit !important;
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
                font-weight: normal !important;
              }

              /* Period day styling with higher specificity */
              .custom-calendar .react-calendar__tile.period-date,
              .custom-calendar .react-calendar__tile--now.period-date {
                background-color: rgba(220, 38, 38, 0.15) !important;
              }

              /* Fertility day styling with higher specificity */
              .custom-calendar .react-calendar__tile.fertile-date,
              .custom-calendar .react-calendar__tile--now.fertile-date {
                background-color: #e5c9ff !important;
              }

              /* Ovulation day styling with higher specificity */
              .custom-calendar .react-calendar__tile.ovulation-date,
              .custom-calendar .react-calendar__tile--now.ovulation-date {
                color: #ffff !important;
                background-color: #9c6bc1 !important;
              }

              /* Next period day styling with higher specificity */
              .custom-calendar .react-calendar__tile.next-period-date,
              .custom-calendar .react-calendar__tile--now.next-period-date {
                background-color: rgba(249, 115, 22, 0.2) !important;
              }

              /* Reset active/selected date styling */
              .custom-calendar .react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--hasActive {
                background: inherit !important;
                color: inherit !important;
              }

              /* Maintain styling on hover/focus with higher specificity */
              .custom-calendar .react-calendar__tile.period-date:hover,
              .custom-calendar .react-calendar__tile.period-date:focus,
              .custom-calendar
                .react-calendar__tile.period-date.react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--now.period-date:hover,
              .custom-calendar .react-calendar__tile--now.period-date:focus {
                background-color: rgba(220, 38, 38, 0.25) !important;
              }

              .custom-calendar .react-calendar__tile.fertile-date:hover,
              .custom-calendar .react-calendar__tile.fertile-date:focus,
              .custom-calendar
                .react-calendar__tile.fertile-date.react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--now.fertile-date:hover,
              .custom-calendar .react-calendar__tile--now.fertile-date:focus {
                background-color: rgba(168, 85, 247, 0.3) !important;
              }

              .custom-calendar .react-calendar__tile.ovulation-date:hover,
              .custom-calendar .react-calendar__tile.ovulation-date:focus,
              .custom-calendar
                .react-calendar__tile.ovulation-date.react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--now.ovulation-date:hover,
              .custom-calendar .react-calendar__tile--now.ovulation-date:focus {
                background-color: rgba(126, 34, 206, 0.4) !important;
              }

              .custom-calendar .react-calendar__tile.next-period-date:hover,
              .custom-calendar .react-calendar__tile.next-period-date:focus,
              .custom-calendar
                .react-calendar__tile.next-period-date.react-calendar__tile--active,
              .custom-calendar
                .react-calendar__tile--now.next-period-date:hover,
              .custom-calendar
                .react-calendar__tile--now.next-period-date:focus {
                background-color: rgba(249, 115, 22, 0.3) !important;
              }

              .position-relative {
                position: relative !important;
              }

              /* Fix for Sunday display */
              .custom-calendar .react-calendar__month-view__days {
                display: grid !important;
                grid-template-columns: repeat(7, 1fr);
              }

              /* Ensure all days are visible */
              .custom-calendar .react-calendar__month-view__days__day {
                display: flex !important;
                justify-content: center;
                align-items: center;
              }
            `}</style>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default PeriodTrackerForm;
