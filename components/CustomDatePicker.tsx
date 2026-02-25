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
}: CustomDatePickerProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
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
                    format(new Date(field.value), "PPP")
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
                  field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                  setIsOpen(false);
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

                  // Always block dates before 1900
                  if (date < minDate) return true;

                  // Block future dates unless explicitly allowed
                  if (!enableFutureDates && date > today) return true;

                  return false;
                }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomDatePicker;
