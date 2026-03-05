"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";

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
  placeholder = "Pick a date",
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
        <FormItem className="flex flex-col">
          {label && <FormLabel>{label}</FormLabel>}
          <div className="flex gap-2">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground",
                      className,
                    )}
                  >
                    {field.value ? (
                      format(new Date(field.value), showTimePicker ? "PPP p" : "PPP")
                    ) : (
                      <span>{placeholder}</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  captionLayout="dropdown"
                  onSelect={(date: any) => {
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
                  startMonth={new Date(1900, 0)}
                  endMonth={
                    enableFutureDates
                      ? new Date(new Date().getFullYear() + 5, 0)
                      : new Date()
                  }
                  disabled={(date: any) => {
                    const minDate = new Date("1900-01-01");
                    const today = new Date();
                    if (date < minDate) return true;
                    if (!enableFutureDates && date > today) return true;
                    return false;
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            {showTimePicker && (
              <FormControl>
                <input
                  type="time"
                  disabled={disabled}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(":");
                    const currentDate = field.value ? new Date(field.value) : new Date();
                    currentDate.setHours(parseInt(hours));
                    currentDate.setMinutes(parseInt(minutes));
                    field.onChange(currentDate.toISOString());
                  }}
                />
              </FormControl>
            )}
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomDatePicker;
