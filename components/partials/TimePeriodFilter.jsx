"use client";
import React from "react";

const TimePeriodFilter = ({ selectedPeriod, onPeriodChange, className = "" }) => {
  const periods = [
    // { value: "all", label: "All Time" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm font-medium text-slate-600">Filter by:</span>
      <div className="flex bg-slate-100 rounded-lg p-1">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onPeriodChange(period.value)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
              selectedPeriod === period.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
            type="button"
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimePeriodFilter;
