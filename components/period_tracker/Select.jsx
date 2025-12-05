import React from "react";

const CustomSelect = ({
  options,
  value,
  onChange,
  placeholder,
  error,
  isDisabled,
}) => (
  <select
    value={value}
    onChange={onChange}
    disabled={isDisabled}
    className={`p-2 border rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 ${error ? "border-red-500 dark:border-red-400" : ""}`}
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

export default CustomSelect;
