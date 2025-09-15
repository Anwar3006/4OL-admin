// FormComponents.jsx
import React from "react";
import CustomSelect from "@/components/period_tracker/Select";

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  error,
  isDisabled,
}) => (
  <div className="flex flex-col">
    <label className="mb-2 font-semibold dark:text-slate-200">{label}</label>
    <CustomSelect
      options={options}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Select ${label.toLowerCase()}`}
      error={error}
      isDisabled={isDisabled}
      className="dark:bg-slate-800"
    />
    {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

export const DateInput = ({ label, value, onChange, error }) => (
  <div className="flex flex-col">
    <label className="mb-2 font-semibold text-gray-900 dark:text-slate-200">{label}</label>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 ${error ? "border-red-500 dark:border-red-400" : ""}`}
    />
    {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

export const CalculateButton = () => (
  <div className="flex flex-col">
    <label className="mb-2 font-semibold invisible text-gray-900 dark:text-slate-200">Calculate</label>
    <button
      type="submit"
      className="w-full px-4 py-2 bg-[#56ce84] hover:bg-[#46b276] dark:bg-[#56ce84] dark:hover:bg-[#46b276] text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#56ce84] focus:ring-opacity-50"
    >
      Calculate
    </button>
  </div>
);
