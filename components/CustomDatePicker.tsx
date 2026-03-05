"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";

type CustomDatePickerProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  enableFutureDates?: boolean;
  showTimePicker?: boolean;
};

const CustomDatePicker = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Pick a date and time",
  description,
  disabled = false,
  className,
  enableFutureDates = false,
  showTimePicker = false,
}: CustomDatePickerProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col space-y-2">
          {label && (
            <FormLabel className="text-sm font-bold text-slate-700 tracking-tight">
              {label}
            </FormLabel>
          )}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  disabled={disabled}
                  className={cn(
                    "w-full h-14 rounded-xl border-slate-200 pl-4 text-left font-medium transition-all hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
                    !field.value && "text-slate-400",
                    className
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <CalendarIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="truncate">
                      {field.value ? (
                        format(new Date(field.value), showTimePicker ? "PPP 'at' p" : "PPP")
                      ) : (
                        <span>{placeholder}</span>
                      )}
                    </span>
                  </div>
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" 
              align="start"
            >
              <div className="flex flex-col md:flex-row">
                {/* Calendar Core */}
                <div className="p-1">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      const newDate = new Date(date);
                      if (field.value) {
                        const oldDate = new Date(field.value);
                        newDate.setHours(oldDate.getHours());
                        newDate.setMinutes(oldDate.getMinutes());
                      }
                      field.onChange(newDate.toISOString());
                      if (!showTimePicker) setIsOpen(false);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return !enableFutureDates && date > today;
                    }}
                    className="rounded-t-2xl md:rounded-l-2xl border-none"
                  />
                </div>

                {/* Integrated Time Picker Section */}
                {showTimePicker && (
                  <div className="border-t md:border-t-0 md:border-l border-slate-100 p-4 bg-slate-50/50 w-full md:w-[180px] flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3 md:mb-4 px-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Time
                      </span>
                    </div>
                    <Input
                      type="time"
                      className="bg-white border-slate-200 rounded-lg h-10 text-sm font-bold focus-visible:ring-emerald-500"
                      value={field.value ? format(new Date(field.value), "HH:mm") : "12:00"}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":");
                        const current = field.value ? new Date(field.value) : new Date();
                        current.setHours(parseInt(hours), parseInt(minutes));
                        field.onChange(current.toISOString());
                      }}
                    />
                    <Button 
                      onClick={() => setIsOpen(false)}
                      size="sm" 
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg h-8 text-[11px] uppercase tracking-wider"
                    >
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {description && (
            <FormDescription className="text-[11px] text-slate-400 italic px-1">
              {description}
            </FormDescription>
          )}
          <FormMessage className="text-xs font-bold text-rose-500 px-1" />
        </FormItem>
      )}
    />
  );
};

export default CustomDatePicker;