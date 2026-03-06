"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FilterDropdownProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  optionLabels?: Record<string, string>;
}

const FilterDropdown = ({
  label,
  value,
  options,
  onChange,
  placeholder = "All",
  optionLabels = {},
}: FilterDropdownProps) => {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-semibold text-gray-700">{label}</Label>
      <Select
        value={value || "all"}
        onValueChange={(val) => onChange(val === "all" ? null : val)}
      >
        <SelectTrigger className="w-full md:w-[150px] bg-white border-2 border-gray-300 hover:border-emerald-400 transition-colors">
          <SelectValue
            placeholder={placeholder}
            className="text-sm 2xl:text-base"
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {optionLabels[option] || option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FilterDropdown;
