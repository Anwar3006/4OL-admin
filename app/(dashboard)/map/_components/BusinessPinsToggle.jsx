"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const BusinessPinsToggle = ({ enabled, onToggle }) => {
  return (
    <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border-2 border-gray-300 shadow-sm">
      <Switch id="business-pins" checked={enabled} onCheckedChange={onToggle} />
      <Label
        htmlFor="business-pins"
        className="text-sm font-medium text-gray-700 cursor-pointer"
      >
        Business Pins
      </Label>
    </div>
  );
};

export default BusinessPinsToggle;
