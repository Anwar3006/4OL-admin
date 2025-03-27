// CalendarComponent.jsx
import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "@/styles/period_tracker/calendar.css";

const CalendarComponent = ({ confirmData }) => {
  return (
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
        // Example: add custom classes based on date if needed
        return "position-relative m-1";
      }}
      tileContent={({ date }) => {
        return null;
      }}
    />
  );
};

export default CalendarComponent;
