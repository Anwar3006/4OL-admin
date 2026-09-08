"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
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
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

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
  placeholder = "MM/DD/YYYY",
  description,
  disabled = false,
  className,
  enableFutureDates = false,
  showTimePicker = false,
}: CustomDatePickerProps<T>) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Local state for the text input to allow fluid typing
        const [inputValue, setInputValue] = React.useState(
          field.value ? format(new Date(field.value), "P") : "",
        );

        // Sync local input when form value changes externally (e.g., via Calendar)
        React.useEffect(() => {
          if (field.value) {
            setInputValue(format(new Date(field.value), "P"));
          }
        }, [field.value]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value;
          setInputValue(val);

          // Try to parse the date from typing (expecting MM/DD/YYYY based on locale "P")
          const parsedDate = parse(val, "P", new Date());
          if (isValid(parsedDate)) {
            // Apply future date constraint if necessary
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!enableFutureDates && parsedDate > today) return;

            field.onChange(parsedDate.toISOString());
          }
        };

        return (
          <FormItem className="flex flex-col space-y-2">
            {label && (
              <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                {label}
              </FormLabel>
            )}

            <div className="relative flex items-center">
              <FormControl>
                <Input
                  className={cn(
                    "h-14 rounded-xl border-slate-200 dark:border-slate-700 pr-12 font-medium transition-all focus-visible:ring-emerald-500/20",
                    className,
                  )}
                  placeholder={placeholder}
                  value={inputValue}
                  disabled={disabled}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setIsOpen(true);
                    }
                  }}
                />
              </FormControl>

              {/* Icon Trigger for Popover */}
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    className="absolute right-2 h-10 w-10 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/15"
                  >
                    <CalendarIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 rounded-2xl shadow-2xl border-slate-100 dark:border-slate-800 overflow-hidden"
                  align="end"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="p-1">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
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
                        initialFocus
                      />
                    </div>

                    {showTimePicker && (
                      <div className="border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 w-full md:w-[180px] flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-2xs font-black uppercase tracking-widest text-slate-400">
                            Time
                          </span>
                        </div>
                        <Input
                          type="time"
                          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg h-10 text-sm font-bold focus-visible:ring-emerald-500"
                          value={
                            field.value
                              ? format(new Date(field.value), "HH:mm")
                              : "12:00"
                          }
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":");
                            const current = field.value
                              ? new Date(field.value)
                              : new Date();
                            current.setHours(
                              parseInt(hours),
                              parseInt(minutes),
                            );
                            field.onChange(current.toISOString());
                          }}
                        />
                        <Button
                          onClick={() => setIsOpen(false)}
                          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg h-8 text-xs uppercase tracking-wider"
                        >
                          Done
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {description && (
              <FormDescription className="text-xs text-slate-400 italic px-1">
                {description}
              </FormDescription>
            )}
            <FormMessage className="text-xs font-bold text-rose-500 px-1" />
          </FormItem>
        );
      }}
    />
  );
};

export default CustomDatePicker;
