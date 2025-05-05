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
    <label className="mb-2 font-semibold">{label}</label>
    <CustomSelect
      options={options}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Select ${label.toLowerCase()}`}
      error={error}
      isDisabled={isDisabled}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export const DateInput = ({ label, value, onChange, error }) => (
  <div className="flex flex-col">
    <label className="mb-2 font-semibold">{label}</label>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2 border rounded ${error ? "border-red-500" : ""}`}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export const CalculateButton = () => (
  <div className="flex flex-col">
    <label className="mb-2 font-semibold invisible">Calculate</label>
    <button
      type="submit"
      className="w-full px-4 py-2 bg-[#56ce84] hover:bg-[#46b276] text-white rounded transition-colors"
    >
      Calculate
    </button>
  </div>
);
