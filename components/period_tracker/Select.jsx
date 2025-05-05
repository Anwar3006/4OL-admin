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
    className={`p-2 border rounded ${error ? "border-red-500" : ""}`}
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
