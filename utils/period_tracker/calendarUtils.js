// calendarUtils.js
import moment from "moment";

export const getTileClassName = (date, confirmData) => {
  const dateString = formatDate(date);
  let classes = "position-relative m-1";

  const isPeriodDate = confirmData.flow_types?.some(
    (f) => f.date === dateString
  );
  const isNextPeriodDate = dateString === calculateNextPeriodDate(confirmData);
  const isFertileDate = confirmData.fertile_window_dates?.includes(dateString);
  const isOvulationDate = dateString === confirmData.ovulation_date;

  if (isPeriodDate) return `${classes} period-date`;
  if (isOvulationDate) return `${classes} ovulation-date`;
  if (isFertileDate) return `${classes} fertile-date`;
  if (isNextPeriodDate) return `${classes} next-period-date`;
  return classes;
};

export const getTileContent = (date, confirmData) => {
  const dateString = formatDate(date);
  const indicatorProps = {
    style: {
      position: "absolute",
      bottom: "2px",
      right: "2px",
      width: "8px",
      height: "8px",
      borderRadius: "50%",
    },
  };

  if (confirmData.flow_types?.some((f) => f.date === dateString)) {
    return (
      <div
        {...indicatorProps}
        style={{ ...indicatorProps.style, backgroundColor: "#dc2626" }}
      />
    );
  }
  if (dateString === confirmData.ovulation_date) {
    return (
      <div
        {...indicatorProps}
        style={{ ...indicatorProps.style, backgroundColor: "#7e22ce" }}
      />
    );
  }
  if (confirmData.fertile_window_dates?.includes(dateString)) {
    return (
      <div
        {...indicatorProps}
        style={{ ...indicatorProps.style, backgroundColor: "#9333ea" }}
      />
    );
  }
  if (dateString === calculateNextPeriodDate(confirmData)) {
    return (
      <div
        {...indicatorProps}
        style={{ ...indicatorProps.style, backgroundColor: "#f97316" }}
      />
    );
  }
  return null;
};

const formatDate = (date) => moment(date).format("YYYY-MM-DD");

// Next Period Date = Period Start Date + Cycle Length
const calculateNextPeriodDate = (data) =>
  moment(data.period_start_date)
    .add(data.period_length - 1, "days")
    .add(1, "day")
    .add(data.cycle_length, "days")
    .format("YYYY-MM-DD");
